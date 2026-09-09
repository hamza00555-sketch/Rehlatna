import { describe, expect, it } from "vitest";
import type { FundingGoal } from "./types";
import {
  computeGoal,
  computeTotals,
  contributionPeriods,
  explainRecalculation,
  goalState,
  monthlyRequirement,
  remainingAmount,
  targetCost,
} from "./finance";

const base: FundingGoal = {
  id: "g1",
  householdId: "h1",
  name: "goal",
  expectedCost: 1200,
  fundedAmount: 0,
  fundingDate: "2026-12-15",
  spendingDate: "2027-03-01",
  phase: "before_birth",
  priority: "essential",
  visibility: "private",
  ownerUserId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const TODAY = "2026-09-05";

describe("funding date boundaries", () => {
  it("funding date today → one period, whole remainder due", () => {
    expect(contributionPeriods(TODAY, TODAY)).toBe(1);
    expect(monthlyRequirement({ ...base, fundingDate: TODAY }, TODAY)).toBe(1200);
    expect(goalState({ ...base, fundingDate: TODAY }, TODAY)).toBe("attention");
  });

  it("funding date later this month → one period", () => {
    expect(contributionPeriods(TODAY, "2026-09-28")).toBe(1);
    expect(monthlyRequirement({ ...base, fundingDate: "2026-09-28" }, TODAY)).toBe(1200);
  });

  it("funding date next month → two periods (this month and next)", () => {
    expect(contributionPeriods(TODAY, "2026-10-02")).toBe(2);
    expect(monthlyRequirement({ ...base, fundingDate: "2026-10-02" }, TODAY)).toBe(600);
    expect(goalState({ ...base, fundingDate: "2026-10-02" }, TODAY)).toBe("not_started");
    expect(goalState({ ...base, fundingDate: "2026-10-02", fundedAmount: 100 }, TODAY)).toBe("on_track");
  });

  it("funding date in the past → still one period and flagged overdue", () => {
    expect(contributionPeriods(TODAY, "2026-06-01")).toBe(1);
    expect(monthlyRequirement({ ...base, fundingDate: "2026-06-01" }, TODAY)).toBe(1200);
    expect(goalState({ ...base, fundingDate: "2026-06-01" }, TODAY)).toBe("overdue");
  });

  it("four months out → ceil(remaining / 4)", () => {
    expect(contributionPeriods(TODAY, base.fundingDate)).toBe(4);
    expect(monthlyRequirement(base, TODAY)).toBe(300);
    expect(monthlyRequirement({ ...base, expectedCost: 1000 }, TODAY)).toBe(250);
    expect(monthlyRequirement({ ...base, expectedCost: 1001 }, TODAY)).toBe(251);
  });
});

describe("spending date is never a calculation input", () => {
  it("changing spendingDate changes nothing computed", () => {
    const a = computeGoal(base, TODAY);
    const b = computeGoal({ ...base, spendingDate: "2030-01-01" }, TODAY);
    const c = computeGoal({ ...base, spendingDate: undefined }, TODAY);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });
});

describe("targets and remaining", () => {
  it("actualCost overrides expectedCost; both absent → 0", () => {
    expect(targetCost({ expectedCost: 100, actualCost: 120 })).toBe(120);
    expect(targetCost({ expectedCost: 100 })).toBe(100);
    expect(targetCost({})).toBe(0);
  });

  it("fully funded → remaining 0, monthly 0, state complete", () => {
    const funded = { ...base, fundedAmount: 1200 };
    expect(remainingAmount(funded)).toBe(0);
    expect(monthlyRequirement(funded, TODAY)).toBe(0);
    expect(goalState(funded, TODAY)).toBe("complete");
    expect(remainingAmount({ ...base, fundedAmount: 5000 })).toBe(0);
  });

  it("totals aggregate across goals and cap funded at target", () => {
    const totals = computeTotals([base, { ...base, id: "g2", fundedAmount: 5000, expectedCost: 1000 }], TODAY);
    expect(totals.target).toBe(2200);
    expect(totals.funded).toBe(1000);
    expect(totals.remaining).toBe(1200);
    expect(totals.monthly).toBe(300);
  });
});

describe("recalculation explanations", () => {
  const now = "2026-09-05T10:00:00.000Z";

  it("price increase raises monthly and records both values", () => {
    const next = { ...base, expectedCost: 1600 };
    const ex = explainRecalculation({ id: "r1", previous: base, next, today: TODAY, now, whatChanged: "price", why: "increase" });
    expect(ex.previousMonthly).toBe(300);
    expect(ex.newMonthly).toBe(400);
    expect(ex.effectiveFundingDate).toBe(base.fundingDate);
  });

  it("price decrease lowers monthly", () => {
    const next = { ...base, expectedCost: 800 };
    const ex = explainRecalculation({ id: "r2", previous: base, next, today: TODAY, now, whatChanged: "price", why: "decrease" });
    expect(ex.newMonthly).toBe(200);
    expect(ex.newMonthly).toBeLessThan(ex.previousMonthly);
  });

  it("new contribution lowers monthly", () => {
    const next = { ...base, fundedAmount: 400 };
    const ex = explainRecalculation({ id: "r3", previous: base, next, today: TODAY, now, whatChanged: "contribution", why: "c" });
    expect(ex.newMonthly).toBe(200);
  });

  it("funding date change records the new effective date", () => {
    const next = { ...base, fundingDate: "2027-02-10" };
    const ex = explainRecalculation({ id: "r4", previous: base, next, today: TODAY, now, whatChanged: "date", why: "d" });
    expect(ex.effectiveFundingDate).toBe("2027-02-10");
    expect(ex.newMonthly).toBe(200);
  });
});
