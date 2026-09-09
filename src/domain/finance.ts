import type { FundingGoal, IsoDate, RecalculationExplanation } from "./types";
import { monthDiff } from "./dates";

/**
 * Funding math. THE rule: every savings calculation uses `fundingDate`.
 * `spendingDate` is descriptive and never enters a calculation.
 *
 * Date-boundary behaviour (documented and tested):
 * - Contribution periods are calendar months counted from the month of
 *   `today` through the month of `fundingDate`, inclusive on both ends:
 *   due today or later this month → 1 period; next month → 2.
 * - A funding date in a past month still yields 1 period (the remainder is
 *   due now) and the goal is flagged `overdue`.
 * - A fully funded goal has remaining 0 and monthly requirement 0.
 * - Monthly requirement = ceil(remaining / periods) in whole currency units.
 */

export function targetCost(goal: Pick<FundingGoal, "actualCost" | "expectedCost">): number {
  return goal.actualCost ?? goal.expectedCost ?? 0;
}

export function remainingAmount(
  goal: Pick<FundingGoal, "actualCost" | "expectedCost" | "fundedAmount">,
): number {
  return Math.max(targetCost(goal) - goal.fundedAmount, 0);
}

export function contributionPeriods(today: IsoDate, fundingDate: IsoDate): number {
  return Math.max(1, monthDiff(today, fundingDate) + 1);
}

export function monthlyRequirement(
  goal: Pick<FundingGoal, "actualCost" | "expectedCost" | "fundedAmount" | "fundingDate">,
  today: IsoDate,
): number {
  const remaining = remainingAmount(goal);
  if (remaining === 0) return 0;
  return Math.ceil(remaining / contributionPeriods(today, goal.fundingDate));
}

export type GoalFundingState = "complete" | "overdue" | "attention" | "on_track" | "not_started";

/**
 * "On track" is a claim about progress, so it needs at least one contribution
 * behind it; a goal with time left and nothing saved is simply "not started".
 */
export function goalState(goal: FundingGoal, today: IsoDate): GoalFundingState {
  if (remainingAmount(goal) === 0) return "complete";
  const diff = monthDiff(today, goal.fundingDate);
  if (diff < 0) return "overdue";
  if (diff === 0) return "attention";
  return goal.fundedAmount > 0 ? "on_track" : "not_started";
}

export interface GoalComputed {
  target: number;
  remaining: number;
  funded: number;
  periods: number;
  monthly: number;
  state: GoalFundingState;
  ratio: number;
}

export function computeGoal(goal: FundingGoal, today: IsoDate): GoalComputed {
  const target = targetCost(goal);
  return {
    target,
    remaining: remainingAmount(goal),
    funded: goal.fundedAmount,
    periods: contributionPeriods(today, goal.fundingDate),
    monthly: monthlyRequirement(goal, today),
    state: goalState(goal, today),
    ratio: target === 0 ? 0 : Math.min(1, goal.fundedAmount / target),
  };
}

export interface FinanceTotals {
  target: number;
  funded: number;
  remaining: number;
  monthly: number;
  ratio: number;
  attention: boolean;
}

export function computeTotals(goals: FundingGoal[], today: IsoDate): FinanceTotals {
  let target = 0;
  let funded = 0;
  let monthly = 0;
  let attention = false;
  for (const goal of goals) {
    const t = targetCost(goal);
    target += t;
    funded += Math.min(goal.fundedAmount, t);
    monthly += monthlyRequirement(goal, today);
    const state = goalState(goal, today);
    if (state === "overdue" || state === "attention") attention = true;
  }
  return {
    target,
    funded,
    remaining: Math.max(target - funded, 0),
    monthly,
    ratio: target === 0 ? 0 : Math.min(1, funded / target),
    attention,
  };
}

export function totalsByPhase(goals: FundingGoal[]) {
  const phases = { before_birth: 0, at_birth: 0, after_birth: 0 } as Record<
    FundingGoal["phase"],
    number
  >;
  const funded = { before_birth: 0, at_birth: 0, after_birth: 0 } as Record<
    FundingGoal["phase"],
    number
  >;
  for (const goal of goals) {
    const t = targetCost(goal);
    phases[goal.phase] += t;
    funded[goal.phase] += Math.min(goal.fundedAmount, t);
  }
  return (["before_birth", "at_birth", "after_birth"] as const).map((phase) => ({
    phase,
    target: phases[phase],
    funded: funded[phase],
    ratio: phases[phase] === 0 ? 0 : funded[phase] / phases[phase],
  }));
}

/**
 * Builds the mandatory explanation for a goal change. Callers apply the
 * change only after explicit confirmation, then persist this record.
 */
export function explainRecalculation(args: {
  id: string;
  previous: FundingGoal;
  next: FundingGoal;
  today: IsoDate;
  now: string;
  whatChanged: string;
  why: string;
}): RecalculationExplanation {
  const { id, previous, next, today, now, whatChanged, why } = args;
  return {
    id,
    goalId: next.id,
    householdId: next.householdId,
    at: now,
    whatChanged,
    why,
    previousMonthly: monthlyRequirement(previous, today),
    newMonthly: monthlyRequirement(next, today),
    effectiveFundingDate: next.fundingDate,
  };
}
