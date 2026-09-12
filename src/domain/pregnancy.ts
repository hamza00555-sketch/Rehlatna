import type { DatingMethod, IsoDate } from "./types";
import { addDays, daysBetween } from "./dates";

/**
 * Pregnancy week math.
 *
 * Convention (documented and tested):
 * - Gestational age is LMP-based: LMP = dueDate − 280 days.
 * - `week` = completed gestational weeks = floor(gestationalDays / 7).
 *   "8 أسابيع و3 أيام" displays as week 8 — common tracker language.
 * - `dayOfWeek` = day within the current week, 1..7.
 * - Trimesters: weeks 0–12 first, 13–26 second, 27+ third.
 * - Weekly media exists for weeks 5–40; `mediaWeek` clamps to that range.
 */

export const GESTATION_DAYS = 280;
export const TOTAL_WEEKS = 40;
export const MEDIA_MIN_WEEK = 5;
export const MEDIA_MAX_WEEK = 40;

export interface PregnancyProgress {
  gestationalDays: number;
  week: number;
  dayOfWeek: number;
  remainingDays: number;
  remainingWeeks: number;
  trimester: 1 | 2 | 3;
  mediaWeek: number;
  /** 0..1 across the 40 gestational weeks. */
  ratio: number;
  overdue: boolean;
}

export function lmpFromDueDate(dueDate: IsoDate): IsoDate {
  return addDays(dueDate, -GESTATION_DAYS);
}

/** A last-period date older than this cannot still describe an ongoing (undelivered) pregnancy. */
export const LMP_MAX_PAST_DAYS = 294;

export function dueDateFromLmp(lastPeriodStartDate: IsoDate): IsoDate {
  return addDays(lastPeriodStartDate, GESTATION_DAYS);
}

export type LmpDateError = "lmp_in_future" | "lmp_too_old";

/** Never trust a client-computed due date: both onboarding and the edit endpoint re-derive it from this. */
export function validateLmpDate(lastPeriodStartDate: IsoDate, today: IsoDate): LmpDateError | null {
  if (lastPeriodStartDate > today) return "lmp_in_future";
  if (daysBetween(lastPeriodStartDate, today) > LMP_MAX_PAST_DAYS) return "lmp_too_old";
  return null;
}

export type DatingInput = { datingMethod: "lmp"; lastPeriodStartDate: IsoDate } | { datingMethod: "clinician"; dueDate: IsoDate };

export interface ResolvedDating {
  dueDate: IsoDate;
  datingMethod: DatingMethod;
  lastPeriodStartDate?: IsoDate;
}

export function resolveDating(input: DatingInput, today: IsoDate): { ok: true; value: ResolvedDating } | { ok: false; error: LmpDateError } {
  if (input.datingMethod === "clinician") {
    return { ok: true, value: { dueDate: input.dueDate, datingMethod: "clinician" } };
  }
  const error = validateLmpDate(input.lastPeriodStartDate, today);
  if (error) return { ok: false, error };
  return {
    ok: true,
    value: { dueDate: dueDateFromLmp(input.lastPeriodStartDate), datingMethod: "lmp", lastPeriodStartDate: input.lastPeriodStartDate },
  };
}

export function dateForGestationalDay(dueDate: IsoDate, day: number): IsoDate {
  return addDays(lmpFromDueDate(dueDate), day);
}

/**
 * The single trimester rule for the whole app: completed weeks 0–13 are the
 * first trimester, 14–27 the second, 28+ the third. The journey milestones
 * derive from the same boundaries (see journey.ts).
 */
export function trimesterOfWeek(week: number): 1 | 2 | 3 {
  return week < 14 ? 1 : week < 28 ? 2 : 3;
}

export function pregnancyProgress(dueDate: IsoDate, today: IsoDate): PregnancyProgress {
  const gestationalDays = Math.max(0, daysBetween(lmpFromDueDate(dueDate), today));
  const week = Math.floor(gestationalDays / 7);
  const remainingSigned = daysBetween(today, dueDate);
  const remainingDays = Math.max(0, remainingSigned);
  return {
    gestationalDays,
    week,
    dayOfWeek: (gestationalDays % 7) + 1,
    remainingDays,
    remainingWeeks: Math.ceil(remainingDays / 7),
    trimester: trimesterOfWeek(week),
    // Weeks before the manifest starts resolve to the neutral early-weeks entry (no borrowed poster).
    mediaWeek: Math.min(MEDIA_MAX_WEEK, week),
    ratio: Math.min(1, gestationalDays / GESTATION_DAYS),
    overdue: remainingSigned < 0,
  };
}

export interface PostpartumAge {
  days: number;
  weeks: number;
  weekDays: number;
  months: number;
  monthDays: number;
  /** Days lead under two weeks, weeks until three months, then months. */
  leadUnit: "days" | "weeks" | "months";
  withinFortyDays: boolean;
  /** 1..40 while inside the forty-day period. */
  fortyDayNumber?: number;
}

export function postpartumAge(birthDate: IsoDate, today: IsoDate): PostpartumAge {
  const days = Math.max(0, daysBetween(birthDate, today));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const withinFortyDays = days < 40;
  return {
    days,
    weeks,
    weekDays: days % 7,
    months,
    monthDays: days % 30,
    leadUnit: days < 14 ? "days" : days < 90 ? "weeks" : "months",
    withinFortyDays,
    fortyDayNumber: withinFortyDays ? days + 1 : undefined,
  };
}
