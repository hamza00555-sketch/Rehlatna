import { CARE_WINDOWS } from "./careWindows";
import type {
  Appointment,
  Baby,
  IsoDate,
  JourneyMilestone,
  Pregnancy,
  SystemMilestoneKey,
} from "./types";
import { addDays } from "./dates";
import { dateForGestationalDay } from "./pregnancy";

/**
 * Journey = one continuous narrative. System milestones are regenerated from
 * pregnancy/birth dates; user milestones are preserved untouched. Exactly one
 * milestone is `current` at any time.
 */

/** Gestational day (LMP-based) each system pregnancy milestone lands on. */
const PREGNANCY_MILESTONE_DAYS: Partial<Record<SystemMilestoneKey, number>> = {
  // Same boundaries as `trimesterOfWeek`: week 13 is the last week of the first trimester.
  first_trimester_end: 13 * 7 + 6,
  second_trimester_begin: 14 * 7,
  third_trimester_begin: 28 * 7,
  hospital_bag: 36 * 7,
  due_window: 37 * 7,
};

const POSTPARTUM_MILESTONE_DAYS: Partial<Record<SystemMilestoneKey, number>> = {
  forty_days: 40,
  month_1: 30,
  month_2: 61,
  month_3: 91,
};

export function systemMilestoneId(householdId: string, key: SystemMilestoneKey): string {
  return `sys:${householdId}:${key}`;
}

/**
 * Produces system milestones. Titles are resolved from the copy catalogue by
 * `key` at the view-model layer, so the domain stays locale-agnostic; the
 * `title` field carries the key as a stable fallback.
 */
export function generateSystemMilestones(
  pregnancy: Pregnancy,
  baby: Baby | null,
): JourneyMilestone[] {
  const out: JourneyMilestone[] = [];
  const h = pregnancy.householdId;
  const push = (
    key: SystemMilestoneKey,
    type: JourneyMilestone["type"],
    date: IsoDate,
    endDate?: IsoDate,
  ) => {
    out.push({
      id: systemMilestoneId(h, key),
      householdId: h,
      type,
      key,
      title: key,
      date,
      endDate,
      origin: "system",
    });
  };

  // Once birth is confirmed, pregnancy milestones that would have fallen
  // after the birth date no longer apply (an early arrival skips them); the
  // ones already lived through stay as history.
  const birthDate = baby?.birthDate;
  const stillApplies = (date: IsoDate) => !birthDate || date <= birthDate;

  push("setup", "automatic", pregnancy.createdAt.slice(0, 10));
  for (const [key, day] of Object.entries(PREGNANCY_MILESTONE_DAYS) as [
    SystemMilestoneKey,
    number,
  ][]) {
    const date = dateForGestationalDay(pregnancy.dueDate, day);
    if (!stillApplies(date)) continue;
    if (key === "due_window") {
      push(key, "automatic", date, dateForGestationalDay(pregnancy.dueDate, 42 * 7));
    } else {
      push(key, key === "hospital_bag" ? "preparation" : "automatic", date);
    }
  }
  // Recommended care windows that deserve a place on the timeline (scans,
  // screenings, the vaccine window). Visits stay as the family's own appointments.
  for (const w of CARE_WINDOWS) {
    if (!w.milestone) continue;
    const start = dateForGestationalDay(pregnancy.dueDate, w.startWeek * 7);
    if (!stillApplies(start)) continue;
    push(w.key as SystemMilestoneKey, "medical", start, dateForGestationalDay(pregnancy.dueDate, w.endWeek * 7 + 6));
  }
  if (stillApplies(pregnancy.dueDate)) push("due_date", "automatic", pregnancy.dueDate);

  if (baby?.birthDate) {
    push("birth", "birth", baby.birthDate);
    for (const [key, day] of Object.entries(POSTPARTUM_MILESTONE_DAYS) as [
      SystemMilestoneKey,
      number,
    ][]) {
      push(key, "postpartum", addDays(baby.birthDate, day));
    }
  }
  return out;
}

/** Medical milestones derived from appointments (first checkup, ultrasounds…). */
export function appointmentMilestones(appointments: Appointment[]): JourneyMilestone[] {
  return appointments
    .filter((a) => a.status !== "cancelled")
    .map((a) => ({
      id: `appt:${a.id}`,
      householdId: a.householdId,
      type: "medical" as const,
      title: a.type,
      date: a.date,
      appointmentId: a.id,
      origin: "system" as const,
    }));
}

export function sortMilestones(milestones: JourneyMilestone[]): JourneyMilestone[] {
  return [...milestones].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * The current milestone is the latest one whose date is not after today;
 * before anything has happened, it is the earliest milestone. Exactly one.
 */
export function selectCurrentMilestoneId(
  milestones: JourneyMilestone[],
  today: IsoDate,
): string | null {
  const sorted = sortMilestones(milestones);
  if (sorted.length === 0) return null;
  let current: JourneyMilestone | undefined;
  for (const m of sorted) {
    if (m.date <= today) current = m;
    else break;
  }
  return (current ?? sorted[0])!.id;
}

export type MilestoneState = "past" | "current" | "future";

export function milestoneStates(
  milestones: JourneyMilestone[],
  today: IsoDate,
): Map<string, MilestoneState> {
  const currentId = selectCurrentMilestoneId(milestones, today);
  const map = new Map<string, MilestoneState>();
  for (const m of milestones) {
    if (m.id === currentId) map.set(m.id, "current");
    else map.set(m.id, m.date <= today ? "past" : "future");
  }
  return map;
}

export function nextMilestone(
  milestones: JourneyMilestone[],
  today: IsoDate,
): JourneyMilestone | null {
  return sortMilestones(milestones).find((m) => m.date > today) ?? null;
}
