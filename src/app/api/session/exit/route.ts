import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, clearedSessionCookie } from "@/server/session";
import { supabaseConfigured, supabaseServer } from "@/server/supabase";

/** Leaves the demo (cookie only), or signs the real user out. */
export async function POST() {
  const jar = await cookies();
  const inDemo = jar.get(SESSION_COOKIE)?.value.includes('"demo"') ?? false;
  if (!inDemo && supabaseConfigured()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  const res = NextResponse.json({ ok: true, redirect: "/onboarding" });
  res.cookies.set(clearedSessionCookie);
  return res;
}
