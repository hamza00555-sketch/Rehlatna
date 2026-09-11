import { NextResponse } from "next/server";
import { settingsSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, parseBody, withContext } from "@/server/http";
import { appearanceCookie } from "@/server/session";

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
    const next = await commit(ctx, (data) => {
      Object.assign(data.household.settings, input);
      return data;
    });
    const res = NextResponse.json({ ok: true });
    // Appearance is a device preference (see appearanceCookie): re-stamp it
    // on every save so the very next request reflects it regardless of
    // which store instance answers the household read.
    if (input.theme !== undefined || input.reduceMotion !== undefined) {
      res.cookies.set(
        appearanceCookie({ theme: next.household.settings.theme, reduceMotion: Boolean(next.household.settings.reduceMotion) }),
      );
    }
    return res;
  });
}
