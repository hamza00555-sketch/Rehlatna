import { cache } from "react";
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
  /** Snapshot fetched together with the membership, so getContext needs no second query. */
  preloaded?: HouseholdData | null;
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

/** Resolved once per request: layouts, metadata and the page share one lookup. */
export const getSession = cache(async function getSession(): Promise<Session | null> {
  const fromCookie = await cookieSession();
  if (fromCookie?.mode === "demo") return fromCookie;
  if (!supabaseConfigured()) return fromCookie;
  const user = await getAuthUser();
  if (!user) return null;
  const membership = await membershipFor(user.id);
  if (!membership) return null;
  return { householdId: membership.householdId, memberId: membership.memberId, mode: "live", userId: user.id, preloaded: membership.data };
});

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

/**
 * Appearance (theme, reduced motion) is a device preference, not household
 * data — it lives in its own cookie, separate from `rj_session`, so it
 * survives regardless of which store instance answers a given request. In
 * demo mode the household snapshot lives in a per-serverless-instance
 * MemoryStore (see store.ts); a setting saved on one instance is invisible
 * to the next request if it lands elsewhere, which made the theme radio
 * revert to "system" after navigating away. This cookie is the fix: it
 * travels with the browser, so the very next request (any instance) still
 * carries the choice, while household.settings stays the record other
 * members and devices see through the normal store.
 */
export const APPEARANCE_COOKIE = "rj_appearance";

export interface Appearance {
  theme: "system" | "light" | "dark";
  reduceMotion: boolean;
}

export function appearanceCookie(appearance: Appearance) {
  return {
    name: APPEARANCE_COOKIE,
    value: JSON.stringify(appearance),
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  };
}

/** Reads the device's appearance override, if one was ever saved. */
export async function readAppearanceCookie(): Promise<Appearance | null> {
  const jar = await cookies();
  const raw = jar.get(APPEARANCE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>;
    if (parsed.theme !== "system" && parsed.theme !== "light" && parsed.theme !== "dark") return null;
    // Untrusted input (a cookie can be edited by hand): coerce-free — a
    // malformed reduceMotion falls back to false rather than `Boolean(x)`
    // turning e.g. the string "false" into true.
    return { theme: parsed.theme, reduceMotion: typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : false };
  } catch {
    return null;
  }
}

/**
 * The appearance every reader (RootLayout, the settings page) must agree
 * on: the cookie wins as a whole when present — it is the one value that
 * cannot have gone stale on a different store instance — otherwise the
 * household's own stored settings.
 */
export function resolveAppearance(stored: { theme: Appearance["theme"]; reduceMotion?: boolean }, cookie: Appearance | null): Appearance {
  return cookie ?? { theme: stored.theme, reduceMotion: Boolean(stored.reduceMotion) };
}

/** Resolves the full request context (once per request), or null when no valid session exists. */
export const getContext = cache(async function getContext(): Promise<RequestContext | null> {
  const session = await getSession();
  if (!session) return null;
  const data = session.preloaded ?? (await readHousehold(session.mode, session.householdId));
  if (!data) return null;
  const member = data.members.find((mm) => mm.id === session.memberId);
  if (!member) return null;
  const { preloaded: _omit, ...lean } = session;
  return { session: lean, data, member, viewer: viewerFromMember(member), today: todayIso() };
});
