import { postpartumTaskInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, postpartumTaskInputSchema);
    if (!parsed.ok) return parsed.res;
    const id = newId("ppt");
    await commit(ctx, (data) => {
      data.postpartumTasks.push({
        id,
        householdId: data.household.id,
        kind: parsed.data.kind,
        title: parsed.data.title,
        dueDate: parsed.data.dueDate,
        done: false,
        createdAt: new Date().toISOString(),
      });
      return data;
    });
    return ok({ ok: true, id });
  });
}
