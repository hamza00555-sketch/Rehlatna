import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { GenderChoice } from "@/components/journey/GenderChoice";

export const metadata = { title: "تسجيل الجنس" };

export default async function GenderPage() {
  const ctx = await getContext();
  if (!ctx?.data.baby) redirect("/onboarding");
  return <GenderChoice current={ctx.data.baby.gender} canEdit={ctx.viewer.permissions.includes("journey:edit")} />;
}
