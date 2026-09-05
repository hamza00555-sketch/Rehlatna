import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, withContext } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "journey:edit");
    const existing = ctx.data.milestones.find((mm) => mm.id === id);
    if (!existing) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.milestones = data.milestones.filter((mm) => mm.id !== id);
      return data;
    });
    return ok({ ok: true });
  });
}
