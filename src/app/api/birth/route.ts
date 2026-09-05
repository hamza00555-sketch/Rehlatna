import { birthConfirmSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { newId, nowIso } from "@/server/ids";
import { m } from "@/i18n";

/**
 * وصل صغيرنا — the explicit birth event. Never triggered by the due date.
 * Switches the lifecycle to postpartum, keeps every pregnancy record, and
 * seeds a short, generic postpartum task stack the family can edit.
 */
export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "journey:edit");
    const parsed = await parseBody(req, birthConfirmSchema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.pregnancy || !ctx.data.baby) return fail("no_pregnancy", 404);
    if (ctx.data.baby.birthDate) return fail("already_born", 409);
    if (parsed.data.birthDate > ctx.today) return fail("future_birth_date", 400);
    const input = parsed.data;

    await commit(ctx, (data) => {
      data.baby!.birthDate = input.birthDate;
      data.baby!.birthTime = input.birthTime;
      if (input.displayName) data.baby!.displayName = input.displayName;
      if (input.gender) data.baby!.gender = input.gender;
      data.pregnancy!.mode = "postpartum";
      if (data.postpartumTasks.length === 0) {
        for (const t of m.postpartumTasks.defaults) {
          data.postpartumTasks.push({
            id: newId("ppt"),
            householdId: data.household.id,
            kind: t.kind as (typeof data.postpartumTasks)[number]["kind"],
            title: t.title,
            done: false,
            createdAt: nowIso(),
          });
        }
      }
      return data;
    });
    return ok({ ok: true, redirect: "/journey/birth/confirmed" });
  });
}
