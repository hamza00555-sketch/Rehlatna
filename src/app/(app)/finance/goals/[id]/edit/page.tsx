import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { goalVisibleTo } from "@/server/serializers";
import { TopBar } from "@/components/ui/TopBar";
import { GoalForm } from "@/components/finance/GoalForm";
import { m } from "@/i18n";

type Params = { params: Promise<{ id: string }> };

export default async function EditGoalPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const goal = ctx.data.fundingGoals.find((g) => g.id === id);
  if (!goal || !goalVisibleTo(goal, ctx.viewer, ctx.data.household.settings.financeShared)) notFound();
  if (!can(ctx.viewer, "finance:edit")) redirect(`/finance/goals/${id}`);
  return (
    <div className="page">
      <TopBar title={m.finance.editGoal} backHref={`/finance/goals/${id}`} />
      <GoalForm goal={goal} currencyCode={ctx.data.household.settings.currencyCode} today={ctx.today} dueDate={ctx.data.pregnancy.dueDate} />
    </div>
  );
}
