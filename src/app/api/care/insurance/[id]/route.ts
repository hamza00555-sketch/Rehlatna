import { insuranceInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, insuranceInputSchema.partial());
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.insurance.some((i) => i.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      Object.assign(data.insurance.find((i) => i.id === id)!, parsed.data);
      return data;
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    if (!ctx.data.insurance.some((i) => i.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.insurance = data.insurance.filter((i) => i.id !== id);
      if (data.birthPlan?.insuranceId === id) data.birthPlan.insuranceId = undefined;
      return data;
    });
    return ok({ ok: true });
  });
}
