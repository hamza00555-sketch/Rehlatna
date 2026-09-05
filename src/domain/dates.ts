import type { IsoDate } from "./types";

/**
 * Date helpers over ISO `YYYY-MM-DD` strings, computed in UTC so results
 * never shift with the server timezone. Domain logic always receives `today`
 * as a parameter — it never reads the clock — for testability.
 */

export function parseIso(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function todayIso(): IsoDate {
  return toIso(new Date());
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIso(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Whole days from `a` to `b`; positive when `b` is later. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);
}

/** Calendar months from the month of `a` to the month of `b`. Same month → 0. */
export function monthDiff(a: IsoDate, b: IsoDate): number {
  const da = parseIso(a);
  const db = parseIso(b);
  return (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth());
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseIso(value);
  return !Number.isNaN(d.getTime()) && toIso(d) === value;
}
