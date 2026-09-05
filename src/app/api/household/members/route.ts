import { memberInputSchema } from "@/schemas";
import { assertCan, permissionsForRoles } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId, nowIso } from "@/server/ids";

export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "household:manage");
    const parsed = await parseBody(req, memberInputSchema);
    if (!parsed.ok) return parsed.res;
    const memberId = newId("mem");
    const userId = newId("usr");
    await commit(ctx, (data) => {
      data.users.push({ id: userId, displayName: parsed.data.displayName, createdAt: nowIso() });
      data.members.push({
        id: memberId,
        householdId: data.household.id,
        userId,
        displayName: parsed.data.displayName,
        roles: parsed.data.roles,
        permissions: permissionsForRoles(parsed.data.roles),
      });
      data.notificationPreferences.push({ id: `np_${memberId}`, householdId: data.household.id, memberId, appointments: true, weeklyUpdate: true, preparation: true, finance: false });
      return data;
    });
    return ok({ ok: true, id: memberId });
  });
}
