import { healthUpdateSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

/** Facts about the pregnancy that unlock conditional guidance. Never inferred. */
export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "journey:edit");
    const parsed = await parseBody(req, healthUpdateSchema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.pregnancy) return fail("no_pregnancy", 404);
    await commit(ctx, (data) => {
      data.pregnancy!.rhNegative = parsed.data.rhNegative;
      return data;
    });
    return ok({ ok: true });
  });
}
