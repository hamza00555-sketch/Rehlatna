import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { getAuthUser } from "@/server/supabase";

/** Entry: route by lifecycle state. No session → setup; otherwise Today. */
export default async function RootPage() {
  const ctx = await getContext();
  if (!ctx && (await getAuthUser())) redirect("/onboarding/start");
  if (!ctx || !ctx.data.pregnancy || ctx.data.pregnancy.mode === "setup") redirect("/onboarding");
  redirect("/today");
}
