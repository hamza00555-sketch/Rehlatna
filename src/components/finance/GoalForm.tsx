"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FundingGoal, FundingPhase, FundingPriority } from "@/domain/types";
import { addDays, isValidIsoDate } from "@/domain/dates";
import { monthlyRequirement } from "@/domain/finance";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { Field, TextInput, MoneyInput, DateInput, Select, TextArea } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { Num, DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./GoalForm.module.css";

const PHASES: FundingPhase[] = ["before_birth", "at_birth", "after_birth"];
const PRIORITIES: FundingPriority[] = ["essential", "important", "optional"];

interface Props {
  goal?: FundingGoal;
  currencyCode: string;
  today: string;
  dueDate: string;
  preparationItemId?: string;
  presetName?: string;
}

/**
 * Create/edit a goal. Edits show the recalculation impact live and require
 * an explicit confirmation sheet; the server rejects unconfirmed updates.
 */
export function GoalForm({ goal, currencyCode, today, dueDate, preparationItemId, presetName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(goal?.name ?? presetName ?? "");
  const [expectedCost, setExpectedCost] = useState(goal?.expectedCost?.toString() ?? "");
  const [actualCost, setActualCost] = useState(goal?.actualCost?.toString() ?? "");
  const [fundedAmount, setFundedAmount] = useState(goal?.fundedAmount?.toString() ?? "0");
  const [fundingDate, setFundingDate] = useState(goal?.fundingDate ?? (dueDate > today ? addDays(dueDate, -30) : today));
  const [spendingDate, setSpendingDate] = useState(goal?.spendingDate ?? "");
  const [phase, setPhase] = useState<FundingPhase>(goal?.phase ?? "before_birth");
  const [priority, setPriority] = useState<FundingPriority>(goal?.priority ?? "important");
  const [visibility, setVisibility] = useState<"private" | "shared">(goal?.visibility ?? "private");
  const [notes, setNotes] = useState(goal?.notes ?? "");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = useMemo(
    () => ({
      expectedCost: expectedCost === "" ? undefined : Number(expectedCost),
      actualCost: actualCost === "" ? undefined : Number(actualCost),
      fundedAmount: Number(fundedAmount) || 0,
      fundingDate: fundingDate || today,
    }),
    [expectedCost, actualCost, fundedAmount, fundingDate, today],
  );
  const previousMonthly = goal ? monthlyRequirement(goal, today) : 0;
  const nextMonthly = monthlyRequirement(draft, today);
  const changed = goal ? previousMonthly !== nextMonthly : true;

  const validate = () => {
    if (!name.trim()) return m.forms.requiredField;
    if (draft.expectedCost === undefined && draft.actualCost === undefined) return m.forms.invalidNumber;
    if (!fundingDate) return m.forms.invalidDate;
    return null;
  };

  const payload = () => ({
    name: name.trim(),
    expectedCost: draft.expectedCost,
    actualCost: draft.actualCost,
    fundedAmount: draft.fundedAmount,
    fundingDate,
    spendingDate: spendingDate || undefined,
    phase,
    priority,
    visibility,
    notes: notes.trim() || undefined,
    preparationItemId: goal?.preparationItemId ?? preparationItemId,
  });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (goal) {
        await api(`/api/finance/goals/${goal.id}`, { ...payload(), confirmed: true }, "PATCH");
        router.push(`/finance/goals/${goal.id}`);
      } else {
        const res = await api<{ id: string }>("/api/finance/goals", payload());
        router.push(`/finance/goals/${res.id}`);
      }
      router.refresh();
    } catch {
      setError(m.common.error);
      setBusy(false);
      setConfirm(false);
    }
  };

  const onSubmit = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (goal) setConfirm(true);
    else void save();
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Field id="goal-name" label={m.finance.goalName}>
        <TextInput id="goal-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </Field>
      <div className={styles.row}>
        <Field id="goal-expected" label={m.finance.expectedCost}>
          <MoneyInput id="goal-expected" unit={currencyCode} value={expectedCost} onChange={(e) => setExpectedCost(e.target.value)} />
        </Field>
        {goal && (
          <Field id="goal-actual" label={m.finance.actualCost} optional>
            <MoneyInput id="goal-actual" unit={currencyCode} value={actualCost} onChange={(e) => setActualCost(e.target.value)} />
          </Field>
        )}
      </div>
      <Field id="goal-funded" label={m.finance.fundedAmount}>
        <MoneyInput id="goal-funded" unit={currencyCode} value={fundedAmount} onChange={(e) => setFundedAmount(e.target.value)} />
      </Field>
      <Field id="goal-funding-date" label={m.finance.fundingDate} help={m.finance.fundingDateHelp}>
        <DateInput id="goal-funding-date" value={fundingDate} onChange={(e) => setFundingDate(e.target.value)} />
      </Field>
      <Field id="goal-spending-date" label={m.finance.spendingDate} help={m.finance.spendingDateHelp} optional>
        <DateInput id="goal-spending-date" value={spendingDate} onChange={(e) => setSpendingDate(e.target.value)} />
      </Field>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{m.finance.priority}</legend>
        <ChipRow label={m.finance.priority}>
          {PRIORITIES.map((p) => (
            <Chip key={p} selected={priority === p} onClick={() => setPriority(p)}>
              {m.finance.priorities[p]}
            </Chip>
          ))}
        </ChipRow>
      </fieldset>

      <Field id="goal-phase" label={m.finance.phase}>
        <Select id="goal-phase" value={phase} onChange={(e) => setPhase(e.target.value as FundingPhase)}>
          {PHASES.map((p) => (
            <option key={p} value={p}>
              {m.finance.phases[p]}
            </option>
          ))}
        </Select>
      </Field>

      <ChoiceGroup legend={m.finance.privateLabel} columns={2}>
        <ChoiceCard name="goal-visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} title={m.finance.visibility.private!} leading={<Icon name="lock" size={20} />} />
        <ChoiceCard name="goal-visibility" value="shared" checked={visibility === "shared"} onChange={() => setVisibility("shared")} title={m.finance.visibility.shared!} leading={<Icon name="users" size={20} />} />
      </ChoiceGroup>

      <Field id="goal-notes" label={m.common.notes} optional>
        <TextArea id="goal-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {goal && (
        <div className={cx(styles.impact, changed && styles.impactChanged)} aria-live="polite">
          <span className={styles.impactIcon} aria-hidden="true">
            <Icon name="info" size={20} />
          </span>
          <div>
            <span className={styles.impactTitle}>{m.finance.impactTitle}</span>
            {changed ? (
              <p className={styles.impactLine}>
                {m.finance.impactFrom} <Num value={previousMonthly} format="currency" currency={currencyCode} /> {m.finance.impactTo}{" "}
                <strong>
                  <Num value={nextMonthly} format="currency" currency={currencyCode} />
                </strong>
              </p>
            ) : (
              <p className={styles.impactLine}>{m.finance.impactNone}</p>
            )}
            <p className={styles.impactNote}>{m.finance.fundingDateNoteBody}</p>
          </div>
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth loading={busy && !confirm}>
        {goal ? m.finance.applyChange : m.finance.addGoal}
      </Button>

      {goal && (
        <BottomSheet open={confirm} onClose={() => setConfirm(false)} title={m.finance.confirmChangeTitle}>
          <p>{m.finance.confirmChangeBody}</p>
          <PrivacyNotice variant="general">
            {m.finance.recalcPrev}: <Num value={previousMonthly} format="currency" currency={currencyCode} /> · {m.finance.recalcNew}: <Num value={nextMonthly} format="currency" currency={currencyCode} /> · {m.finance.recalcEffective}:{" "}
            {isValidIsoDate(fundingDate) ? <DateText iso={fundingDate} style="long" /> : fundingDate}
          </PrivacyNotice>
          <Button fullWidth onClick={save} loading={busy}>
            {m.common.confirm}
          </Button>
          <Button variant="quiet" fullWidth onClick={() => setConfirm(false)}>
            {m.common.cancel}
          </Button>
        </BottomSheet>
      )}
    </form>
  );
}
