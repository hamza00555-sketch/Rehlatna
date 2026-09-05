import { NextResponse } from "next/server";
import { onboardingSchema } from "@/schemas";
import { createHouseholdFromOnboarding } from "@/fixtures/empty";
import { parseBody } from "@/server/http";
import { newId, nowIso } from "@/server/ids";
import { sessionCookie } from "@/server/session";
import { writeHousehold } from "@/server/store";

/** Creates a real household from onboarding input and signs the creator in. */
export async function POST(req: Request) {
  const parsed = await parseBody(req, onboardingSchema);
  if (!parsed.ok) return parsed.res;

  const ids = {
    household: newId("hh"),
    users: [newId("usr"), newId("usr")] as [string, string],
    members: [newId("mem"), newId("mem")] as [string, string],
    pregnancy: newId("prg"),
    baby: newId("bby"),
  };
  const data = createHouseholdFromOnboarding(parsed.data, ids, nowIso());
  await writeHousehold("live", data);

  const res = NextResponse.json({ ok: true, householdId: ids.household, redirect: "/today" });
  res.cookies.set(sessionCookie({ householdId: ids.household, memberId: ids.members[0], mode: "live" }));
  return res;
}
