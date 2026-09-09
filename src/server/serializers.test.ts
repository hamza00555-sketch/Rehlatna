import { describe, expect, it } from "vitest";
import { demoPregnancyHousehold } from "@/fixtures/demo";
import { viewerFromMember } from "@/domain/permissions";
import type { FundingGoal } from "@/domain/types";
import {
  serializeFinanceOverview,
  serializeMember,
  serializePreparationItem,
  stripFinance,
  visibleGoals,
} from "./serializers";

const today = "2026-09-05";
const data = demoPregnancyHousehold(today);
const member = (id: string) => data.members.find((mm) => mm.id === id)!;
const mother = viewerFromMember(member("demo_m_mother"));
const planner = viewerFromMember(member("demo_m_partner"));
const supporter = viewerFromMember(member("demo_m_supporter"));

describe("privacy boundary — finance", () => {
  it("returns null (not an empty object) for viewers without finance:view", () => {
    expect(serializeFinanceOverview(data, mother, today)).toBeNull();
    expect(serializeFinanceOverview(data, supporter, today)).toBeNull();
  });

  it("serialises finance only for the planner", () => {
    const view = serializeFinanceOverview(data, planner, today);
    expect(view).not.toBeNull();
    expect(view!.goals.length).toBeGreaterThan(0);
    expect(view!.canEdit).toBe(true);
  });

  it("strips every finance record from exports for non-finance viewers", () => {
    const stripped = stripFinance(data, mother);
    expect(stripped.fundingGoals).toEqual([]);
    expect(stripped.fundingContributions).toEqual([]);
    expect(stripped.recalculations).toEqual([]);
    expect(JSON.stringify(stripped)).not.toContain("expectedCost");
    // Everything else survives.
    expect(stripped.preparationItems.length).toBe(data.preparationItems.length);
  });

  it("keeps finance for the planner", () => {
    expect(stripFinance(data, planner).fundingGoals.length).toBe(data.fundingGoals.length);
  });

  it("hides private goals of other owners unless the household shares finance", () => {
    const privateOnly = {
      ...data,
      household: { ...data.household, settings: { ...data.household.settings, financeShared: false } },
      fundingGoals: data.fundingGoals.map((g) => ({ ...g, visibility: "private" as const, ownerUserId: "someone_else" })),
    };
    expect(visibleGoals(privateOnly, planner)).toEqual([]);
    const shared = { ...privateOnly, household: { ...privateOnly.household, settings: { ...privateOnly.household.settings, financeShared: true } } };
    expect(visibleGoals(shared, planner).length).toBe(data.fundingGoals.length);
  });

  it("disabled finance hides goals from everyone", () => {
    const off = { ...data, household: { ...data.household, settings: { ...data.household.settings, financeEnabled: false } } };
    expect(visibleGoals(off, planner)).toEqual([]);
    expect(serializeFinanceOverview(off, planner, today)).toBeNull();
  });
});

describe("privacy boundary — preparation", () => {
  const linkedItem = data.preparationItems.find((i) => data.fundingGoals.some((g) => g.preparationItemId === i.id))!;

  it("preparation payloads never carry money", () => {
    const view = serializePreparationItem(linkedItem, planner, data.fundingGoals);
    const json = JSON.stringify(view);
    for (const key of ["expectedCost", "actualCost", "fundedAmount", "monthly", "price"]) expect(json).not.toContain(key);
  });

  it("exposes the goal link only to finance viewers", () => {
    expect(serializePreparationItem(linkedItem, planner, data.fundingGoals).linkedGoalId).toBeDefined();
    expect(serializePreparationItem(linkedItem, mother, data.fundingGoals).linkedGoalId).toBeUndefined();
    expect(serializePreparationItem(linkedItem, supporter, data.fundingGoals).linkedGoalId).toBeUndefined();
  });
});

describe("privacy boundary — members", () => {
  it("shows other members' permissions only to household managers", () => {
    const partner = member("demo_m_partner");
    expect(serializeMember(partner, mother).permissions.length).toBeGreaterThan(0); // mother manages
    expect(serializeMember(partner, supporter).permissions).toEqual([]);
    expect(serializeMember(member("demo_m_supporter"), supporter).permissions.length).toBeGreaterThan(0); // own
  });
});

describe("privacy boundary — export", () => {
  it("planner export excludes other owners' private goals and their contributions", async () => {
    const { exportHouseholdView } = await import("./serializers");
    const foreign: FundingGoal = { ...data.fundingGoals[0]!, id: "goal_foreign", visibility: "private", ownerUserId: "someone_else" };
    const withForeign = {
      ...data,
      household: { ...data.household, settings: { ...data.household.settings, financeShared: false } },
      fundingGoals: [...data.fundingGoals, foreign],
      fundingContributions: [
        ...data.fundingContributions,
        { id: "c_foreign", goalId: "goal_foreign", householdId: data.household.id, amount: 100, date: today },
      ],
    };
    const view = exportHouseholdView(withForeign, planner);
    expect(view.fundingGoals.some((g) => g.id === "goal_foreign")).toBe(false);
    expect(view.fundingContributions.some((c) => c.goalId === "goal_foreign")).toBe(false);
    expect(view.fundingGoals.length).toBe(visibleGoals(withForeign, planner).length);
  });

  it("supporter export carries no finance or care records but keeps appointments", async () => {
    const { exportHouseholdView } = await import("./serializers");
    const view = exportHouseholdView(data, supporter);
    expect(view.fundingGoals).toEqual([]);
    expect(view.fundingContributions).toEqual([]);
    expect(view.recalculations).toEqual([]);
    expect(view.insurance).toEqual([]);
    expect(view.careProviders).toEqual([]);
    expect(view.appointments.length).toBe(data.appointments.length);
    expect(JSON.stringify(view)).not.toContain("expectedCost");
  });

  it("only managers see other members' permissions in the export", async () => {
    const { exportHouseholdView } = await import("./serializers");
    const asSupporter = exportHouseholdView(data, supporter);
    for (const mm of asSupporter.members) {
      if (mm.id === supporter.memberId) expect(mm.permissions.length).toBeGreaterThan(0);
      else expect(mm.permissions).toEqual([]);
    }
    const asMother = exportHouseholdView(data, mother);
    expect(asMother.members.every((mm) => mm.permissions.length > 0)).toBe(true);
    expect(asMother.notificationPreferences.every((n) => n.memberId === mother.memberId)).toBe(true);
  });
});
