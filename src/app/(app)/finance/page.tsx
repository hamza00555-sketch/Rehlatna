import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { serializeFinanceOverview } from "@/server/serializers";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { Num } from "@/components/ui/Num";
import { FundingSummaryCard, MonthlyCard, PhaseRings, WhyRows } from "@/components/finance/FinanceCards";
import { m } from "@/i18n";
import styles from "./finance.module.css";

export const metadata = { title: "الخطة المالية" };

/**
 * Private finance. For members without finance:view the serializer returns
 * null and NO amounts are ever loaded into this page — the unauthorized
 * state is content, not a CSS-hidden dashboard.
 */
export default async function FinancePage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const settings = ctx.data.household.settings;

  if (!settings.financeEnabled) {
    return (
      <div className="page">
        <TopBar title={m.finance.title} backHref="/more" />
        <EmptyState title={m.finance.disabledTitle} body={m.finance.disabledBody} icon="lock" />
      </div>
    );
  }

  const view = serializeFinanceOverview(ctx.data, ctx.viewer, ctx.today);
  if (!view) {
    return (
      <div className="page">
        <TopBar title={m.finance.title} backHref="/more" />
        <EmptyState title={m.finance.unauthorizedTitle} body={m.finance.unauthorizedBody} icon="lock" />
      </div>
    );
  }

  const currency = view.currencyCode;
  const stateTone = (s: string) => (s === "complete" ? "ready" : s === "on_track" || s === "not_started" ? "future" : "unverified") as "ready" | "future" | "unverified";
  const stateLabel = (s: string) => (s === "complete" ? m.finance.complete : s === "on_track" ? m.finance.onTrack : s === "not_started" ? m.finance.notStarted : s === "overdue" ? m.finance.overdue : m.finance.attention);

  return (
    <div className="page">
      <TopBar
        title={m.finance.title}
        subtitle={`${m.finance.privateLabel} · ${m.finance.subtitle}`}
        backHref="/more"
        actions={view.canEdit ? <IconButton icon="plus" label={m.finance.addGoal} href="/finance/goals/new" /> : undefined}
      />
      <div className={styles.body}>
        {view.goals.length === 0 ? (
          <EmptyState title={m.finance.emptyTitle} body={m.finance.emptyBody} icon="wallet" action={view.canEdit ? <Button href="/finance/goals/new">{m.finance.addGoal}</Button> : undefined} />
        ) : (
          <>
            <FundingSummaryCard totals={view.totals} currency={currency} />
            <MonthlyCard totals={view.totals} currency={currency} />
            <WhyRows goals={view.goals} currency={currency} />
            <PhaseRings byPhase={view.byPhase} />

            {view.latestExplanation && (
              <PrivacyNotice variant="general">
                <strong>{m.finance.recalculation}:</strong> {view.latestExplanation.whatChanged} — {view.latestExplanation.why}
              </PrivacyNotice>
            )}

            <section className={styles.section}>
              <SectionTitle action={view.canEdit ? { label: m.finance.addGoal, href: "/finance/goals/new" } : undefined}>{m.finance.goals}</SectionTitle>
              <RowGroup>
                {view.goals.map((g) => (
                  <TaskRow
                    key={g.id}
                    title={g.name}
                    meta={
                      <span className={styles.goalMeta}>
                        <Num value={g.funded} format="currency" currency={currency} /> {m.finance.of} <Num value={g.target} format="currency" currency={currency} /> · {m.finance.phases[g.phase]}
                      </span>
                    }
                    href={`/finance/goals/${g.id}`}
                    trailing={<StatusBadge tone={stateTone(g.state)}>{stateLabel(g.state)}</StatusBadge>}
                  />
                ))}
              </RowGroup>
            </section>
          </>
        )}
        <PrivacyNotice variant="private">{m.onboarding.financePrivateHelp}</PrivacyNotice>
      </div>
    </div>
  );
}
