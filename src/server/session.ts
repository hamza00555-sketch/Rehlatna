import { cookies } from "next/headers";
import type { HouseholdData, HouseholdMember } from "@/domain/types";
import { viewerFromMember, type Viewer } from "@/domain/permissions";
import { todayIso } from "@/domain/dates";
import { membershipFor, readHousehold, type StoreMode } from "./store";
import { getAuthUser, supabaseConfigured } from "./supabase";

/**
 * Identity boundary. With Supabase configured, identity comes from Supabase
 * Auth and the household from the membership table; the `rj_session` cookie
 * then only carries demo sessions. Without Supabase (local development),
 * the cookie names the active household member directly.
 */

export const SESSION_COOKIE = "rj_session";

export interface Session {
  householdId: string;
  memberId: string;
  mode: StoreMode;
  /** Supabase user id for live sessions (absent in cookie/demo sessions). */
  userId?: string;
}

export interface RequestContext {
  session: Session;
  data: HouseholdData;
  member: HouseholdMember;
  viewer: Viewer;
  today: string;
}

async function cookieSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed.householdId || !parsed.memberId) return null;
    return { householdId: parsed.householdId, memberId: parsed.memberId, mode: parsed.mode === "demo" ? "demo" : "live" };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const fromCookie = await cookieSession();
  if (fromCookie?.mode === "demo") return fromCookie;
  if (!supabaseConfigured()) return fromCookie;
  const user = await getAuthUser();
  if (!user) return null;
  const membership = await membershipFor(user.id);
  if (!membership) return null;
  return { ...membership, mode: "live", userId: user.id };
}

export function sessionCookie(session: Session) {
  return {
    name: SESSION_COOKIE,
    value: JSON.stringify({ householdId: session.householdId, memberId: session.memberId, mode: session.mode }),
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

export const clearedSessionCookie = { name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 };

/** Resolves the full request context, or null when no valid session exists. */
export async function getContext(): Promise<RequestContext | null> {
  const session = await getSession();
  if (!session) return null;
  const data = await readHousehold(session.mode, session.householdId);
  if (!data) return null;
  const member = data.members.find((mm) => mm.id === session.memberId);
  if (!member) return null;
  return { session, data, member, viewer: viewerFromMember(member), today: todayIso() };
}
