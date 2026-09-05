import { cookies } from "next/headers";
import type { HouseholdData, HouseholdMember } from "@/domain/types";
import { viewerFromMember, type Viewer } from "@/domain/permissions";
import { todayIso } from "@/domain/dates";
import { readHousehold, type StoreMode } from "./store";

/**
 * Identity boundary. A signed session from a real auth provider would be
 * swapped in here; the rest of the server only ever sees a `Viewer`.
 *
 * Development/demo: a cookie names the active household member. The member
 * switcher in More is clearly marked as a development tool.
 */

export const SESSION_COOKIE = "rj_session";

export interface Session {
  householdId: string;
  memberId: string;
  mode: StoreMode;
}

export interface RequestContext {
  session: Session;
  data: HouseholdData;
  member: HouseholdMember;
  viewer: Viewer;
  today: string;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed.householdId || !parsed.memberId) return null;
    return {
      householdId: parsed.householdId,
      memberId: parsed.memberId,
      mode: parsed.mode === "demo" ? "demo" : "live",
    };
  } catch {
    return null;
  }
}

export function sessionCookie(session: Session) {
  return {
    name: SESSION_COOKIE,
    value: JSON.stringify(session),
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

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
