import { fundingGoalUpdateSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { goalVisibleTo } from "@/server/serializers";
import { recordExplanation } from "@/server/finance-mutations";

type Params = { params: Promise<{ id: string }> };

/**
 * Updates require `confirmed: true` (enforced by the schema) — the client
 * shows the recalculation impact and the user confirms before this runs.
 */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "finance:edit");
    const goal = ctx.data.fundingGoals.find((g) => g.id === id);
    if (!goal || !goalVisibleTo(goal, ctx.viewer, ctx.data.household.settings.financeShared)) return fail("not_found", 404);
    const parsed = await parseBody(req, fundingGoalUpdateSchema);
    if (!parsed.ok) return parsed.res;
    const { confirmed: _confirmed, ...changes } = parsed.data;

    let explanationId: string | null = null;
    await commit(ctx, (data) => {
      const current = data.fundingGoals.find((g) => g.id === id)!;
      const previous = { ...current };
      Object.assign(current, changes);
      explanationId = recordExplanation(data, previous, current, ctx.today).id;
      return data;
    });
    return ok({ ok: true, explanationId });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "finance:edit");
    const goal = ctx.data.fundingGoals.find((g) => g.id === id);
    if (!goal || !goalVisibleTo(goal, ctx.viewer, ctx.data.household.settings.financeShared)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.fundingGoals = data.fundingGoals.filter((g) => g.id !== id);
      data.fundingContributions = data.fundingContributions.filter((c) => c.goalId !== id);
      data.recalculations = data.recalculations.filter((r) => r.goalId !== id);
      return data;
    });
    return ok({ ok: true });
  });
}
