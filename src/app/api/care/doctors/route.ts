import { careProviderInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, careProviderInputSchema);
    if (!parsed.ok) return parsed.res;
    const id = newId("dr");
    await commit(ctx, (data) => {
      data.careProviders.push({ id, householdId: data.household.id, ...parsed.data });
      return data;
    });
    return ok({ ok: true, id });
  });
}
