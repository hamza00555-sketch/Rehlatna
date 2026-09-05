import type { IsoDate } from "./types";
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

export function dateForGestationalDay(dueDate: IsoDate, day: number): IsoDate {
  return addDays(lmpFromDueDate(dueDate), day);
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
    trimester: week < 13 ? 1 : week < 27 ? 2 : 3,
    mediaWeek: Math.min(MEDIA_MAX_WEEK, Math.max(MEDIA_MIN_WEEK, week)),
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
