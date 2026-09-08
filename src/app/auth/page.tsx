import { redirect } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { SignIn } from "@/components/auth/SignIn";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { getSession } from "@/server/session";
import { getAuthUser, supabaseConfigured } from "@/server/supabase";
import { m } from "@/i18n";

export const metadata = { title: "تسجيل الدخول" };

/** Sign-in gate. Without Supabase the app uses the development session, so this screen steps aside. */
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!supabaseConfigured()) redirect("/onboarding/start");
  if (await getSession()) redirect("/today");
  if (await getAuthUser()) redirect("/onboarding/start");
  return (
    <div className="page">
      <TopBar title={m.auth.title} subtitle={m.auth.subtitle} backHref="/onboarding" />
      {error === "link" && <PrivacyNotice variant="warning">{m.auth.linkExpired}</PrivacyNotice>}
      <SignIn />
    </div>
  );
}
