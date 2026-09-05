import { birthPlanInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId, nowIso } from "@/server/ids";

export async function PUT(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, birthPlanInputSchema);
    if (!parsed.ok) return parsed.res;
    await commit(ctx, (data) => {
      if (data.birthPlan) Object.assign(data.birthPlan, parsed.data, { updatedAt: nowIso() });
      else data.birthPlan = { id: newId("bp"), householdId: data.household.id, ...parsed.data, updatedAt: nowIso() };
      return data;
    });
    return ok({ ok: true });
  });
}
