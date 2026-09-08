import { NextResponse } from "next/server";
import { assertCan } from "@/domain/permissions";
import { fail, withContext } from "@/server/http";
import { clearedSessionCookie } from "@/server/session";
import { getStore } from "@/server/store";

/** Deletes the whole household. Demo households are reset instead of deleted. */
export async function DELETE() {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "household:manage");
    if (ctx.session.mode === "demo") return fail("demo_household", 409);
    await getStore("live").remove(ctx.session.householdId);
    const res = NextResponse.json({ ok: true, redirect: "/onboarding" });
    res.cookies.set(clearedSessionCookie);
    return res;
  });
}
