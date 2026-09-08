import { NextResponse } from "next/server";
import { assertCan } from "@/domain/permissions";
import { fail, withContext } from "@/server/http";
import { clearedSessionCookie } from "@/server/session";
import { getStore } from "@/server/store";
import { getAuthUser } from "@/server/supabase";

/**
 * Wipes the whole household — the "start over" action. Demo households are
 * reset instead. With Supabase, only the household owner may delete (RLS);
 * the user stays signed in and returns to the first setup step.
 */
export async function DELETE() {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "household:manage");
    if (ctx.session.mode === "demo") return fail("demo_household", 409);
    try {
      await getStore("live").remove(ctx.session.householdId);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not_owner")) return fail("not_owner", 403);
      throw err;
    }
    const signedIn = Boolean(await getAuthUser());
    const res = NextResponse.json({ ok: true, redirect: signedIn ? "/onboarding/start" : "/onboarding" });
    res.cookies.set(clearedSessionCookie);
    return res;
  });
}
