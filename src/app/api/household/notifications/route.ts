import { notificationPreferenceSchema } from "@/schemas";
import { commit, ok, parseBody, withContext } from "@/server/http";

/** Each member manages their own notification preferences. */
export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    const parsed = await parseBody(req, notificationPreferenceSchema);
    if (!parsed.ok) return parsed.res;
    await commit(ctx, (data) => {
      const existing = data.notificationPreferences.find((n) => n.memberId === ctx.viewer.memberId);
      if (existing) Object.assign(existing, parsed.data);
      else data.notificationPreferences.push({ id: `np_${ctx.viewer.memberId}`, householdId: data.household.id, memberId: ctx.viewer.memberId, ...parsed.data });
      return data;
    });
    return ok({ ok: true });
  });
}
