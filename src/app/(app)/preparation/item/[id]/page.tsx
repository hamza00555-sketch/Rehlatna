import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { serializePreparationItem } from "@/server/serializers";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { Icon, type IconName } from "@/components/icons/Icon";
import { StatusSegment } from "@/components/preparation/StatusSegment";
import { FinanceHandoff } from "@/components/preparation/FinanceHandoff";
import type { PreparationCategoryKey } from "@/domain/types";
import { m } from "@/i18n";
import styles from "../../preparation.module.css";

type Params = { params: Promise<{ id: string }> };

const CATEGORY_ICON: Record<PreparationCategoryKey, IconName> = {
  sleep: "bed",
  mobility: "car",
  feeding: "bottle",
  clothing: "shirt",
  care: "heart",
  hospital: "hospital",
  travel: "bag",
  mother_postpartum: "sprout",
  other: "more",
};

/** Item detail. Shared view never contains money; planners see the handoff or the goal link. */
export default async function ItemPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const raw = ctx.data.preparationItems.find((i) => i.id === id);
  if (!raw) notFound();
  const item = serializePreparationItem(raw, ctx.viewer, ctx.data.fundingGoals);
  const canEdit = can(ctx.viewer, "preparation:edit");
  const canPlan = ctx.data.household.settings.financeEnabled && can(ctx.viewer, "finance:edit");

  return (
    <div className="page">
      <TopBar
        title={m.preparation.categories[item.category]!}
        backHref={`/preparation/${item.category}`}
        actions={canEdit ? <IconButton icon="edit" label={m.common.edit} variant="quiet" href={`/preparation/item/${item.id}/edit`} /> : undefined}
      />
      <div className={styles.body}>
        <div className={styles.hero}>
          <MediaFrame alt={item.title} ratio="card" radius="hero" placeholderLabel={m.preparation.imagePlaceholder} />
          <div className={styles.itemHead}>
            <div className={styles.itemText}>
              <span className={styles.category}>{m.preparation.categories[item.category]}</span>
              <h2 className={styles.itemTitle}>{item.title}</h2>
              <div className={styles.badges}>
                {item.inHospitalBag && <StatusBadge tone="future">{m.preparation.inHospitalBag}</StatusBadge>}
                {item.linkedGoalId && <StatusBadge tone="medical">{m.preparation.linkedGoal}</StatusBadge>}
              </div>
            </div>
            <span className={styles.categoryIcon} aria-hidden="true">
              <Icon name={CATEGORY_ICON[item.category]} size={24} />
            </span>
          </div>
        </div>

        <section className={styles.section}>
          <SectionTitle>{m.preparation.status}</SectionTitle>
          <StatusSegment itemId={item.id} status={item.status} canEdit={canEdit} />
        </section>

        <section className={styles.section}>
          <SectionTitle>{m.common.notes}</SectionTitle>
          <Card tone="tint" padding="md">
            <p className={styles.notes}>{item.notes ?? "—"}</p>
          </Card>
        </section>

        {item.linkedGoalId && (
          <RowGroup>
            <TaskRow title={m.preparation.viewGoal} href={`/finance/goals/${item.linkedGoalId}`} leading={<Icon name="lock" size={20} />} />
          </RowGroup>
        )}

        {canPlan && item.status === "need_to_buy" && !item.linkedGoalId && (
          <FinanceHandoff itemId={item.id} itemTitle={item.title} currencyCode={ctx.data.household.settings.currencyCode} today={ctx.today} dueDate={ctx.data.pregnancy.dueDate} />
        )}
      </div>
    </div>
  );
}
