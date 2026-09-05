import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { pregnancyProgress } from "@/domain/pregnancy";
import { BabyNameForm } from "@/components/journey/BabyNameForm";

export const metadata = { title: "اختيار الاسم" };

export default async function BabyNamePage() {
  const ctx = await getContext();
  if (!ctx?.data.baby || !ctx.data.pregnancy) redirect("/onboarding");
  const week = pregnancyProgress(ctx.data.pregnancy.dueDate, ctx.today).week;
  return <BabyNameForm current={ctx.data.baby.displayName} week={week} canEdit={ctx.viewer.permissions.includes("journey:edit")} />;
}
