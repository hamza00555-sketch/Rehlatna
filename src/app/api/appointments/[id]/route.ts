import { z } from "zod";
import { appointmentInputSchema, appointmentStatusSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.union([
  appointmentStatusSchema,
  appointmentInputSchema.partial(),
  z.object({ toggleTaskId: z.string().min(1) }),
]);

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "appointments:edit");
    const parsed = await parseBody(req, patchSchema);
    if (!parsed.ok) return parsed.res;
    const existing = ctx.data.appointments.find((a) => a.id === id);
    if (!existing) return fail("not_found", 404);
    const input = parsed.data;

    await commit(ctx, (data) => {
      const appt = data.appointments.find((a) => a.id === id)!;
      if ("toggleTaskId" in input) {
        const task = appt.preparationTasks.find((t) => t.id === input.toggleTaskId);
        if (task) task.done = !task.done;
      } else if ("status" in input && Object.keys(input).length === 1) {
        appt.status = input.status!;
      } else {
        const { preparationTasks, ...rest } = input as z.infer<typeof appointmentInputSchema>;
        Object.assign(appt, rest);
        if (preparationTasks) {
          appt.preparationTasks = preparationTasks.map((t) => ({ id: t.id ?? newId("tsk"), title: t.title, done: t.done }));
        }
      }
      return data;
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "appointments:edit");
    if (!ctx.data.appointments.some((a) => a.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.appointments = data.appointments.filter((a) => a.id !== id);
      return data;
    });
    return ok({ ok: true });
  });
}
