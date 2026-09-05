"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FundingPhase } from "@/domain/types";
import { addDays } from "@/domain/dates";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { Field, MoneyInput, DateInput, Select } from "@/components/ui/Field";
import { Icon } from "@/components/icons/Icon";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./FinanceHandoff.module.css";

interface Props {
  itemId: string;
  itemTitle: string;
  currencyCode: string;
  today: string;
  dueDate: string;
}

/**
 * Shown only to members holding finance:edit when an item is `need_to_buy`
 * and has no goal yet. The item's shared status never changes; money lives
 * in the goal.
 */
export function FinanceHandoff({ itemId, itemTitle, currencyCode, today, dueDate }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [cost, setCost] = useState("");
  const [fundingDate, setFundingDate] = useState(dueDate > today ? addDays(dueDate, -30) : today);
  const [phase, setPhase] = useState<FundingPhase>("before_birth");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  const submit = async () => {
    const expectedCost = Number(cost);
    if (!Number.isFinite(expectedCost) || expectedCost <= 0) {
      setError(m.forms.invalidNumber);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/finance/goals", {
        name: itemTitle,
        expectedCost,
        fundedAmount: 0,
        fundingDate,
        phase,
        priority: "important",
        preparationItemId: itemId,
        visibility: "private",
      });
      router.push(`/finance/goals/${res.id}`);
      router.refresh();
    } catch {
      setError(m.common.error);
      setBusy(false);
    }
  };

  return (
    <>
      <section className={styles.card} aria-labelledby="handoff-title">
        <span className={styles.icon} aria-hidden="true">
          <Icon name="lock" size={20} />
        </span>
        <div className={styles.text}>
          <span className={styles.label}>{m.preparation.forPlannerOnly}</span>
          <h2 id="handoff-title" className={styles.title}>
            {m.preparation.financeHandoff}
          </h2>
          <p className={styles.body}>{m.preparation.financeHandoffBody}</p>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => setOpen(true)}>{m.preparation.yesAdd}</Button>
          <Button variant="quiet" onClick={() => setDismissed(true)}>
            {m.common.later}
          </Button>
        </div>
      </section>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.preparation.financeHandoff}>
        <p className={styles.sheetBody}>{m.preparation.financeHandoffBody}</p>
        <Field id="handoff-cost" label={m.finance.expectedPrice} error={error ?? undefined}>
          <MoneyInput id="handoff-cost" unit={currencyCode} value={cost} onChange={(e) => setCost(e.target.value)} invalid={Boolean(error)} />
        </Field>
        <Field id="handoff-date" label={m.finance.fundingDate} help={`${m.finance.fundingDateHelp} ${m.finance.differsFromSpending}.`}>
          <DateInput id="handoff-date" value={fundingDate} onChange={(e) => setFundingDate(e.target.value)} min={today} />
        </Field>
        <Field id="handoff-phase" label={m.finance.phase}>
          <Select id="handoff-phase" value={phase} onChange={(e) => setPhase(e.target.value as FundingPhase)}>
            {(["before_birth", "at_birth", "after_birth"] as FundingPhase[]).map((p) => (
              <option key={p} value={p}>
                {m.finance.phases[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Button fullWidth onClick={submit} loading={busy}>
          {m.preparation.addToFinance}
        </Button>
        <Button variant="quiet" fullWidth onClick={() => setOpen(false)}>
          {m.preparation.notNow}
        </Button>
      </BottomSheet>
    </>
  );
}
