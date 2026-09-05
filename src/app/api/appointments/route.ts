import { appointmentInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "appointments:edit");
    const parsed = await parseBody(req, appointmentInputSchema);
    if (!parsed.ok) return parsed.res;
    const id = newId("apt");
    await commit(ctx, (data) => {
      data.appointments.push({
        id,
        householdId: data.household.id,
        ...parsed.data,
        preparationTasks: parsed.data.preparationTasks.map((t) => ({ id: t.id ?? newId("tsk"), title: t.title, done: t.done })),
        status: "upcoming",
      });
      return data;
    });
    return ok({ ok: true, id });
  });
}
