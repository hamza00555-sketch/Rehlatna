import { describe, expect, it } from "vitest";
import type { Appointment, Pregnancy } from "./types";
import { dateForGestationalDay } from "./pregnancy";
import { CARE_WINDOWS, evaluateCareWindow, evaluateCareWindows, nextCareAttention, visibleCareWindows } from "./careWindows";

const dueDate = "2027-03-20";
const at = (week: number, day = 0) => dateForGestationalDay(dueDate, week * 7 + day);
const pregnancy: Pregnancy = { id: "p", householdId: "h", dueDate, followUpCity: "a", deliveryCity: "b", mode: "pregnancy", createdAt: "2026-01-01T00:00:00.000Z", dueDateHistory: [] };
const appt = (type: Appointment["type"], week: number, status: Appointment["status"] = "upcoming"): Appointment => ({ id: `a-${type}-${week}`, householdId: "h", type, date: at(week, 2), preparationTasks: [], status, reminder: false });
/** An appointment booked from a care window (explicit link). */
const linked = (key: string, type: Appointment["type"], week: number, status: Appointment["status"] = "upcoming"): Appointment => ({ ...appt(type, week, status), id: `l-${key}-${week}`, careWindowKey: key });
const win = (key: string) => CARE_WINDOWS.find((w) => w.key === key)!;

describe("care windows", () => {
  it("are ordered and derive from the same gestational arithmetic", () => {
    const weeks = CARE_WINDOWS.map((w) => w.startWeek);
    expect([...weeks].sort((a, b) => a - b)).toEqual(weeks);
    expect(win("gbs_screen").endWeek).toBe(37);
    expect(win("first_visit").endWeek).toBe(12);
  });

  it("upcoming → active → needs attention → passed as weeks move", () => {
    const w = win("anatomy_scan");
    expect(evaluateCareWindow(w, pregnancy, [], at(15))!.status).toBe("upcoming");
    expect(evaluateCareWindow(w, pregnancy, [], at(19))!.status).toBe("active");
    expect(evaluateCareWindow(w, pregnancy, [], at(24))!.status).toBe("needs_attention");
    expect(evaluateCareWindow(w, pregnancy, [], at(30))!.status).toBe("passed");
  });

  it("an appointment of the right type inside the window schedules it, but only an explicit link completes a scan", () => {
    const w = win("anatomy_scan");
    expect(evaluateCareWindow(w, pregnancy, [appt("ultrasound", 20)], at(19))!.status).toBe("scheduled");
    // A generic completed ultrasound is a candidate, not proof: the family confirms.
    const generic = evaluateCareWindow(w, pregnancy, [appt("ultrasound", 20, "done")], at(24))!;
    expect(generic.status).toBe("needs_attention");
    expect(generic.matchedAppointmentId).toBe("a-ultrasound-20");
    expect(evaluateCareWindow(w, pregnancy, [linked("anatomy_scan", "ultrasound", 20, "done")], at(24))!.status).toBe("done");
    expect(evaluateCareWindow(w, pregnancy, [appt("checkup", 20, "done")], at(24))!.status).toBe("needs_attention");
    expect(evaluateCareWindow(w, pregnancy, [appt("ultrasound", 12, "done")], at(24))!.status).toBe("needs_attention");
  });

  it("an explicit link wins over week arithmetic and is never borrowed by another window", () => {
    // Booked for the early scan but dated in the anatomy window: belongs to the early scan only.
    const late = [linked("early_scan", "ultrasound", 19, "done")];
    expect(evaluateCareWindow(win("early_scan"), pregnancy, late, at(20))!.status).toBe("done");
    expect(evaluateCareWindow(win("anatomy_scan"), pregnancy, late, at(20))!.status).toBe("active");
    // A visit still counts it: the family did see the care team that week.
    expect(evaluateCareWindow(win("visit_18"), pregnancy, late, at(20))!.status).toBe("done");
  });

  it("visits complete on any completed contact, and tolerate a week either side", () => {
    expect(evaluateCareWindow(win("visit_28"), pregnancy, [appt("checkup", 30)], at(28))!.status).toBe("scheduled");
    expect(evaluateCareWindow(win("visit_28"), pregnancy, [appt("checkup", 31)], at(28))!.status).toBe("active");
    expect(evaluateCareWindow(win("visit_28"), pregnancy, [appt("lab", 28, "done")], at(30))!.status).toBe("done");
  });

  it("family records win: discussed is its own state, done is done, skipped hides", () => {
    const logged = { ...pregnancy, careLog: { tdap: { state: "discussed" as const, at: at(30) }, gdm_screen: { state: "done" as const, at: at(26) }, nipt: { state: "skipped" as const, at: at(12) } } };
    expect(evaluateCareWindow(win("tdap"), logged, [], at(30))!.status).toBe("discussed");
    expect(evaluateCareWindow(win("gdm_screen"), logged, [], at(30))!.status).toBe("done");
    expect(evaluateCareWindow(win("nipt"), logged, [], at(12))!.status).toBe("passed");
    // Discussed never claims the next-step slot, but stays listed while its window is open.
    const states = evaluateCareWindows(logged, [appt("checkup", 28, "done"), linked("gdm_screen", "lab", 26, "done")], at(30));
    expect(nextCareAttention(states)?.window.key).not.toBe("tdap");
    expect(visibleCareWindows(states).map((s) => s.window.key)).toContain("tdap");
  });

  it("optional windows never nag once passed", () => {
    expect(evaluateCareWindow(win("nipt"), pregnancy, [], at(24))!.status).toBe("passed");
  });

  it("conditional windows appear only when the fact is recorded", () => {
    expect(evaluateCareWindow(win("anti_d"), pregnancy, [], at(28))).toBeNull();
    expect(evaluateCareWindow(win("anti_d"), { ...pregnancy, rhNegative: true }, [], at(28))!.status).toBe("active");
    expect(evaluateCareWindows(pregnancy, [], at(28)).some((s) => s.window.key === "anti_d")).toBe(false);
  });

  it("the next-step slot prefers an open window, then a recent miss, never an optional one", () => {
    // Week 12: first visit still open (nothing scheduled), NIPT optional and open.
    expect(nextCareAttention(evaluateCareWindows(pregnancy, [], at(12)))!.window.key).toBe("first_visit");
    // Week 22 with the anatomy scan done: nothing open; first visit and early scan are beyond grace → null.
    const done = [appt("checkup", 15, "done"), linked("anatomy_scan", "ultrasound", 19, "done")];
    expect(nextCareAttention(evaluateCareWindows(pregnancy, done, at(22)))).toBeNull();
    // Week 24: the anatomy scan just closed unrecorded → gentle attention.
    expect(nextCareAttention(evaluateCareWindows(pregnancy, [linked("anatomy_scan", "ultrasound", 19, "done")], at(24)))!.window.key).toBe("visit_24");
    expect(nextCareAttention(evaluateCareWindows(pregnancy, [appt("checkup", 24)], at(24)))!.window.key).toBe("gdm_screen");
    expect(nextCareAttention(evaluateCareWindows(pregnancy, [appt("checkup", 24), appt("lab", 25)], at(24)))!.window.key).toBe("anatomy_scan");
  });

  it("the weekly list shows what is live plus the single next window", () => {
    const visible = visibleCareWindows(evaluateCareWindows(pregnancy, [linked("anatomy_scan", "ultrasound", 19, "done")], at(22)));
    const keys = visible.map((v) => v.window.key);
    expect(keys).toContain("anatomy_scan"); // done inside its window
    expect(keys).toContain("nipt"); // optional, still open
    expect(keys).toContain("visit_24"); // the next one
    expect(keys).not.toContain("gdm_screen");
    expect(keys).not.toContain("first_visit");
    // A visit booked far ahead waits until it is within a month.
    const far = visibleCareWindows(evaluateCareWindows(pregnancy, [linked("anatomy_scan", "ultrasound", 19, "done"), appt("checkup", 32)], at(22)));
    expect(far.map((v) => v.window.key)).not.toContain("visit_32");
    const near = visibleCareWindows(evaluateCareWindows(pregnancy, [appt("checkup", 32)], at(29)));
    expect(near.map((v) => v.window.key)).toContain("visit_32");
  });
});
