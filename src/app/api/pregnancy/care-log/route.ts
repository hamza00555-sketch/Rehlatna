import { careLogSchema } from "@/schemas";
import { CARE_WINDOW_BY_KEY } from "@/domain/careWindows";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

/** Records what the family did about a recommended care window (or clears it). */
export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "appointments:edit");
    const parsed = await parseBody(req, careLogSchema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.pregnancy) return fail("no_pregnancy", 404);
    if (!CARE_WINDOW_BY_KEY.has(parsed.data.key)) return fail("unknown_window", 404);
    const { key, state } = parsed.data;
    await commit(ctx, (data) => {
      const log = { ...(data.pregnancy!.careLog ?? {}) };
      if (state) log[key] = { state, at: ctx.today };
      else delete log[key];
      data.pregnancy!.careLog = log;
      return data;
    });
    return ok({ ok: true });
  });
}
