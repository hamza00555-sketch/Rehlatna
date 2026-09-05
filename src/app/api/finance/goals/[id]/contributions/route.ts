import { contributionInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";
import { goalVisibleTo } from "@/server/serializers";
import { recordExplanation } from "@/server/finance-mutations";
import { fmtCurrency } from "@/lib/format";
import { m } from "@/i18n";

type Params = { params: Promise<{ id: string }> };

/** Adds a confirmed contribution; the goal's funded amount and explanation update together. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "finance:edit");
    const goal = ctx.data.fundingGoals.find((g) => g.id === id);
    if (!goal || !goalVisibleTo(goal, ctx.viewer, ctx.data.household.settings.financeShared)) return fail("not_found", 404);
    const parsed = await parseBody(req, contributionInputSchema);
    if (!parsed.ok) return parsed.res;
    const { confirmed: _confirmed, ...input } = parsed.data;
    const currency = ctx.data.household.settings.currencyCode;

    await commit(ctx, (data) => {
      const current = data.fundingGoals.find((g) => g.id === id)!;
      const previous = { ...current };
      data.fundingContributions.push({ id: newId("ctr"), goalId: id, householdId: data.household.id, ...input });
      current.fundedAmount = Math.round((current.fundedAmount + input.amount) * 100) / 100;
      recordExplanation(data, previous, current, ctx.today, {
        whatChanged: `${m.finance.addContribution}: ${fmtCurrency(input.amount, currency)}`,
        why: m.finance.reasons.contribution,
      });
      return data;
    });
    return ok({ ok: true });
  });
}
