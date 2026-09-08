import { z } from "zod";
import { fail, ok, parseBody } from "@/server/http";
import { supabaseConfigured, supabaseServer } from "@/server/supabase";

const schema = z.object({ email: z.string().trim().email().max(200) });

/** Sends a six-digit code to the email (creates the user on first sign-in). */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return fail("auth_not_configured", 501);
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.res;
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data.email, options: { shouldCreateUser: true } });
  if (error) return fail("otp_send_failed", 400, { message: error.message });
  return ok({ ok: true });
}
