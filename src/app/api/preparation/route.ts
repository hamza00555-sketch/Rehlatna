import { z } from "zod";
import { preparationItemInputSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId, nowIso } from "@/server/ids";
import { m } from "@/i18n";

const schema = z.union([preparationItemInputSchema, z.object({ suggested: z.literal(true) })]);

/** Creates one item, or seeds the suggested starter list (all `undecided`). */
export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "preparation:edit");
    const parsed = await parseBody(req, schema);
    if (!parsed.ok) return parsed.res;
    const input = parsed.data;
    const now = nowIso();

    if ("suggested" in input) {
      const existing = new Set(ctx.data.preparationItems.map((i) => i.title));
      const added: string[] = [];
      await commit(ctx, (data) => {
        for (const s of m.preparation.suggested) {
          if (existing.has(s.title)) continue;
          const id = newId("prep");
          added.push(id);
          data.preparationItems.push({
            id,
            householdId: data.household.id,
            category: s.category as (typeof data.preparationItems)[number]["category"],
            title: s.title,
            status: "undecided",
            size: s.size,
            inHospitalBag: s.category === "hospital",
            updatedAt: now,
          });
        }
        return data;
      });
      return ok({ ok: true, added: added.length });
    }

    const id = newId("prep");
    await commit(ctx, (data) => {
      data.preparationItems.push({ id, householdId: data.household.id, ...input, updatedAt: now });
      return data;
    });
    return ok({ ok: true, id });
  });
}
