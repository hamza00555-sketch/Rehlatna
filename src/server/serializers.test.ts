import { describe, expect, it } from "vitest";
import { demoPregnancyHousehold } from "@/fixtures/demo";
import { permissionsForRoles, viewerFromMember } from "@/domain/permissions";
import {
  serializeFinanceOverview,
  serializeMember,
  serializePreparationItem,
  stripFinance,
  visibleGoals,
} from "./serializers";

const TODAY = "2026-09-05";
const data = demoPregnancyHousehold(TODAY);
const mother = data.members.find((mm) => mm.roles.includes("mother"))!;
const planner = data.members.find((mm) => mm.roles.includes("financial_planner"))!;
const supporter = data.members.find((mm) => mm.roles.includes("family_supporter"))!;

const MONEY_KEYS = ["price", "expectedCost", "actualCost", "fundedAmount", "fundingDate", "spendingDate", "monthly", "remaining"];

describe("privacy boundary", () => {
  it("members without finance:view receive null for the finance overview", () => {
    expect(serializeFinanceOverview(data, viewerFromMember(mother), TODAY)).toBeNull();
    expect(serializeFinanceOverview(data, viewerFromMember(supporter), TODAY)).toBeNull();
  });

  it("the financial planner receives the overview with computed totals", () => {
    const view = serializeFinanceOverview(data, viewerFromMember(planner), TODAY);
    expect(view).not.toBeNull();
    expect(view!.goals.length).toBe(data.fundingGoals.length);
    expect(view!.totals.target).toBeGreaterThan(0);
  });

  it("shared preparation items never carry money fields, for anyone", () => {
    for (const member of data.members) {
      const viewer = viewerFromMember(member);
      for (const item of data.preparationItems) {
        const view = serializePreparationItem(item, viewer, data.fundingGoals);
        for (const key of MONEY_KEYS) expect(view).not.toHaveProperty(key);
        expect(JSON.stringify(view)).not.toMatch(/1200|6000|4500|3500/);
      }
    }
  });

  it("only finance viewers see the link to a goal — and only as an id", () => {
    const linkedItem = data.preparationItems.find((i) => i.id === "demo_pi_carseat")!;
    expect(serializePreparationItem(linkedItem, viewerFromMember(mother), data.fundingGoals).linkedGoalId).toBeUndefined();
    expect(serializePreparationItem(linkedItem, viewerFromMember(planner), data.fundingGoals).linkedGoalId).toBe("demo_g_carseat");
  });

  it("stripFinance removes every finance record for unauthorized viewers", () => {
    const stripped = stripFinance(data, viewerFromMember(mother));
    expect(stripped.fundingGoals).toEqual([]);
    expect(stripped.fundingContributions).toEqual([]);
    expect(stripped.recalculations).toEqual([]);
    expect(stripFinance(data, viewerFromMember(planner)).fundingGoals.length).toBe(data.fundingGoals.length);
  });

  it("private goals of another owner stay hidden unless the household shares finance", () => {
    const otherPlanner = { ...planner, id: "x", userId: "someone_else", permissions: permissionsForRoles(["financial_planner"]) };
    expect(visibleGoals(data, viewerFromMember(otherPlanner))).toEqual([]);
    const shared = { ...data, household: { ...data.household, settings: { ...data.household.settings, financeShared: true } } };
    expect(visibleGoals(shared, viewerFromMember(otherPlanner)).length).toBe(data.fundingGoals.length);
  });
});

describe("role changes update access", () => {
  it("granting financial_planner to the mother exposes finance; revoking hides it", () => {
    const granted = { ...mother, roles: [...mother.roles, "financial_planner" as const], permissions: permissionsForRoles([...mother.roles, "financial_planner"]) };
    const shared = { ...data, household: { ...data.household, settings: { ...data.household.settings, financeShared: true } } };
    expect(serializeFinanceOverview(shared, viewerFromMember(granted), TODAY)).not.toBeNull();
    const revoked = { ...granted, roles: ["mother" as const], permissions: permissionsForRoles(["mother"]) };
    expect(serializeFinanceOverview(shared, viewerFromMember(revoked), TODAY)).toBeNull();
  });

  it("other members' permissions are visible only to household managers", () => {
    expect(serializeMember(planner, viewerFromMember(supporter)).permissions).toEqual([]);
    expect(serializeMember(planner, viewerFromMember(mother)).permissions.length).toBeGreaterThan(0);
  });
});
