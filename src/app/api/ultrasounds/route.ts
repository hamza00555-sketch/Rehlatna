import { ultrasoundInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "appointments:edit");
    const parsed = await parseBody(req, ultrasoundInputSchema);
    if (!parsed.ok) return parsed.res;
    const id = newId("us");
    await commit(ctx, (data) => {
      data.ultrasounds.push({ id, householdId: data.household.id, ...parsed.data, mediaAssetIds: [] });
      return data;
    });
    return ok({ ok: true, id });
  });
}
