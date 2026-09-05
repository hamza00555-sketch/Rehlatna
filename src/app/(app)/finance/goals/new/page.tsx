import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { GoalForm } from "@/components/finance/GoalForm";
import { m } from "@/i18n";

export const metadata = { title: "إضافة هدف" };

export default async function NewGoalPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!ctx.data.household.settings.financeEnabled || !can(ctx.viewer, "finance:edit")) redirect("/finance");
  const linked = item ? ctx.data.preparationItems.find((i) => i.id === item) : undefined;
  return (
    <div className="page">
      <TopBar title={m.finance.addGoal} backHref={linked ? `/preparation/item/${linked.id}` : "/finance"} />
      <GoalForm currencyCode={ctx.data.household.settings.currencyCode} today={ctx.today} dueDate={ctx.data.pregnancy.dueDate} preparationItemId={linked?.id} presetName={linked?.title} />
    </div>
  );
}
