import { z } from "zod";
import { travelPlanInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

/** One travel plan per household (follow-up city → delivery city). */
export async function PUT(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, travelPlanInputSchema);
    if (!parsed.ok) return parsed.res;
    const input = parsed.data;
    let id = ctx.data.travelPlans[0]?.id;
    await commit(ctx, (data) => {
      const tasks = input.tasks.map((t) => ({ id: t.id ?? newId("ttk"), title: t.title, done: t.done }));
      const existing = data.travelPlans[0];
      if (existing) {
        Object.assign(existing, { ...input, tasks });
      } else {
        id = newId("trv");
        data.travelPlans.push({ id, householdId: data.household.id, ...input, tasks });
      }
      return data;
    });
    return ok({ ok: true, id });
  });
}

const toggleSchema = z.object({ toggleTaskId: z.string().min(1) });

export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, toggleSchema);
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.travelPlans[0]) return fail("not_found", 404);
    await commit(ctx, (data) => {
      const task = data.travelPlans[0]?.tasks.find((t) => t.id === parsed.data.toggleTaskId);
      if (task) task.done = !task.done;
      return data;
    });
    return ok({ ok: true });
  });
}

export async function DELETE() {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    await commit(ctx, (data) => {
      data.travelPlans = [];
      return data;
    });
    return ok({ ok: true });
  });
}
