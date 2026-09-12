"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DatingMethod } from "@/domain/types";
import { addDays } from "@/domain/dates";
import { pregnancyProgress, dueDateFromLmp, GESTATION_DAYS, LMP_MAX_PAST_DAYS } from "@/domain/pregnancy";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { Field, TextInput } from "@/components/ui/Field";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { Toggle } from "@/components/ui/Toggle";
import { DateText, Num } from "@/components/ui/Num";
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

/**
 * Pregnancy dating edits are explained: the displayed week changes; stored
 * appointments and records do not. Old records without an LMP value open on
 * the clinician-confirmed tab — they are never shown as if LMP was entered.
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
  const [result, setResult] = useState<{ weekBefore: number; weekAfter: number } | null>(null);
  if (!canEdit) return null;

  const resolvedDueDate = method === "lmp" ? (lmp ? dueDateFromLmp(lmp) : undefined) : clinicianDate || undefined;
  const progress = resolvedDueDate ? pregnancyProgress(resolvedDueDate, today) : null;
  const unchanged = method === "lmp" ? startsOnLmp && lmp === lastPeriodStartDate : !startsOnLmp && clinicianDate === dueDate;
  const canSave = Boolean(resolvedDueDate) && !unchanged;

  return (
    <>
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        {m.family.editPregnancyDating}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.family.editPregnancyDating}>
        <ChoiceGroup legend={m.onboarding.datingMethodLabel} columns={2}>
          <ChoiceCard name="dating-method" value="lmp" checked={method === "lmp"} onChange={() => setMethod("lmp")} title={m.onboarding.lmpTabLabel} />
          <ChoiceCard name="dating-method" value="clinician" checked={method === "clinician"} onChange={() => setMethod("clinician")} title={m.onboarding.clinicianTabLabel} />
        </ChoiceGroup>
        {method === "lmp" ? (
          <>
            <CalendarPicker value={lmp || undefined} onChange={setLmp} min={addDays(today, -LMP_MAX_PAST_DAYS)} max={today} today={today} label={m.onboarding.lmpLabel} />
            <p className={styles.headMeta}>{m.onboarding.lmpHelp}</p>
          </>
        ) : (
          <CalendarPicker value={clinicianDate || undefined} onChange={setClinicianDate} min={addDays(today, -LMP_MAX_PAST_DAYS)} max={addDays(today, GESTATION_DAYS + 14)} today={today} label={m.onboarding.dueDateLabel} />
        )}
        {progress && resolvedDueDate && (
          <PrivacyNotice variant="general">
            {m.onboarding.gestationalAgePreview(progress.week, progress.gestationalDays % 7)} · {m.onboarding.dueDatePreviewLabel}: <DateText iso={resolvedDueDate} style="long" />
          </PrivacyNotice>
        )}
        {result && (
          <PrivacyNotice variant="general">
            {m.family.dueDateChanged} {m.today.weekLabel} <Num value={result.weekBefore} /> → <Num value={result.weekAfter} />
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
            try {
              const body = method === "lmp" ? { datingMethod: "lmp" as const, lastPeriodStartDate: lmp } : { datingMethod: "clinician" as const, dueDate: clinicianDate };
              const res = await api<{ changed: boolean; weekBefore?: number; weekAfter?: number }>("/api/pregnancy", body, "PATCH");
              if (res.changed && res.weekBefore !== undefined && res.weekAfter !== undefined) setResult({ weekBefore: res.weekBefore, weekAfter: res.weekAfter });
              router.refresh();
            } catch (err) {
              if (err instanceof ApiError && err.code === "lmp_in_future") setError(m.onboarding.lmpFutureError);
              else if (err instanceof ApiError && err.code === "lmp_too_old") setError(m.onboarding.lmpTooOldError);
              else setError(m.common.error);
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
