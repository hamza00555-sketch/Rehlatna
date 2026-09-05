import { careProviderInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, careProviderInputSchema.partial());
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.careProviders.some((d) => d.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      Object.assign(data.careProviders.find((d) => d.id === id)!, parsed.data);
      return data;
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    if (!ctx.data.careProviders.some((d) => d.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.careProviders = data.careProviders.filter((d) => d.id !== id);
      for (const a of data.appointments) if (a.doctorId === id) a.doctorId = undefined;
      if (data.birthPlan?.doctorId === id) data.birthPlan.doctorId = undefined;
      return data;
    });
    return ok({ ok: true });
  });
}
