import { feedingPreferenceSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

/**
 * One feeding preference per household. Any combination of methods is valid,
 * including none; nothing is assumed on the family's behalf.
 */
export async function PUT(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, feedingPreferenceSchema);
    if (!parsed.ok) return parsed.res;
    const input = parsed.data;
    const now = new Date().toISOString();
    let id = ctx.data.feedingPreference?.id;
    await commit(ctx, (data) => {
      if (data.feedingPreference) {
        data.feedingPreference.methods = input.methods;
        data.feedingPreference.notes = input.notes;
        data.feedingPreference.updatedAt = now;
      } else {
        id = newId("fp");
        data.feedingPreference = { id, householdId: data.household.id, methods: input.methods, notes: input.notes, updatedAt: now };
      }
      return data;
    });
    return ok({ ok: true, id });
  });
}

export async function DELETE() {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    await commit(ctx, (data) => {
      data.feedingPreference = null;
      return data;
    });
    return ok({ ok: true });
  });
}
