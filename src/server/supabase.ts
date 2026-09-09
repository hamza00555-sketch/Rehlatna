import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase is the production backbone: Auth for identity, Postgres (with
 * row-level security on household membership) for persistence. When the two
 * public env vars are absent the app runs on the local file store with the
 * development cookie session, so tests and screenshots need no network.
 */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Request-scoped client bound to the caller's auth cookies (one per request). */
export const supabaseServer = cache(async function supabaseServer() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; the middleware refreshes sessions instead.
        }
      },
    },
  });
});

/**
 * Trusted server client (service role). Identity is still taken from the
 * caller's verified JWT; every data access then filters explicitly by that
 * identity and the app's own permission checks. When the key is absent the
 * store falls back to the caller-scoped client under row-level security.
 */
const adminRegistry = (globalThis as unknown as { __rjAdmin?: SupabaseClient }) as { __rjAdmin?: SupabaseClient };
export function supabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  adminRegistry.__rjAdmin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminRegistry.__rjAdmin;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * The signed-in Supabase user, or null. Always null when Supabase is not
 * configured. Verified locally from the JWT (asymmetric keys, JWKS cached),
 * so no network round trip per request; resolved once per request.
 */
export const getAuthUser = cache(async function getAuthUser(): Promise<AuthUser | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
