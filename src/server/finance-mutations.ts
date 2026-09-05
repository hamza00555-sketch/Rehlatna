import type { FundingGoal, HouseholdData, RecalculationExplanation } from "@/domain/types";
import { explainRecalculation, monthlyRequirement, targetCost } from "@/domain/finance";
import { m } from "@/i18n";
import { fmtCurrency } from "@/lib/format";
import { newId, nowIso } from "./ids";

/**
 * Every finance change produces an explanation record. Callers have already
 * verified permissions and explicit confirmation.
 */

export function describeGoalChange(previous: FundingGoal, next: FundingGoal, currency: string): { whatChanged: string; why: string } {
  const changes: string[] = [];
  const reasons: string[] = [];
  const prevTarget = targetCost(previous);
  const nextTarget = targetCost(next);
  if (nextTarget !== prevTarget) {
    changes.push(`${m.finance.expectedCost}: ${fmtCurrency(prevTarget, currency)} → ${fmtCurrency(nextTarget, currency)}`);
    reasons.push(nextTarget > prevTarget ? m.finance.reasons.priceIncrease : m.finance.reasons.priceDecrease);
  }
  if (next.fundedAmount !== previous.fundedAmount) {
    changes.push(`${m.finance.fundedAmount}: ${fmtCurrency(previous.fundedAmount, currency)} → ${fmtCurrency(next.fundedAmount, currency)}`);
    reasons.push(m.finance.reasons.contribution);
  }
  if (next.fundingDate !== previous.fundingDate) {
    changes.push(`${m.finance.fundingDate}: ${previous.fundingDate} → ${next.fundingDate}`);
    reasons.push(m.finance.reasons.fundingDate);
  }
  if (changes.length === 0) {
    changes.push(m.finance.reasons.other);
    reasons.push(m.finance.impactNone);
  }
  return { whatChanged: changes.join(" · "), why: [...new Set(reasons)].join(" ") };
}

export function recordExplanation(data: HouseholdData, previous: FundingGoal, next: FundingGoal, today: string, override?: { whatChanged: string; why: string }): RecalculationExplanation {
  const currency = data.household.settings.currencyCode;
  const described = override ?? describeGoalChange(previous, next, currency);
  const explanation = explainRecalculation({
    id: newId("rc"),
    previous,
    next,
    today,
    now: nowIso(),
    whatChanged: described.whatChanged,
    why: described.why,
  });
  data.recalculations.push(explanation);
  return explanation;
}

export function newGoalExplanation(data: HouseholdData, goal: FundingGoal, today: string): RecalculationExplanation {
  const currency = data.household.settings.currencyCode;
  const explanation: RecalculationExplanation = {
    id: newId("rc"),
    goalId: goal.id,
    householdId: goal.householdId,
    at: nowIso(),
    whatChanged: `${m.finance.reasons.newGoal} ${goal.name} — ${fmtCurrency(targetCost(goal), currency)}`,
    why: m.finance.reasons.newGoal,
    previousMonthly: 0,
    newMonthly: monthlyRequirement(goal, today),
    effectiveFundingDate: goal.fundingDate,
  };
  data.recalculations.push(explanation);
  return explanation;
}
