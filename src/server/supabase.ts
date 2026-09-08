import { createServerClient } from "@supabase/ssr";
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

/** Request-scoped client bound to the caller's auth cookies. */
export async function supabaseServer() {
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
}

export interface AuthUser {
  id: string;
  email: string | null;
}

/** The signed-in Supabase user, or null. Always null when Supabase is not configured. */
export async function getAuthUser(): Promise<AuthUser | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
