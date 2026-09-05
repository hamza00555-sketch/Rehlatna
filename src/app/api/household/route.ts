import { NextResponse } from "next/server";
import { assertCan } from "@/domain/permissions";
import { fail, withContext } from "@/server/http";
import { SESSION_COOKIE } from "@/server/session";
import { getStore } from "@/server/store";

/** Deletes the whole household. Demo households are reset instead of deleted. */
export async function DELETE() {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "household:manage");
    if (ctx.session.mode === "demo") return fail("demo_household", 409);
    const store = getStore(ctx.session.mode);
    const state = await store.read();
    const { [ctx.session.householdId]: _removed, ...rest } = state.households;
    await store.write({ ...state, households: rest });
    const res = NextResponse.json({ ok: true, redirect: "/onboarding" });
    res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
    return res;
  });
}
