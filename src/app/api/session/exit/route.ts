import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/session";

/** Clears the session (leaves demo, or signs the development member out). */
export async function POST() {
  const res = NextResponse.json({ ok: true, redirect: "/onboarding" });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
