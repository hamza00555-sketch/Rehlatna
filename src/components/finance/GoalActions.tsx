"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { Field, MoneyInput, DateInput, TextInput } from "@/components/ui/Field";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { Num } from "@/components/ui/Num";
import { api } from "@/lib/api";
import { m } from "@/i18n";

interface ContributionProps {
  goalId: string;
  currencyCode: string;
  today: string;
  /** Monthly requirement before this contribution — for the confirmation explanation. */
  currentMonthly: number;
  remaining: number;
}

/** Add a contribution behind an explicit confirmation; the server records the explanation. */
export function ContributionSheet({ goalId, currencyCode, today, currentMonthly, remaining }: ContributionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;

  return (
    <>
      <Button fullWidth onClick={() => setOpen(true)} disabled={remaining === 0}>
        {remaining === 0 ? m.finance.completeGoal : m.finance.addAmount}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.finance.addContribution}>
        <Field id="ctr-amount" label={m.finance.contributionAmount} error={error ?? undefined}>
          <MoneyInput id="ctr-amount" unit={currencyCode} value={amount} onChange={(e) => setAmount(e.target.value)} invalid={Boolean(error)} />
        </Field>
        <Field id="ctr-date" label={m.finance.contributionDate}>
          <DateInput id="ctr-date" value={date} onChange={(e) => setDate(e.target.value)} max={today} />
        </Field>
        <Field id="ctr-note" label={m.finance.contributionNote} optional>
          <TextInput id="ctr-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
        </Field>
        {valid && (
          <PrivacyNotice variant="general">
            {m.finance.recalcPrev}: <Num value={currentMonthly} format="currency" currency={currencyCode} /> · {m.finance.remaining}: <Num value={Math.max(remaining - value, 0)} format="currency" currency={currencyCode} />
          </PrivacyNotice>
        )}
        <Button
          fullWidth
          loading={busy}
          disabled={!valid}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await api(`/api/finance/goals/${goalId}/contributions`, { amount: value, date, note: note.trim() || undefined, confirmed: true });
              setOpen(false);
              setAmount("");
              router.refresh();
            } catch {
              setError(m.common.error);
            } finally {
              setBusy(false);
            }
          }}
        >
          {m.common.confirm}
        </Button>
        <Button variant="quiet" fullWidth onClick={() => setOpen(false)}>
          {m.common.cancel}
        </Button>
      </BottomSheet>
    </>
  );
}

export function DeleteGoal({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="danger" fullWidth onClick={() => setOpen(true)}>
        {m.finance.deleteGoal}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.finance.deleteGoal}>
        <p>{m.finance.deleteGoalConfirm}</p>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/api/finance/goals/${goalId}`, undefined, "DELETE");
              router.push("/finance");
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {m.common.confirm}
        </Button>
        <Button variant="quiet" fullWidth onClick={() => setOpen(false)}>
          {m.common.cancel}
        </Button>
      </BottomSheet>
    </>
  );
}
