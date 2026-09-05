import { todayIso } from "@/domain/dates";
import { DEMO_DEFAULT_MEMBER, DEMO_HOUSEHOLD_FRESH, DEMO_HOUSEHOLD_POSTPARTUM, DEMO_HOUSEHOLD_PREGNANCY, demoHouseholds } from "@/fixtures/demo";
import { demoHasData, resetDemoState } from "./store";
import type { Session } from "./session";

export type DemoScenario = "pregnancy" | "postpartum" | "fresh";

export async function ensureDemoSeeded(force = false): Promise<void> {
  if (force || !(await demoHasData())) resetDemoState(demoHouseholds(todayIso()));
}

export function demoSession(scenario: DemoScenario): Session {
  const householdId = scenario === "postpartum" ? DEMO_HOUSEHOLD_POSTPARTUM : scenario === "fresh" ? DEMO_HOUSEHOLD_FRESH : DEMO_HOUSEHOLD_PREGNANCY;
  return { householdId, memberId: DEMO_DEFAULT_MEMBER[householdId]!, mode: "demo" };
}
