import { datingInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { pregnancyProgress, resolveDating, validateClinicianDueDate } from "@/domain/pregnancy";
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

    // A pregnancy already underway may edit its clinician-confirmed date within
    // -14..+294 days of today (onboarding, dating a pregnancy from scratch, is stricter).
    if (parsed.data.datingMethod === "clinician") {
      const clinicianError = validateClinicianDueDate(parsed.data.dueDate, ctx.today);
      if (clinicianError) return fail(clinicianError, 400);
    }

    const resolved = resolveDating(parsed.data, ctx.today);
    if (!resolved.ok) return fail(resolved.error, 400);
    const { dueDate: next, datingMethod, lastPeriodStartDate } = resolved.value;

    // Fast path: a true no-op (checked against the snapshot this request already
    // holds) skips the write entirely — no version bump, no history entry.
    const snapshot = ctx.data.pregnancy;
    if (snapshot.dueDate === next && snapshot.datingMethod === datingMethod && snapshot.lastPeriodStartDate === lastPeriodStartDate) {
      return ok({ saved: false, dueDateChanged: false });
    }

    // For an actual write, previous/dueDateChanged/saved are recomputed on every
    // compare-and-set retry (see commit()) from whichever read actually won,
    // never from the snapshot above — otherwise a concurrent edit A→B landing
    // mid-retry would make this request record A→C in history instead of B→C.
    let previous = "";
    let dueDateChanged = false;
    let saved = false;
    await commit(ctx, (data) => {
      const pregnancy = data.pregnancy!;
      previous = pregnancy.dueDate;
      dueDateChanged = previous !== next;
      const metadataChanged = pregnancy.datingMethod !== datingMethod || pregnancy.lastPeriodStartDate !== lastPeriodStartDate;
      saved = dueDateChanged || metadataChanged;
      if (!saved) return data;
      pregnancy.dueDate = next;
      pregnancy.datingMethod = datingMethod;
      pregnancy.lastPeriodStartDate = lastPeriodStartDate;
      if (dueDateChanged) pregnancy.dueDateHistory.push({ previous, next, changedAt: nowIso() });
      return data;
    });

    if (!saved) return ok({ saved: false, dueDateChanged: false });
    if (!dueDateChanged) return ok({ saved: true, dueDateChanged: false });
    return ok({
      saved: true,
      dueDateChanged: true,
      weekBefore: pregnancyProgress(previous, ctx.today).week,
      weekAfter: pregnancyProgress(next, ctx.today).week,
    });
  });
}
