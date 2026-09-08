import { redirect } from "next/navigation";
import { todayIso } from "@/domain/dates";
import { getSession } from "@/server/session";
import { getAuthUser, supabaseConfigured } from "@/server/supabase";
import { OnboardingFlow } from "./OnboardingFlow";

export const metadata = { title: "البداية" };

/** With Supabase, a signed-in user is required before a household is created. */
export default async function OnboardingStartPage() {
  if (supabaseConfigured()) {
    if (await getSession()) redirect("/today");
    if (!(await getAuthUser())) redirect("/auth");
  }
  return <OnboardingFlow today={todayIso()} />;
}
