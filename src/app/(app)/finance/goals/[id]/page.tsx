import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { goalVisibleTo, serializeContributions, serializeExplanations, serializeFundingGoal } from "@/server/serializers";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { Num, DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { ContributionSheet, DeleteGoal } from "@/components/finance/GoalActions";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "../../finance.module.css";

type Params = { params: Promise<{ id: string }> };

/** Goal detail on the private planning surface. Funding date and spending date are shown as two separate facts. */
export default async function GoalDetailPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const raw = ctx.data.fundingGoals.find((g) => g.id === id);
  if (!raw || !ctx.data.household.settings.financeEnabled || !goalVisibleTo(raw, ctx.viewer, ctx.data.household.settings.financeShared)) notFound();
  const goal = serializeFundingGoal(raw, ctx.viewer, ctx.today);
  const contributions = serializeContributions(raw, ctx.data, ctx.viewer);
  const explanations = serializeExplanations(raw, ctx.data, ctx.viewer).slice(0, 3);
  const canEdit = can(ctx.viewer, "finance:edit");
  const currency = ctx.data.household.settings.currencyCode;
  const linkedItem = goal.preparationItemId ? ctx.data.preparationItems.find((i) => i.id === goal.preparationItemId) : undefined;
  const pct = Math.round(goal.ratio * 100);

  return (
    <div className="page">
      <TopBar
        title={goal.name}
        subtitle={`${m.finance.phases[goal.phase]} · ${m.finance.priorities[goal.priority]}`}
        backHref="/finance"
        actions={canEdit ? <IconButton icon="edit" label={m.common.edit} variant="quiet" href={`/finance/goals/${goal.id}/edit`} /> : undefined}
      />
      <div className={styles.body}>
        <section className={styles.private} aria-label={m.finance.goal}>
          <div className={styles.privateStats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{m.finance.goal}</span>
              <span className={styles.statValue}>
                <Num value={goal.target} format="currency" currency={currency} />
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{m.finance.fundedLabel}</span>
              <span className={cx(styles.statValue, styles.statAccent)}>
                <Num value={goal.funded} format="currency" currency={currency} />
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{m.finance.remaining}</span>
              <span className={styles.statValue}>
                <Num value={goal.remaining} format="currency" currency={currency} />
              </span>
            </div>
          </div>
          <div className={styles.privateTrack} role="progressbar" aria-label={m.finance.goal} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={cx(styles.privateFill, goal.state === "complete" && styles.privateFillComplete)} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.privateFoot}>
            <span>
              <Num value={goal.ratio} format="percent" /> {goal.state === "complete" ? m.finance.complete : ""}
            </span>
            <StatusBadge tone={goal.state === "complete" ? "ready" : goal.state === "on_track" || goal.state === "not_started" ? "future" : "unverified"}>
              {goal.state === "complete" ? m.finance.complete : goal.state === "on_track" ? m.finance.onTrack : goal.state === "not_started" ? m.finance.notStarted : goal.state === "overdue" ? m.finance.overdue : m.finance.attention}
            </StatusBadge>
          </div>
        </section>

        <div className={styles.dates}>
          <Card tone="tint" padding="md" className={styles.dateCard}>
            <span className={styles.dateLabel}>{m.finance.fundingDate}</span>
            <span className={styles.dateValue}>
              <DateText iso={goal.fundingDate} style="long" />
            </span>
            <span className={styles.dateLabel}>{m.finance.periods(goal.periods)}</span>
          </Card>
          <Card tone="surface" padding="md" className={styles.dateCard}>
            <span className={styles.dateLabel}>{m.finance.spendingDate}</span>
            <span className={styles.dateValue}>{goal.spendingDate ? <DateText iso={goal.spendingDate} style="long" /> : m.common.unknownDate}</span>
            <span className={styles.dateLabel}>{m.finance.spendingDateHelp}</span>
          </Card>
        </div>

        <Card tone={goal.state === "overdue" || goal.state === "attention" ? "attention" : "surface"} padding="panel" className={styles.dateCard}>
          <span className={styles.dateLabel}>{m.finance.monthlyRequirement}</span>
          <span className={styles.monthlyBig}>
            <Num value={goal.monthly} format="currency" currency={currency} />
          </span>
          <span className={styles.dateLabel}>{goal.monthly > 0 ? m.finance.monthlyWord : m.finance.completeGoal}</span>
        </Card>

        <PrivacyNotice variant="general">
          <strong>{m.finance.fundingDateNote}.</strong> {m.finance.fundingDateNoteBody}
        </PrivacyNotice>

        {linkedItem && (
          <RowGroup>
            <TaskRow title={`${m.finance.linkedItem}: ${linkedItem.title}`} meta={m.preparation.statuses[linkedItem.status]} href={`/preparation/item/${linkedItem.id}`} leading={<Icon name="preparation" size={20} />} />
          </RowGroup>
        )}

        <section className={styles.section}>
          <SectionTitle>{m.finance.contributions}</SectionTitle>
          {contributions.length === 0 ? (
            <p className={styles.explainWhy}>{m.finance.noContributions}</p>
          ) : (
            <Card tone="surface" padding="md">
              <ul className={styles.history}>
                {contributions.map((c) => (
                  <li key={c.id} className={styles.historyRow}>
                    <span>
                      <DateText iso={c.date} style="long" />
                      {c.note && <span className={styles.explainWhy}> · {c.note}</span>}
                    </span>
                    <span className={styles.historyAmount}>
                      + <Num value={c.amount} format="currency" currency={currency} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {explanations.length > 0 && (
          <section className={styles.section}>
            <SectionTitle>{m.finance.recalculation}</SectionTitle>
            <Card tone="tint" padding="md">
              <ul>
                {explanations.map((e) => (
                  <li key={e.id} className={styles.explain}>
                    <span>{e.whatChanged}</span>
                    <span className={styles.explainWhy}>
                      {e.why} · {m.finance.recalcPrev}: <Num value={e.previousMonthly} format="currency" currency={currency} /> → {m.finance.recalcNew}: <Num value={e.newMonthly} format="currency" currency={currency} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {canEdit && (
          <div className={styles.actions}>
            <ContributionSheet goalId={goal.id} currencyCode={currency} today={ctx.today} currentMonthly={goal.monthly} remaining={goal.remaining} />
            <DeleteGoal goalId={goal.id} />
          </div>
        )}
      </div>
    </div>
  );
}
