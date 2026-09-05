import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/http";
import { demoSession, ensureDemoSeeded } from "@/server/demo";
import { sessionCookie } from "@/server/session";

const schema = z.object({ scenario: z.enum(["pregnancy", "postpartum", "fresh"]).default("pregnancy") });

/** Enters demo mode: seeds the in-memory demo store and points the session at it. */
export async function POST(req: Request) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.res;
  await ensureDemoSeeded();
  const res = NextResponse.json({ ok: true, redirect: "/today" });
  res.cookies.set(sessionCookie(demoSession(parsed.data.scenario)));
  return res;
}
