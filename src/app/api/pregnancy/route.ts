import { dueDateUpdateSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { pregnancyProgress } from "@/domain/pregnancy";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { nowIso } from "@/server/ids";

/**
 * Due-date edits are never silent: the previous value is kept in history and
 * the response explains how the displayed week changed. Appointments and
 * user milestones are untouched.
 */
export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "journey:edit");
    const parsed = await parseBody(req, dueDateUpdateSchema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.pregnancy) return fail("no_pregnancy", 404);

    const previous = ctx.data.pregnancy.dueDate;
    const next = parsed.data.dueDate;
    if (previous === next) return ok({ ok: true, changed: false });

    await commit(ctx, (data) => {
      data.pregnancy!.dueDate = next;
      data.pregnancy!.dueDateHistory.push({ previous, next, changedAt: nowIso() });
      return data;
    });

    return ok({
      ok: true,
      changed: true,
      weekBefore: pregnancyProgress(previous, ctx.today).week,
      weekAfter: pregnancyProgress(next, ctx.today).week,
    });
  });
}
