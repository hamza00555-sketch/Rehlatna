import { verificationTaskInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId, nowIso } from "@/server/ids";

export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, verificationTaskInputSchema);
    if (!parsed.ok) return parsed.res;
    const id = newId("vt");
    await commit(ctx, (data) => {
      data.verificationTasks.push({ id, householdId: data.household.id, ...parsed.data, done: false, createdAt: nowIso() });
      return data;
    });
    return ok({ ok: true, id });
  });
}
