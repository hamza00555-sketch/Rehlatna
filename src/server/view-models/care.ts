import type { AppointmentType, CareLogEntry } from "@/domain/types";
import { evaluateCareWindows, nextCareAttention, visibleCareWindows, type CareWindowKind, type CareWindowState, type CareWindowStatus } from "@/domain/careWindows";
import { systemMilestoneId } from "@/domain/journey";
import type { SystemMilestoneKey } from "@/domain/types";
import { m } from "@/i18n";
import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { RequestContext } from "../session";

/** A recommended care window with its copy and presentation state resolved. */
export interface CareWindowVM {
  key: string;
  kind: CareWindowKind;
  status: CareWindowStatus;
  optional: boolean;
  conditional: boolean;
  title: string;
  body: string;
  includesIntro: string;
  includes: string[];
  startWeek: number;
  endWeek: number;
  startsInWeeks: number;
  appointmentType?: AppointmentType;
  matchedAppointmentId?: string;
  logged?: CareLogEntry;
  badge: { tone: BadgeTone; label: string };
  /** Journey detail for windows that live on the timeline. */
  milestoneHref?: string;
}

function badgeFor(s: CareWindowState): { tone: BadgeTone; label: string } {
  const st = m.careWindows.status;
  switch (s.status) {
    case "upcoming":
      return { tone: "future", label: st.upcoming(s.window.startWeek) };
    case "active":
      if (s.window.requires) return { tone: "medical", label: st.conditional };
      return s.window.optional ? { tone: "medical", label: st.optional } : { tone: "needed", label: st.active };
    case "scheduled":
      return { tone: "medical", label: st.scheduled };
    case "discussed":
      return { tone: "medical", label: st.discussed };
    case "done":
      return { tone: "ready", label: st.done };
    case "needs_attention":
      return { tone: "unverified", label: st.needs_attention };
    default:
      return { tone: "future", label: st.done };
  }
}

export function toCareWindowVM(s: CareWindowState, householdId: string): CareWindowVM {
  const copy = m.careWindows.windows[s.window.key]!;
  return {
    key: s.window.key,
    kind: s.window.kind,
    status: s.status,
    optional: Boolean(s.window.optional),
    conditional: Boolean(s.window.requires),
    title: copy.title,
    body: copy.now,
    includesIntro: copy.includesIntro ?? m.careWindows.includesIntro,
    includes: copy.includes,
    startWeek: s.window.startWeek,
    endWeek: s.window.endWeek,
    startsInWeeks: s.startsInWeeks,
    appointmentType: s.window.appointmentTypes[0],
    matchedAppointmentId: s.matchedAppointmentId,
    logged: s.logged,
    badge: badgeFor(s),
    milestoneHref: s.window.milestone ? `/journey/milestone/${encodeURIComponent(systemMilestoneId(householdId, s.window.key as SystemMilestoneKey))}` : undefined,
  };
}

export interface CareViews {
  all: CareWindowVM[];
  /** For the weekly page: live now, recent misses, and the next one. */
  visible: CareWindowVM[];
  /** For the Today next-step slot. */
  attention: CareWindowVM | null;
}

export function careWindowViews(ctx: RequestContext): CareViews {
  const { data, today } = ctx;
  if (!data.pregnancy || data.baby?.birthDate) return { all: [], visible: [], attention: null };
  const states = evaluateCareWindows(data.pregnancy, data.appointments, today);
  const h = data.household.id;
  const attention = nextCareAttention(states);
  return {
    all: states.map((s) => toCareWindowVM(s, h)),
    visible: visibleCareWindows(states).map((s) => toCareWindowVM(s, h)),
    attention: attention ? toCareWindowVM(attention, h) : null,
  };
}
