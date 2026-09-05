"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UltrasoundRecord } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { Field, DateInput, TextInput, TextArea } from "@/components/ui/Field";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./UltrasoundEditor.module.css";

interface Props {
  record?: UltrasoundRecord;
  appointmentId?: string;
  defaultDate: string;
  defaultWeek?: number;
  canEdit: boolean;
}

/** Ultrasound record: date, gestational week and notes. Images stay on the family's device. */
export function UltrasoundEditor({ record, appointmentId, defaultDate, defaultWeek, canEdit }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(record?.date ?? defaultDate);
  const [week, setWeek] = useState(record?.gestationalWeek?.toString() ?? defaultWeek?.toString() ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    setBusy(true);
    setSaved(false);
    const payload = { date, gestationalWeek: week ? Number(week) : undefined, notes: notes.trim() || undefined, appointmentId };
    try {
      if (record) {
        await api(`/api/ultrasounds/${record.id}`, payload, "PATCH");
        setSaved(true);
        router.refresh();
      } else {
        const res = await api<{ id: string }>("/api/ultrasounds", payload);
        router.push(`/journey/ultrasound/${res.id}`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.body}>
      <MediaFrame alt={m.appointments.ultrasoundMediaPlaceholder} ratio="card" placeholderLabel={m.appointments.ultrasoundMediaPlaceholder} />
      <PrivacyNotice variant="general">{m.appointments.ultrasoundMediaPlaceholder}</PrivacyNotice>
      <Field id="us-date" label={m.appointments.date}>
        <DateInput id="us-date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
      </Field>
      <Field id="us-week" label={m.appointments.gestationalWeek} optional>
        <TextInput id="us-week" numeric inputMode="numeric" value={week} onChange={(e) => setWeek(e.target.value.replace(/[^\d]/g, ""))} disabled={!canEdit} />
      </Field>
      <Field id="us-notes" label={m.appointments.ultrasoundNotes} optional>
        <TextArea id="us-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} disabled={!canEdit} />
      </Field>
      {canEdit && (
        <Button fullWidth onClick={submit} loading={busy}>
          {m.common.save}
        </Button>
      )}
      {saved && (
        <p className={styles.saved} role="status">
          {m.forms.saved}
        </p>
      )}
    </div>
  );
}
