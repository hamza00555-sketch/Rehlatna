import { describe, expect, it } from "vitest";
import { lmpFromDueDate, postpartumAge, pregnancyProgress } from "./pregnancy";
import { addDays } from "./dates";

describe("pregnancy progress", () => {
  const due = "2027-03-20";

  it("derives LMP 280 days before the due date", () => {
    expect(lmpFromDueDate(due)).toBe(addDays(due, -280));
  });

  it("computes completed weeks and day within week", () => {
    const lmp = lmpFromDueDate(due);
    const p = pregnancyProgress(due, addDays(lmp, 8 * 7 + 2));
    expect(p.week).toBe(8);
    expect(p.dayOfWeek).toBe(3);
    expect(p.trimester).toBe(1);
    expect(p.remainingDays).toBe(280 - 58);
  });

  it("clamps media week to 5–40", () => {
    const lmp = lmpFromDueDate(due);
    expect(pregnancyProgress(due, addDays(lmp, 10)).mediaWeek).toBe(5);
    expect(pregnancyProgress(due, addDays(lmp, 300)).mediaWeek).toBe(40);
    expect(pregnancyProgress(due, addDays(lmp, 22 * 7)).mediaWeek).toBe(22);
  });

  it("marks overdue after the due date and never reports negative remaining", () => {
    const p = pregnancyProgress(due, addDays(due, 3));
    expect(p.overdue).toBe(true);
    expect(p.remainingDays).toBe(0);
  });

  it("assigns trimesters at weeks 13 and 27", () => {
    const lmp = lmpFromDueDate(due);
    expect(pregnancyProgress(due, addDays(lmp, 12 * 7 + 6)).trimester).toBe(1);
    expect(pregnancyProgress(due, addDays(lmp, 13 * 7)).trimester).toBe(2);
    expect(pregnancyProgress(due, addDays(lmp, 27 * 7)).trimester).toBe(3);
  });
});

describe("postpartum age", () => {
  const birth = "2026-08-24";

  it("leads with days under two weeks", () => {
    const a = postpartumAge(birth, addDays(birth, 12));
    expect(a.days).toBe(12);
    expect(a.leadUnit).toBe("days");
    expect(a.withinFortyDays).toBe(true);
    expect(a.fortyDayNumber).toBe(13);
  });

  it("switches to weeks, then months", () => {
    expect(postpartumAge(birth, addDays(birth, 20)).leadUnit).toBe("weeks");
    expect(postpartumAge(birth, addDays(birth, 20)).weeks).toBe(2);
    expect(postpartumAge(birth, addDays(birth, 95)).leadUnit).toBe("months");
    expect(postpartumAge(birth, addDays(birth, 95)).months).toBe(3);
  });

  it("leaves the forty-day window at day 40", () => {
    expect(postpartumAge(birth, addDays(birth, 39)).withinFortyDays).toBe(true);
    expect(postpartumAge(birth, addDays(birth, 40)).withinFortyDays).toBe(false);
    expect(postpartumAge(birth, addDays(birth, 40)).fortyDayNumber).toBeUndefined();
  });
});
