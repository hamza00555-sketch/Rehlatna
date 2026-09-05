import { taskDoneSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, taskDoneSchema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.postpartumTasks.some((t) => t.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.postpartumTasks.find((t) => t.id === id)!.done = parsed.data.done;
      return data;
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    if (!ctx.data.postpartumTasks.some((t) => t.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.postpartumTasks = data.postpartumTasks.filter((t) => t.id !== id);
      return data;
    });
    return ok({ ok: true });
  });
}
