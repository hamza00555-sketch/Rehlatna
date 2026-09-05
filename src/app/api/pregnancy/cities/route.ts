import { citiesUpdateSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

/** Follow-up city and delivery city are independent fields. */
export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "journey:edit");
    const parsed = await parseBody(req, citiesUpdateSchema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.pregnancy) return fail("no_pregnancy", 404);
    await commit(ctx, (data) => {
      data.pregnancy!.followUpCity = parsed.data.followUpCity;
      data.pregnancy!.deliveryCity = parsed.data.deliveryCity;
      return data;
    });
    return ok({ ok: true });
  });
}
