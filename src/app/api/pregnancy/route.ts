import { datingInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { pregnancyProgress, resolveDating } from "@/domain/pregnancy";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { nowIso } from "@/server/ids";

/**
 * Due-date edits are never silent: the previous value is kept in history and
 * the response explains how the displayed week changed. Appointments and
 * user milestones are untouched. The client sends the dating method + raw
 * value (LMP or a clinician-confirmed date); `dueDate` is always re-derived
 * and validated here, never trusted from the client.
 */
export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "journey:edit");
    const parsed = await parseBody(req, datingInputSchema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.pregnancy) return fail("no_pregnancy", 404);

    const resolved = resolveDating(parsed.data, ctx.today);
    if (!resolved.ok) return fail(resolved.error, 400);

    const pregnancy = ctx.data.pregnancy;
    const previous = pregnancy.dueDate;
    const { dueDate: next, datingMethod, lastPeriodStartDate } = resolved.value;
    const dueDateChanged = previous !== next;
    const metadataChanged = pregnancy.datingMethod !== datingMethod || pregnancy.lastPeriodStartDate !== lastPeriodStartDate;
    if (!dueDateChanged && !metadataChanged) return ok({ ok: true, changed: false });

    await commit(ctx, (data) => {
      data.pregnancy!.dueDate = next;
      data.pregnancy!.datingMethod = datingMethod;
      data.pregnancy!.lastPeriodStartDate = lastPeriodStartDate;
      if (dueDateChanged) data.pregnancy!.dueDateHistory.push({ previous, next, changedAt: nowIso() });
      return data;
    });

    if (!dueDateChanged) return ok({ ok: true, changed: false });
    return ok({
      ok: true,
      changed: true,
      weekBefore: pregnancyProgress(previous, ctx.today).week,
      weekAfter: pregnancyProgress(next, ctx.today).week,
    });
  });
}
