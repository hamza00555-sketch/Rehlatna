import type { Appointment, AppointmentType, CareLogEntry, IsoDate, Pregnancy } from "./types";
import { pregnancyProgress } from "./pregnancy";

/**
 * Recommended care windows for a LOW-RISK pregnancy, expressed in gestational
 * weeks. They are guidance for organising follow-up, never a schedule the app
 * enforces: the doctor may move, add or drop any of them. Every timing here
 * derives from the same due-date arithmetic as the rest of the app.
 *
 * `requires` gates conditional windows on a recorded fact (never assumed).
 * Future personalisation (twins, high risk, GDM, hypertension…) plugs in as
 * additional `requires` facts or alternative tables — not as new sources of
 * gestational age.
 */

export type CareWindowKey =
  | "first_visit"
  | "nipt"
  | "early_scan"
  | "visit_18"
  | "anatomy_scan"
  | "visit_24"
  | "gdm_screen"
  | "visit_28"
  | "anti_d"
  | "tdap"
  | "visit_32"
  | "visit_36"
  | "gbs_screen"
  | "visit_38"
  | "visit_40";

export type CareWindowKind = "visit" | "scan" | "screening" | "vaccine" | "decision";

export interface CareWindow {
  key: CareWindowKey;
  kind: CareWindowKind;
  /** Inclusive gestational weeks. */
  startWeek: number;
  endWeek: number;
  /** Appointment types that count as this window being scheduled or done. */
  appointmentTypes: AppointmentType[];
  /** Something to discuss, not something everyone does. Never nags when passed. */
  optional?: boolean;
  /** Shown only when this fact is recorded on the pregnancy. */
  requires?: "rhNegative";
  /** Surfaces on the journey timeline as a system milestone. */
  milestone?: boolean;
  /** Visits tolerate a week either side when matching appointments. */
  matchSlackWeeks?: number;
}

/** Any contact with the care team counts as a visit. */
const VISIT: AppointmentType[] = ["checkup", "ultrasound", "lab", "specialist", "delivery_planning"];

export const CARE_WINDOWS: readonly CareWindow[] = [
  { key: "first_visit", kind: "visit", startWeek: 4, endWeek: 12, appointmentTypes: VISIT, matchSlackWeeks: 0 },
  { key: "nipt", kind: "decision", startWeek: 10, endWeek: 22, appointmentTypes: ["lab"], optional: true },
  { key: "early_scan", kind: "scan", startWeek: 11, endWeek: 14, appointmentTypes: ["ultrasound"], milestone: true },
  { key: "visit_18", kind: "visit", startWeek: 17, endWeek: 19, appointmentTypes: VISIT, matchSlackWeeks: 1 },
  { key: "anatomy_scan", kind: "scan", startWeek: 18, endWeek: 22, appointmentTypes: ["ultrasound"], milestone: true },
  { key: "visit_24", kind: "visit", startWeek: 23, endWeek: 25, appointmentTypes: VISIT, matchSlackWeeks: 1 },
  { key: "gdm_screen", kind: "screening", startWeek: 24, endWeek: 28, appointmentTypes: ["lab"], milestone: true },
  { key: "visit_28", kind: "visit", startWeek: 27, endWeek: 29, appointmentTypes: VISIT, matchSlackWeeks: 1 },
  { key: "tdap", kind: "vaccine", startWeek: 27, endWeek: 36, appointmentTypes: [], milestone: true },
  { key: "anti_d", kind: "decision", startWeek: 28, endWeek: 30, appointmentTypes: ["checkup"], requires: "rhNegative" },
  { key: "visit_32", kind: "visit", startWeek: 31, endWeek: 33, appointmentTypes: VISIT, matchSlackWeeks: 1 },
  { key: "visit_36", kind: "visit", startWeek: 35, endWeek: 37, appointmentTypes: VISIT, matchSlackWeeks: 1 },
  { key: "gbs_screen", kind: "screening", startWeek: 36, endWeek: 37, appointmentTypes: ["lab"], milestone: true },
  { key: "visit_38", kind: "visit", startWeek: 37, endWeek: 39, appointmentTypes: VISIT, matchSlackWeeks: 1 },
  { key: "visit_40", kind: "visit", startWeek: 39, endWeek: 41, appointmentTypes: VISIT, matchSlackWeeks: 1 },
];

export const CARE_WINDOW_BY_KEY: ReadonlyMap<string, CareWindow> = new Map(CARE_WINDOWS.map((w) => [w.key, w]));

/** Weeks after a window closes during which "not recorded yet" is still worth a gentle nudge. */
export const ATTENTION_GRACE_WEEKS = 4;

export type CareWindowStatus =
  /** The window has not opened yet. */
  | "upcoming"
  /** Inside the usual window, nothing scheduled or recorded. */
  | "active"
  /** An appointment of the right kind falls in the window. */
  | "scheduled"
  /** Done: a completed appointment in the window, or the family recorded it. */
  | "done"
  /** Window closed recently with nothing recorded. */
  | "needs_attention"
  /** Closed long ago, optional, or explicitly skipped: nothing to surface. */
  | "passed";

export interface CareWindowState {
  window: CareWindow;
  status: CareWindowStatus;
  /** Weeks until the window opens (negative once it has). */
  startsInWeeks: number;
  matchedAppointmentId?: string;
  logged?: CareLogEntry;
}

function weekOf(dueDate: IsoDate, date: IsoDate): number {
  return pregnancyProgress(dueDate, date).week;
}

function matchAppointment(window: CareWindow, pregnancy: Pregnancy, appointments: Appointment[]): Appointment | undefined {
  if (window.appointmentTypes.length === 0) return undefined;
  const slack = window.matchSlackWeeks ?? 0;
  const inWindow = appointments
    .filter((a) => a.status !== "cancelled" && window.appointmentTypes.includes(a.type))
    .filter((a) => {
      const w = weekOf(pregnancy.dueDate, a.date);
      return w >= window.startWeek - slack && w <= window.endWeek + slack;
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return inWindow.find((a) => a.status === "done") ?? inWindow[0];
}

export function evaluateCareWindow(window: CareWindow, pregnancy: Pregnancy, appointments: Appointment[], today: IsoDate): CareWindowState | null {
  if (window.requires === "rhNegative" && !pregnancy.rhNegative) return null;
  const week = pregnancyProgress(pregnancy.dueDate, today).week;
  const startsInWeeks = window.startWeek - week;
  const logged = pregnancy.careLog?.[window.key];
  const matched = matchAppointment(window, pregnancy, appointments);

  let status: CareWindowStatus;
  if (logged?.state === "skipped") status = "passed";
  else if (logged || matched?.status === "done") status = "done";
  else if (matched) status = "scheduled";
  else if (week < window.startWeek) status = "upcoming";
  else if (week <= window.endWeek) status = "active";
  else if (!window.optional && week <= window.endWeek + ATTENTION_GRACE_WEEKS) status = "needs_attention";
  else status = "passed";

  return { window, status, startsInWeeks, matchedAppointmentId: matched?.id, logged };
}

/** Every applicable window with its status, in gestational order. */
export function evaluateCareWindows(pregnancy: Pregnancy, appointments: Appointment[], today: IsoDate): CareWindowState[] {
  return CARE_WINDOWS.map((w) => evaluateCareWindow(w, pregnancy, appointments, today)).filter((s): s is CareWindowState => s !== null);
}

/**
 * The one care item worth the Today "next step" slot, if any:
 * an open window first (nothing scheduled), then a recently closed one that
 * was never recorded. Optional windows never claim the slot.
 */
export function nextCareAttention(states: CareWindowState[]): CareWindowState | null {
  const open = states.find((s) => s.status === "active" && !s.window.optional);
  if (open) return open;
  return states.find((s) => s.status === "needs_attention") ?? null;
}

/**
 * What the weekly page lists "for this stage": everything live right now,
 * recent misses, and the single next window so the family sees what is coming.
 */
export function visibleCareWindows(states: CareWindowState[]): CareWindowState[] {
  // Scheduled windows join the list once they are within a month; live ones always.
  const live = states.filter((s) => s.status === "active" || s.status === "needs_attention" || (s.status === "scheduled" && s.startsInWeeks <= 4));
  const doneInWindow = states.filter((s) => s.status === "done" && s.startsInWeeks <= 0 && s.startsInWeeks > -(s.window.endWeek - s.window.startWeek + 1));
  const next = states.filter((s) => s.status === "upcoming").sort((a, b) => a.startsInWeeks - b.startsInWeeks)[0];
  const out = [...live, ...doneInWindow];
  if (next) out.push(next);
  return out.sort((a, b) => a.window.startWeek - b.window.startWeek);
}
