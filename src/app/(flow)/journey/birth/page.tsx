import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { BirthEventForm } from "@/components/birth/BirthEventForm";

export const metadata = { title: "وصل صغيرنا" };

export default async function BirthEventPage() {
  const ctx = await getContext();
  if (!ctx?.data.baby || !ctx.data.pregnancy) redirect("/onboarding");
  if (ctx.data.baby.birthDate) redirect("/journey/birth/confirmed");
  return <BirthEventForm today={ctx.today} currentName={ctx.data.baby.displayName} currentGender={ctx.data.baby.gender} canEdit={ctx.viewer.permissions.includes("journey:edit")} />;
}
