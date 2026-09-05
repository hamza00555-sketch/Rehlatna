import { insuranceInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, insuranceInputSchema);
    if (!parsed.ok) return parsed.res;
    const id = newId("ins");
    await commit(ctx, (data) => {
      data.insurance.push({ id, householdId: data.household.id, ...parsed.data });
      return data;
    });
    return ok({ ok: true, id });
  });
}
