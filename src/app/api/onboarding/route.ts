import { NextResponse } from "next/server";
import { onboardingSchema } from "@/schemas";
import { createHouseholdFromOnboarding } from "@/fixtures/empty";
import { parseBody } from "@/server/http";
import { newId, nowIso } from "@/server/ids";
import { clearedSessionCookie, sessionCookie } from "@/server/session";
import { getStore } from "@/server/store";
import { getAuthUser, supabaseConfigured } from "@/server/supabase";
import { fail } from "@/server/http";

/** Creates a real household from onboarding input and signs the creator in. */
export async function POST(req: Request) {
  const parsed = await parseBody(req, onboardingSchema);
  if (!parsed.ok) return parsed.res;
  const user = await getAuthUser();
  if (supabaseConfigured() && !user) return fail("unauthenticated", 401);

  const ids = {
    household: newId("hh"),
    users: [newId("usr"), newId("usr")] as [string, string],
    members: [newId("mem"), newId("mem")] as [string, string],
    pregnancy: newId("prg"),
    baby: newId("bby"),
  };
  const data = createHouseholdFromOnboarding(parsed.data, ids, nowIso());
  if (user) {
    // The creator's member record carries the real auth identity.
    data.users[0]!.id = user.id;
    data.members[0]!.userId = user.id;
  }
  await getStore("live").create(data, { userId: user?.id ?? ids.users[0], memberId: ids.members[0] });

  const res = NextResponse.json({ ok: true, householdId: ids.household, redirect: "/today" });
  // Supabase sessions derive the household from membership; the cookie only serves local development.
  res.cookies.set(user ? clearedSessionCookie : sessionCookie({ householdId: ids.household, memberId: ids.members[0], mode: "live" }));
  return res;
}
