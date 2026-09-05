import { settingsSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";

/**
 * Household settings. Appearance/motion/product name need household:manage;
 * finance switches additionally require finance:edit.
 */
export async function PATCH(req: Request) {
  return withContext(async (ctx) => {
    const parsed = await parseBody(req, settingsSchema);
    if (!parsed.ok) return parsed.res;
    const input = parsed.data;
    if (input.financeEnabled !== undefined || input.financeShared !== undefined) assertCan(ctx.viewer, "finance:edit");
    if (input.productName !== undefined || input.currencyCode !== undefined) assertCan(ctx.viewer, "household:manage");
    await commit(ctx, (data) => {
      Object.assign(data.household.settings, input);
      return data;
    });
    return ok({ ok: true });
  });
}
