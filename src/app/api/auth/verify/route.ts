import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseBody } from "@/server/http";
import { membershipFor } from "@/server/store";
import { clearedSessionCookie } from "@/server/session";
import { supabaseConfigured, supabaseServer } from "@/server/supabase";

const schema = z.object({ email: z.string().trim().email().max(200), token: z.string().trim().min(6).max(10) });

/** Verifies the code, sets the auth cookies, and says where to go next. */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return fail("auth_not_configured", 501);
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.res;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: "email" });
  if (error || !data.user) return fail("invalid_code", 400);
  const membership = await membershipFor(data.user.id);
  const res = NextResponse.json({ ok: true, redirect: membership ? "/today" : "/onboarding/start" });
  res.cookies.set(clearedSessionCookie); // a stale demo cookie must not shadow the real session
  return res;
}
