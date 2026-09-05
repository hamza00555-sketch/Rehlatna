import type { FundingGoalView } from "@/server/serializers";
import type { FinanceTotals } from "@/domain/finance";
import { Card } from "@/components/ui/Card";
import { Progress, GoalRing } from "@/components/ui/Progress";
import { Num } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./FinanceCards.module.css";

/** FundingSummary — total required, saved progress, this month's target. Calm: one bar, amounts beside percentages. */
export function FundingSummaryCard({ totals, currency }: { totals: FinanceTotals; currency: string }) {
  const complete = totals.target > 0 && totals.remaining === 0;
  return (
    <Card tone={totals.attention && !complete ? "attention" : "sage"} padding="panel" className={styles.summary}>
      <span className={styles.label}>{m.finance.totalRequired}</span>
      <span className={styles.big}>
        <Num value={totals.target} format="currency" currency={currency} />
      </span>
      <Progress
        ratio={totals.ratio}
        tone={complete ? "complete" : totals.attention ? "attention" : "onTrack"}
        label={m.finance.title}
        caption={
          <>
            {m.finance.fundedLabel} <Num value={totals.funded} format="currency" currency={currency} /> {m.finance.of} <Num value={totals.target} format="currency" currency={currency} />
          </>
        }
        trailing={<Num value={totals.ratio} format="percent" />}
      />
    </Card>
  );
}

export function MonthlyCard({ totals, currency }: { totals: FinanceTotals; currency: string }) {
  return (
    <Card tone={totals.attention ? "attention" : "warm"} padding="panel" className={styles.monthly}>
      <span className={styles.walletIcon} aria-hidden="true">
        <Icon name="wallet" size={24} />
      </span>
      <div className={styles.monthlyText}>
        <span className={styles.label}>{m.finance.thisMonth}</span>
        <span className={styles.medium}>
          <Num value={totals.monthly} format="currency" currency={currency} />
        </span>
        <span className={cx(styles.hint, totals.attention && styles.attentionText)}>{totals.attention ? m.finance.attention : m.finance.requiredBeforeMonthEnd}</span>
      </div>
    </Card>
  );
}

/** ExpenseRow list: which goals make up this month's amount. */
export function WhyRows({ goals, currency }: { goals: FundingGoalView[]; currency: string }) {
  const active = goals.filter((g) => g.monthly > 0);
  if (active.length === 0) return null;
  return (
    <Card tone="surface" padding="panel" className={styles.why}>
      <h2 className={styles.whyTitle}>{m.finance.whyThisAmount}</h2>
      <ul className={styles.rows}>
        {active.map((g) => (
          <li key={g.id} className={cx(styles.row, g.state === "overdue" && styles.rowAttention)}>
            <span className={cx(styles.mark, styles[`mark_${g.phase}`])} aria-hidden="true" />
            <span className={styles.rowName}>{g.name}</span>
            <span className={styles.rowAmount}>
              <Num value={g.monthly} format="currency" currency={currency} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PhaseRings({ byPhase }: { byPhase: { phase: "before_birth" | "at_birth" | "after_birth"; ratio: number; target: number }[] }) {
  if (byPhase.every((p) => p.target === 0)) return null;
  return (
    <Card tone="surface" padding="panel" className={styles.rings}>
      <h2 className={styles.whyTitle}>{m.finance.breakdown}</h2>
      <div className={styles.ringRow}>
        {byPhase.map((p) => (
          <GoalRing key={p.phase} ratio={p.ratio} phase={p.phase} label={m.finance.phases[p.phase]!} />
        ))}
      </div>
    </Card>
  );
}
