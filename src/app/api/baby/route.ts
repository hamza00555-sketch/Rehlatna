import { z } from "zod";
import { babyNameSchema, genderUpdateSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

const schema = z.union([genderUpdateSchema, babyNameSchema]);

/** Optional gender recording and optional name — both reversible. */
export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "journey:edit");
    const parsed = await parseBody(req, schema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.baby) return fail("no_baby", 404);
    const input = parsed.data;
    await commit(ctx, (data) => {
      if ("gender" in input) data.baby!.gender = input.gender;
      if ("displayName" in input) data.baby!.displayName = input.displayName?.trim() ? input.displayName.trim() : null;
      return data;
    });
    return ok({ ok: true });
  });
}
