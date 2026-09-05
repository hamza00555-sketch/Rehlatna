import { fundingGoalInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { newId, nowIso } from "@/server/ids";
import { newGoalExplanation } from "@/server/finance-mutations";

/** Creates a funding goal owned by the requesting planner. */
export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "finance:edit");
    if (!ctx.data.household.settings.financeEnabled) return fail("finance_disabled", 409);
    const parsed = await parseBody(req, fundingGoalInputSchema);
    if (!parsed.ok) return parsed.res;
    const input = parsed.data;
    if (input.preparationItemId && !ctx.data.preparationItems.some((i) => i.id === input.preparationItemId)) {
      return fail("unknown_item", 404);
    }
    const id = newId("goal");
    await commit(ctx, (data) => {
      const goal = {
        id,
        householdId: data.household.id,
        ...input,
        ownerUserId: ctx.viewer.userId,
        createdAt: nowIso(),
      };
      data.fundingGoals.push(goal);
      newGoalExplanation(data, goal, ctx.today);
      return data;
    });
    return ok({ ok: true, id });
  });
}
