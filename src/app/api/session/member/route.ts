import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseBody, withContext } from "@/server/http";
import { sessionCookie } from "@/server/session";
import { supabaseConfigured } from "@/server/supabase";

const schema = z.object({ memberId: z.string().min(1) });

/**
 * Development member switcher. Swaps the active member within the SAME
 * household so permission boundaries can be exercised. A real auth provider
 * replaces this entirely.
 */
export async function POST(req: Request) {
  return withContext(async (ctx) => {
    if (ctx.session.mode === "live" && supabaseConfigured()) return fail("not_available", 403);
    const parsed = await parseBody(req, schema);
    if (!parsed.ok) return parsed.res;
    const member = ctx.data.members.find((mm) => mm.id === parsed.data.memberId);
    if (!member) return fail("unknown_member", 404);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookie({ ...ctx.session, memberId: member.id }));
    return res;
  });
}
