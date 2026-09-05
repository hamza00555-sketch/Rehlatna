import { preparationItemInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { nowIso } from "@/server/ids";

type Params = { params: Promise<{ id: string }> };

/** Partial update — status changes, hospital-bag flag, or a full edit. */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "preparation:edit");
    const parsed = await parseBody(req, preparationItemInputSchema.partial());
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.preparationItems.some((i) => i.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      const item = data.preparationItems.find((i) => i.id === id)!;
      Object.assign(item, parsed.data, { updatedAt: nowIso() });
      return data;
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "preparation:edit");
    if (!ctx.data.preparationItems.some((i) => i.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      data.preparationItems = data.preparationItems.filter((i) => i.id !== id);
      // A linked goal keeps its money data but loses the link.
      for (const g of data.fundingGoals) if (g.preparationItemId === id) g.preparationItemId = undefined;
      return data;
    });
    return ok({ ok: true });
  });
}
