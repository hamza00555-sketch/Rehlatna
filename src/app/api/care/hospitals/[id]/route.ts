import { hospitalInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, hospitalInputSchema.partial());
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.hospitals.some((h) => h.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      Object.assign(data.hospitals.find((h) => h.id === id)!, parsed.data);
      return data;
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    if (!ctx.data.hospitals.some((h) => h.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.hospitals = data.hospitals.filter((h) => h.id !== id);
      for (const a of data.appointments) if (a.hospitalId === id) a.hospitalId = undefined;
      for (const d of data.careProviders) if (d.hospitalId === id) d.hospitalId = undefined;
      for (const i of data.insurance) i.candidateHospitalIds = i.candidateHospitalIds.filter((x) => x !== id);
      if (data.birthPlan?.hospitalId === id) data.birthPlan.hospitalId = undefined;
      return data;
    });
    return ok({ ok: true });
  });
}
