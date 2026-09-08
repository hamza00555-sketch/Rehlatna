import { NextResponse } from "next/server";
import { supabaseConfigured, supabaseServer } from "@/server/supabase";

/**
 * Starts Google sign-in. Supabase hands back the Google consent URL; after
 * consent, Google → Supabase → this site with `?code=…`, which the middleware
 * exchanges for a session. A plain link works, no client JS needed.
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!supabaseConfigured()) return NextResponse.redirect(`${origin}/onboarding/start`);
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data.url) return NextResponse.redirect(`${origin}/auth?error=google`);
  return NextResponse.redirect(data.url);
}
