"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DatingMethod } from "@/domain/types";
import { addDays } from "@/domain/dates";
import {
  pregnancyProgress,
  dueDateFromLmp,
  validateLmpDate,
  validateClinicianDueDate,
  LMP_MAX_PAST_DAYS,
  CLINICIAN_DUE_DATE_PAST_SLACK_DAYS,
  CLINICIAN_DUE_DATE_MAX_FUTURE_DAYS,
} from "@/domain/pregnancy";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { Field, DateInput, TextInput } from "@/components/ui/Field";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { Toggle } from "@/components/ui/Toggle";
import { DateText } from "@/components/ui/Num";
import { api, ApiError } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./Editors.module.css";

interface PregnancyDatingEditorProps {
  dueDate: string;
  datingMethod?: DatingMethod;
  lastPeriodStartDate?: string;
  today: string;
  canEdit: boolean;
}

function datingErrorMessage(code: string): string {
  if (code === "lmp_in_future") return m.onboarding.lmpFutureError;
  if (code === "lmp_too_old") return m.onboarding.lmpTooOldError;
  if (code === "due_date_too_early") return m.onboarding.clinicianDueDateTooEarlyError;
  if (code === "due_date_too_late") return m.onboarding.clinicianDueDateTooLateError;
  return m.common.error;
}

/** One line summarizing a dating snapshot: method, LMP (if any), due date, gestational age. */
function DatingSummary({ method, lastPeriodStartDate, dueDate, today }: { method: DatingMethod; lastPeriodStartDate?: string; dueDate: string; today: string }) {
  const progress = pregnancyProgress(dueDate, today);
  return (
    <>
      {method === "lmp" ? m.onboarding.lmpTabLabel : m.onboarding.clinicianTabLabel}
      {lastPeriodStartDate && (
        <>
          {" · "}
          {m.onboarding.lmpLabel}: <DateText iso={lastPeriodStartDate} style="short" />
        </>
      )}
      {" · "}
      {m.onboarding.dueDatePreviewLabel}: <DateText iso={dueDate} style="short" />
      {" · "}
      {m.onboarding.gestationalAgePreview(progress.week, progress.gestationalDays % 7)}
    </>
  );
}

/**
 * Pregnancy dating edits are explained: the displayed week changes; stored
 * appointments and records do not. Old records without an LMP value open on
 * the clinician-confirmed tab — they are never shown as if LMP was entered.
 * State resets from props every time the sheet opens, since the underlying
 * <dialog> stays mounted (toggled, not remounted) between opens.
 */
export function PregnancyDatingEditor({ dueDate, datingMethod, lastPeriodStartDate, today, canEdit }: PregnancyDatingEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const startsOnLmp = datingMethod === "lmp" && Boolean(lastPeriodStartDate);
  const [method, setMethod] = useState<DatingMethod>(startsOnLmp ? "lmp" : "clinician");
  const [lmp, setLmp] = useState(startsOnLmp ? lastPeriodStartDate! : "");
  const [clinicianDate, setClinicianDate] = useState(dueDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ saved: boolean; weekBefore?: number; weekAfter?: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setMethod(startsOnLmp ? "lmp" : "clinician");
    setLmp(startsOnLmp ? lastPeriodStartDate! : "");
    setClinicianDate(dueDate);
    setError(null);
    setResult(null);
    // Reopening re-seeds every field from the latest saved props; it deliberately ignores whatever was left mid-edit last time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!canEdit) return null;

  const changeMethod = (next: DatingMethod) => {
    setMethod(next);
    setResult(null);
    setError(null);
  };
  const changeLmp = (iso: string) => {
    setLmp(iso);
    setResult(null);
    setError(null);
  };
  const changeClinicianDate = (iso: string) => {
    setClinicianDate(iso);
    setResult(null);
    setError(null);
  };

  const resolvedDueDate = method === "lmp" ? (lmp ? dueDateFromLmp(lmp) : undefined) : clinicianDate || undefined;
  const localError = method === "lmp" ? (lmp ? validateLmpDate(lmp, today) : null) : clinicianDate ? validateClinicianDueDate(clinicianDate, today) : null;
  const unchanged = method === "lmp" ? startsOnLmp && lmp === lastPeriodStartDate : !startsOnLmp && clinicianDate === dueDate;
  const canSave = Boolean(resolvedDueDate) && !unchanged && !localError;

  return (
    <>
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        {m.family.editPregnancyDating}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.family.editPregnancyDating}>
        <ChoiceGroup legend={m.onboarding.datingMethodLabel} columns={2}>
          <ChoiceCard name="dating-method" value="lmp" checked={method === "lmp"} onChange={() => changeMethod("lmp")} title={m.onboarding.lmpTabLabel} />
          <ChoiceCard name="dating-method" value="clinician" checked={method === "clinician"} onChange={() => changeMethod("clinician")} title={m.onboarding.clinicianTabLabel} />
        </ChoiceGroup>
        <p className={styles.headMeta}>{m.family.dateEditNotice}</p>
        {method === "lmp" ? (
          <Field id="dating-lmp" label={m.onboarding.lmpLabel} help={m.onboarding.lmpHelp} error={localError ? datingErrorMessage(localError) : undefined}>
            <DateInput
              id="dating-lmp"
              value={lmp}
              onChange={(e) => changeLmp(e.target.value)}
              min={addDays(today, -LMP_MAX_PAST_DAYS)}
              max={today}
              invalid={Boolean(localError)}
              aria-describedby={localError ? "dating-lmp-error" : "dating-lmp-help"}
            />
          </Field>
        ) : (
          <Field id="dating-due" label={m.onboarding.dueDateLabel} error={localError ? datingErrorMessage(localError) : undefined}>
            <DateInput
              id="dating-due"
              value={clinicianDate}
              onChange={(e) => changeClinicianDate(e.target.value)}
              min={addDays(today, -CLINICIAN_DUE_DATE_PAST_SLACK_DAYS)}
              max={addDays(today, CLINICIAN_DUE_DATE_MAX_FUTURE_DAYS)}
              invalid={Boolean(localError)}
              aria-describedby={localError ? "dating-due-error" : undefined}
            />
          </Field>
        )}
        <div aria-live="polite" className={styles.compare}>
          <PrivacyNotice variant="general">
            <strong>{m.family.currentData}</strong>
            {": "}
            <DatingSummary method={startsOnLmp ? "lmp" : "clinician"} lastPeriodStartDate={startsOnLmp ? lastPeriodStartDate : undefined} dueDate={dueDate} today={today} />
          </PrivacyNotice>
          {resolvedDueDate && !localError && (
            <PrivacyNotice variant="general">
              <strong>{m.family.afterEdit}</strong>
              {": "}
              <DatingSummary method={method} lastPeriodStartDate={method === "lmp" ? lmp : undefined} dueDate={resolvedDueDate} today={today} />
            </PrivacyNotice>
          )}
        </div>
        {result && (
          <PrivacyNotice variant="general">
            {result.weekBefore !== undefined && result.weekAfter !== undefined ? (
              <>
                {m.family.dueDateChanged} {m.today.weekLabel} {result.weekBefore} → {result.weekAfter}
              </>
            ) : (
              m.forms.saved
            )}
          </PrivacyNotice>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button
          fullWidth
          loading={busy}
          disabled={!canSave}
          onClick={async () => {
            setBusy(true);
            setError(null);
            setResult(null);
            try {
              const body = method === "lmp" ? { datingMethod: "lmp" as const, lastPeriodStartDate: lmp } : { datingMethod: "clinician" as const, dueDate: clinicianDate };
              const res = await api<{ saved: boolean; dueDateChanged: boolean; weekBefore?: number; weekAfter?: number }>("/api/pregnancy", body, "PATCH");
              if (res.saved) setResult({ saved: true, weekBefore: res.weekBefore, weekAfter: res.weekAfter });
              router.refresh();
            } catch (err) {
              setError(err instanceof ApiError ? datingErrorMessage(err.code) : m.common.error);
            } finally {
              setBusy(false);
            }
          }}
        >
          {m.common.save}
        </Button>
      </BottomSheet>
    </>
  );
}

export function CitiesEditor({ followUpCity, deliveryCity, canEdit }: { followUpCity: string; deliveryCity: string; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [follow, setFollow] = useState(followUpCity);
  const [same, setSame] = useState(followUpCity === deliveryCity);
  const [delivery, setDelivery] = useState(deliveryCity);
  const [busy, setBusy] = useState(false);
  if (!canEdit) return null;
  return (
    <>
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        {m.family.editCities}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.family.editCities}>
        <p className={styles.headMeta}>{m.onboarding.citiesHelp}</p>
        <Field id="city-follow" label={m.onboarding.followUpCity}>
          <TextInput id="city-follow" value={follow} onChange={(e) => setFollow(e.target.value)} />
        </Field>
        <Toggle id="city-same" label={m.onboarding.sameCity} checked={same} onChange={setSame} />
        {!same && (
          <Field id="city-delivery" label={m.onboarding.deliveryCity}>
            <TextInput id="city-delivery" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </Field>
        )}
        <Button
          fullWidth
          loading={busy}
          disabled={!follow.trim() || (!same && !delivery.trim())}
          onClick={async () => {
            setBusy(true);
            try {
              await api("/api/pregnancy/cities", { followUpCity: follow.trim(), deliveryCity: same ? follow.trim() : delivery.trim() }, "PATCH");
              setOpen(false);
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {m.common.save}
        </Button>
      </BottomSheet>
    </>
  );
}

/** Facts that personalise guidance. Off by default; nothing is inferred. */
export function HealthEditor({ rhNegative, canEdit }: { rhNegative: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(rhNegative);
  const [busy, setBusy] = useState(false);
  return (
    <Toggle
      id="rh-negative"
      label={m.careWindows.health.rhNegative}
      description={m.careWindows.health.rhNegativeHelp}
      checked={value}
      disabled={!canEdit || busy}
      onChange={async (next) => {
        setValue(next);
        setBusy(true);
        try {
          await api("/api/pregnancy/health", { rhNegative: next }, "PATCH");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
