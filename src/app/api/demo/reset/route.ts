import { NextResponse } from "next/server";
import { ensureDemoSeeded } from "@/server/demo";
import { getSession } from "@/server/session";

/** Re-seeds demo fixtures. Only meaningful inside a demo session. */
export async function POST() {
  const session = await getSession();
  if (!session || session.mode !== "demo") return NextResponse.json({ error: "not_demo" }, { status: 400 });
  await ensureDemoSeeded(true);
  return NextResponse.json({ ok: true });
}
