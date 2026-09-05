import { describe, expect, it } from "vitest";
import type { Baby, JourneyMilestone, Pregnancy } from "./types";
import { generateSystemMilestones, milestoneStates, nextMilestone, selectCurrentMilestoneId } from "./journey";
import { addDays } from "./dates";

const pregnancy: Pregnancy = {
  id: "p1",
  householdId: "h1",
  dueDate: "2027-03-20",
  followUpCity: "A",
  deliveryCity: "B",
  mode: "pregnancy",
  createdAt: "2026-08-01T09:00:00.000Z",
  dueDateHistory: [],
};

const baby: Baby = { id: "b1", householdId: "h1", displayName: null, gender: "unknown" };

describe("system milestones", () => {
  it("generates the pregnancy arc without postpartum entries before birth", () => {
    const ms = generateSystemMilestones(pregnancy, baby);
    const keys = ms.map((mm) => mm.key);
    expect(keys).toContain("setup");
    expect(keys).toContain("first_trimester_end");
    expect(keys).toContain("due_window");
    expect(keys).toContain("due_date");
    expect(keys).not.toContain("birth");
    expect(keys).not.toContain("forty_days");
  });

  it("keeps pregnancy history and adds birth + postpartum after confirmation", () => {
    const born: Baby = { ...baby, birthDate: "2027-03-18" };
    const ms = generateSystemMilestones(pregnancy, born);
    const keys = ms.map((mm) => mm.key);
    expect(keys).toContain("setup");
    expect(keys).toContain("first_trimester_end");
    expect(keys).toContain("hospital_bag");
    expect(keys).toContain("birth");
    expect(keys).toContain("forty_days");
    expect(keys).toContain("month_3");
    expect(ms.find((mm) => mm.key === "forty_days")?.date).toBe(addDays("2027-03-18", 40));
  });

  it("drops pregnancy milestones that fall after an early birth so birth becomes the pivot", () => {
    // 2027-02-15 is 35w+2d for a 2027-03-20 due date: the hospital-bag
    // (36w), due-window (37w) and due-date milestones never happened.
    const early: Baby = { ...baby, birthDate: "2027-02-15" };
    const ms = generateSystemMilestones(pregnancy, early);
    const keys = ms.map((mm) => mm.key);
    expect(keys).not.toContain("due_date");
    expect(keys).not.toContain("due_window");
    expect(keys).not.toContain("hospital_bag");
    expect(keys).toContain("third_trimester_begin");
    expect(keys).toContain("birth");
    const birthIdx = ms.findIndex((mm) => mm.key === "birth");
    expect(ms.slice(0, birthIdx).every((mm) => mm.date <= "2027-02-15")).toBe(true);
  });
});

describe("exactly one current milestone", () => {
  const list: JourneyMilestone[] = [
    { id: "a", householdId: "h1", type: "automatic", title: "a", date: "2026-08-01", origin: "system" },
    { id: "b", householdId: "h1", type: "medical", title: "b", date: "2026-09-01", origin: "user" },
    { id: "c", householdId: "h1", type: "family", title: "c", date: "2026-09-05", origin: "user" },
    { id: "d", householdId: "h1", type: "automatic", title: "d", date: "2026-10-01", origin: "system" },
  ];

  it("picks the latest milestone not after today", () => {
    expect(selectCurrentMilestoneId(list, "2026-09-05")).toBe("c");
    expect(selectCurrentMilestoneId(list, "2026-09-04")).toBe("b");
    const states = milestoneStates(list, "2026-09-05");
    expect([...states.values()].filter((s) => s === "current")).toHaveLength(1);
    expect(states.get("a")).toBe("past");
    expect(states.get("d")).toBe("future");
  });

  it("falls back to the first milestone before anything happened", () => {
    expect(selectCurrentMilestoneId(list, "2026-01-01")).toBe("a");
    expect([...milestoneStates(list, "2026-01-01").values()].filter((s) => s === "current")).toHaveLength(1);
  });

  it("returns the next upcoming milestone", () => {
    expect(nextMilestone(list, "2026-09-05")?.id).toBe("d");
    expect(nextMilestone(list, "2026-12-01")).toBeNull();
  });

  it("handles an empty list", () => {
    expect(selectCurrentMilestoneId([], "2026-09-05")).toBeNull();
  });
});
