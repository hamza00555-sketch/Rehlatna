import { ultrasoundInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "appointments:edit");
    const parsed = await parseBody(req, ultrasoundInputSchema.partial());
    if (!parsed.ok) return parsed.res;
    if (!ctx.data.ultrasounds.some((u) => u.id === id)) return fail("not_found", 404);
    await commit(ctx, (data) => {
      Object.assign(data.ultrasounds.find((u) => u.id === id)!, parsed.data);
      return data;
    });
    return ok({ ok: true });
  });
}
