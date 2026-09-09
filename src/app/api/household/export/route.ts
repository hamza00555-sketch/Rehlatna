import { NextResponse } from "next/server";
import { exportHouseholdView } from "@/server/serializers";
import { withContext } from "@/server/http";

/** A copy of the household data the requesting member is allowed to see. */
export async function GET() {
  return withContext(async (ctx) => {
    const data = exportHouseholdView(ctx.data, ctx.viewer);
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), viewer: ctx.viewer.memberId, data }, null, 2);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="household-${ctx.data.household.id}.json"`,
      },
    });
  });
}
