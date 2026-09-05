import { z } from "zod";
import { memberPermissionsSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

const schema = z.union([memberPermissionsSchema, z.object({ displayName: z.string().trim().min(1).max(120) })]);

/** Role/permission changes take effect immediately for the member's next request. */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    const parsed = await parseBody(req, schema);
    if (!parsed.ok) return parsed.res;
    const target = ctx.data.members.find((mm) => mm.id === id);
    if (!target) return fail("not_found", 404);
    const input = parsed.data;
    const isSelf = target.id === ctx.viewer.memberId;
    if ("roles" in input) {
      assertCan(ctx.viewer, "household:manage");
      if (isSelf && !input.permissions.includes("household:manage")) return fail("cannot_remove_own_manage", 409);
    } else if (!isSelf) {
      assertCan(ctx.viewer, "household:manage");
    }
    await commit(ctx, (data) => {
      const member = data.members.find((mm) => mm.id === id)!;
      if ("roles" in input) {
        member.roles = input.roles;
        member.permissions = input.permissions;
      } else {
        member.displayName = input.displayName;
        const user = data.users.find((u) => u.id === member.userId);
        if (user) user.displayName = input.displayName;
      }
      return data;
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "household:manage");
    if (id === ctx.viewer.memberId) return fail("cannot_remove_self", 409);
    if (!ctx.data.members.some((mm) => mm.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.members = data.members.filter((mm) => mm.id !== id);
      data.notificationPreferences = data.notificationPreferences.filter((n) => n.memberId !== id);
      return data;
    });
    return ok({ ok: true });
  });
}
