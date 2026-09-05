import { redirect } from "next/navigation";
import { getContext } from "@/server/session";

/** Entry: route by lifecycle state. No session → setup; otherwise Today. */
export default async function RootPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy || ctx.data.pregnancy.mode === "setup") redirect("/onboarding");
  redirect("/today");
}
