import { z } from "zod";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { newId, nowIso } from "@/server/ids";
import { m } from "@/i18n";

type Params = { params: Promise<{ id: string }> };

const schema = z.union([z.object({ action: z.literal("verified") }), z.object({ action: z.literal("task") })]);

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, schema);
    if (!parsed.ok) return parsed.res;
    const record = ctx.data.insurance.find((i) => i.id === id);
    if (!record) return fail("not_found", 404);
    await commit(ctx, (data) => {
      const ins = data.insurance.find((i) => i.id === id)!;
      if (parsed.data.action === "verified") {
        ins.lastVerifiedAt = ctx.today;
        for (const t of data.verificationTasks) if (t.relatedInsuranceId === id && !t.relatedHospitalId) t.done = true;
      } else {
        data.verificationTasks.push({
          id: newId("vt"),
          householdId: data.household.id,
          subject: m.care.verificationTaskDefault(ins.provider),
          relatedInsuranceId: id,
          done: false,
          createdAt: nowIso(),
        });
      }
      return data;
    });
    return ok({ ok: true });
  });
}
