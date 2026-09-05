import { z } from "zod";
import { assertCan } from "@/domain/permissions";
import { commit, fail, ok, parseBody, withContext } from "@/server/http";
import { newId, nowIso } from "@/server/ids";
import { m } from "@/i18n";

type Params = { params: Promise<{ id: string }> };

/**
 * Coverage is a belief that needs verification. Either record "we verified
 * today" (with the belief the family formed) or create a verification task.
 * Nothing here ever asserts coverage as guaranteed.
 */
const schema = z.union([
  z.object({ action: z.literal("verified"), believedCovered: z.boolean() }),
  z.object({ action: z.literal("task") }),
]);

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "care:edit");
    const parsed = await parseBody(req, schema);
    if (!parsed.ok) return parsed.res;
    const hospital = ctx.data.hospitals.find((h) => h.id === id);
    if (!hospital) return fail("not_found", 404);
    const input = parsed.data;
    await commit(ctx, (data) => {
      const h = data.hospitals.find((x) => x.id === id)!;
      if (input.action === "verified") {
        h.insuranceBelievedCovered = input.believedCovered;
        h.insuranceLastVerifiedAt = ctx.today;
        for (const t of data.verificationTasks) if (t.relatedHospitalId === id) t.done = true;
      } else {
        data.verificationTasks.push({
          id: newId("vt"),
          householdId: data.household.id,
          subject: m.care.verificationTaskDefault(h.name),
          relatedHospitalId: id,
          relatedInsuranceId: data.insurance.find((i) => i.candidateHospitalIds.includes(id))?.id,
          done: false,
          createdAt: nowIso(),
        });
      }
      return data;
    });
    return ok({ ok: true });
  });
}
