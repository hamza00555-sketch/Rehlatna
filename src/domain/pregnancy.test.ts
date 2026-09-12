import { describe, expect, it } from "vitest";
import { dueDateFromLmp, isDatingUnchanged, lmpFromDueDate, postpartumAge, pregnancyProgress, resolveDating, validateClinicianDueDate, validateLmpDate } from "./pregnancy";
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

  it("caps media week at 40 and keeps the earliest weeks as they are", () => {
    const lmp = lmpFromDueDate(due);
    expect(pregnancyProgress(due, addDays(lmp, 10)).mediaWeek).toBe(1);
    expect(pregnancyProgress(due, addDays(lmp, 300)).mediaWeek).toBe(40);
    expect(pregnancyProgress(due, addDays(lmp, 22 * 7)).mediaWeek).toBe(22);
  });

  it("marks overdue after the due date and never reports negative remaining", () => {
    const p = pregnancyProgress(due, addDays(due, 3));
    expect(p.overdue).toBe(true);
    expect(p.remainingDays).toBe(0);
  });

  it("assigns trimesters at weeks 14 and 28 (completed weeks), matching the journey milestones", () => {
    const lmp = lmpFromDueDate(due);
    expect(pregnancyProgress(due, addDays(lmp, 13 * 7 + 6)).trimester).toBe(1);
    expect(pregnancyProgress(due, addDays(lmp, 14 * 7)).trimester).toBe(2);
    expect(pregnancyProgress(due, addDays(lmp, 27 * 7 + 6)).trimester).toBe(2);
    expect(pregnancyProgress(due, addDays(lmp, 28 * 7)).trimester).toBe(3);
  });

  it("does not borrow week-5 media for the earliest weeks", () => {
    const lmp = lmpFromDueDate(due);
    expect(pregnancyProgress(due, addDays(lmp, 3 * 7)).mediaWeek).toBe(3);
    expect(pregnancyProgress(due, addDays(lmp, 41 * 7)).mediaWeek).toBe(40);
  });
});

describe("dueDateFromLmp", () => {
  it("adds exactly 280 days and inverts lmpFromDueDate", () => {
    const due = "2027-06-15";
    expect(dueDateFromLmp(lmpFromDueDate(due))).toBe(due);
  });

  it("carries a leap-year February and a year boundary forward correctly", () => {
    // Nov 10 2027 + 280 days runs through Feb 2028 (a leap year, 29 days) and
    // the 2027→2028 new year — hand-verified against the calendar, not derived
    // from addDays itself.
    expect(dueDateFromLmp("2027-11-10")).toBe("2028-08-16");
  });

  it("does not add an extra day when the span does not include Feb 29", () => {
    // 2026 is not a leap year: LMP inside it should not be one day short.
    expect(dueDateFromLmp("2026-01-01")).toBe(addDays("2026-01-01", 280));
  });
});

describe("validateLmpDate", () => {
  const today = "2027-03-20";

  it("accepts a date in the past and rejects a date in the future", () => {
    expect(validateLmpDate(addDays(today, -1), today)).toBeNull();
    expect(validateLmpDate(today, today)).toBeNull();
    expect(validateLmpDate(addDays(today, 1), today)).toBe("lmp_in_future");
  });

  it("accepts exactly 294 days back and rejects 295, crossing a leap February and a year boundary", () => {
    // today = 2028-03-01; 294 days back lands on 2027-05-12, a span that
    // includes Feb 29 2028 and the 2027→2028 boundary — hand-verified.
    const boundaryToday = "2028-03-01";
    expect(validateLmpDate("2027-05-12", boundaryToday)).toBeNull();
    expect(validateLmpDate("2027-05-11", boundaryToday)).toBe("lmp_too_old");
  });
});

describe("validateClinicianDueDate", () => {
  const today = "2027-03-20";

  it("accepts exactly 14 days in the past and rejects 15", () => {
    expect(validateClinicianDueDate(addDays(today, -14), today)).toBeNull();
    expect(validateClinicianDueDate(addDays(today, -15), today)).toBe("due_date_too_early");
  });

  it("accepts exactly 294 days ahead and rejects 295", () => {
    expect(validateClinicianDueDate(addDays(today, 294), today)).toBeNull();
    expect(validateClinicianDueDate(addDays(today, 295), today)).toBe("due_date_too_late");
  });

  it("accepts today itself", () => {
    expect(validateClinicianDueDate(today, today)).toBeNull();
  });
});

describe("isDatingUnchanged", () => {
  const record = { dueDate: "2027-03-20", datingMethod: "clinician" as const };

  it("is unchanged when the clinician draft matches the record exactly", () => {
    expect(isDatingUnchanged(record, { method: "clinician", lastPeriodStartDate: "", dueDate: "2027-03-20" })).toBe(true);
  });

  it("is changed when the clinician draft's date differs", () => {
    expect(isDatingUnchanged(record, { method: "clinician", lastPeriodStartDate: "", dueDate: "2027-03-21" })).toBe(false);
  });

  it("is NOT unchanged for a record with no recorded method, even if the clinician draft matches its dueDate — saving still persists the method for the first time", () => {
    const legacyRecord = { dueDate: "2027-03-20" };
    expect(isDatingUnchanged(legacyRecord, { method: "clinician", lastPeriodStartDate: "", dueDate: "2027-03-20" })).toBe(false);
  });

  it("is unchanged when the LMP draft matches the record's method and last-period date", () => {
    const lmpRecord = { dueDate: "2027-03-20", datingMethod: "lmp" as const, lastPeriodStartDate: "2026-06-05" };
    expect(isDatingUnchanged(lmpRecord, { method: "lmp", lastPeriodStartDate: "2026-06-05", dueDate: "" })).toBe(true);
  });

  it("is changed when switching from clinician to LMP even with a plausible last-period date", () => {
    expect(isDatingUnchanged(record, { method: "lmp", lastPeriodStartDate: "2026-06-05", dueDate: "" })).toBe(false);
  });
});

describe("resolveDating", () => {
  const today = "2027-03-20";

  it("derives dueDate from a valid LMP and tags the method", () => {
    const lastPeriodStartDate = addDays(today, -100);
    const result = resolveDating({ datingMethod: "lmp", lastPeriodStartDate }, today);
    expect(result).toEqual({ ok: true, value: { dueDate: dueDateFromLmp(lastPeriodStartDate), datingMethod: "lmp", lastPeriodStartDate } });
  });

  it("passes a clinician-confirmed due date through unchanged, without an LMP field", () => {
    const result = resolveDating({ datingMethod: "clinician", dueDate: "2027-09-01" }, today);
    expect(result).toEqual({ ok: true, value: { dueDate: "2027-09-01", datingMethod: "clinician" } });
  });

  it("surfaces the LMP validation error instead of deriving a due date", () => {
    const result = resolveDating({ datingMethod: "lmp", lastPeriodStartDate: addDays(today, 5) }, today);
    expect(result).toEqual({ ok: false, error: "lmp_in_future" });
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
