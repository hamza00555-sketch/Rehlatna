import { hospitalInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, hospitalInputSchema);
    if (!parsed.ok) return parsed.res;
    const id = newId("hosp");
    await commit(ctx, (data) => {
      data.hospitals.push({ id, householdId: data.household.id, ...parsed.data });
      return data;
    });
    return ok({ ok: true, id });
  });
}
