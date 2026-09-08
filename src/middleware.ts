import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Two jobs, both no-ops without Supabase env:
 * 1. Refresh the auth cookies on every request.
 * 2. Complete a magic-link sign-in: Supabase redirects back with `?code=…`
 *    (PKCE) — exchange it for a session here, then send the user on.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  const pending: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const c of list) {
          request.cookies.set(c.name, c.value);
          pending.push(c);
        }
      },
    },
  });

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const authError = params.get("error_code") ?? params.get("error");
  let response: NextResponse;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const next = request.nextUrl.clone();
    next.search = "";
    next.pathname = error ? "/auth" : "/";
    if (error) next.searchParams.set("error", "link");
    response = NextResponse.redirect(next);
  } else if (authError && request.nextUrl.pathname !== "/auth") {
    const next = request.nextUrl.clone();
    next.search = "";
    next.pathname = "/auth";
    next.searchParams.set("error", "link");
    response = NextResponse.redirect(next);
  } else {
    // Verifies the JWT locally (asymmetric keys) and refreshes it when expired.
    await supabase.auth.getClaims();
    response = NextResponse.next({ request });
  }

  for (const { name, value, options } of pending) response.cookies.set(name, value, options);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|media/|.*\\.(?:webp|png|svg|ico|woff2?)$).*)"],
};
