import { milestoneCreateSchema } from "@/schemas";
import { assertCan } from "@/domain/permissions";
import { commit, ok, parseBody, withContext } from "@/server/http";
import { newId } from "@/server/ids";

/** Manual (user) milestones — preserved forever; system ones are regenerated. */
export async function POST(req: Request) {
  return withContext(async (ctx) => {
    assertCan(ctx.viewer, "journey:edit");
    const parsed = await parseBody(req, milestoneCreateSchema);
    if (!parsed.ok) return parsed.res;
    const id = newId("ms");
    await commit(ctx, (data) => {
      data.milestones.push({ id, householdId: data.household.id, origin: "user", ...parsed.data });
      return data;
    });
    return ok({ ok: true, id });
  });
}
