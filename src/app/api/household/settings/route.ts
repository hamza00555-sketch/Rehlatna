import { NextResponse } from "next/server";
import { settingsSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, parseBody, withContext } from "@/server/http";
import { appearanceCookie, readAppearanceCookie, resolveAppearance } from "@/server/session";

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
    // Read the incoming appearance cookie before commit(): on a stale store
    // instance (see appearanceCookie's doc comment), the household's own
    // theme/reduceMotion can lag behind what the browser already carries.
    // Merging a partial change onto that stale snapshot would silently
    // revert the untouched field; merging onto the cookie itself cannot.
    const currentAppearance = (await readAppearanceCookie()) ?? undefined;
    const next = await commit(ctx, (data) => {
      Object.assign(data.household.settings, input);
      return data;
    });
    const res = NextResponse.json({ ok: true });
    if (input.theme !== undefined || input.reduceMotion !== undefined) {
      const base = currentAppearance ?? resolveAppearance(next.household.settings, null);
      res.cookies.set(appearanceCookie({ theme: input.theme ?? base.theme, reduceMotion: input.reduceMotion ?? base.reduceMotion }));
    }
    return res;
  });
}
