"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BabyGender } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { BottomSheet } from "@/components/ui/Sheet";
import { api, ApiError } from "@/lib/api";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./BirthEventForm.module.css";

interface Props {
  today: string;
  currentName: string | null;
  currentGender: BabyGender;
  canEdit: boolean;
}

/**
 * وصل صغيرنا — dark, quiet, explicit. The lifecycle only moves to postpartum
 * after the family confirms in the sheet; the due date never triggers it.
 */
export function BirthEventForm({ today, currentName, currentGender, canEdit }: Props) {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState(today);
  const [birthTime, setBirthTime] = useState("");
  const [name, setName] = useState(currentName ?? "");
  const [gender, setGender] = useState<BabyGender | "">(currentGender === "unknown" ? "" : currentGender);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirect: string }>("/api/birth", {
        birthDate,
        birthTime: birthTime || undefined,
        displayName: name.trim() || undefined,
        gender: gender || undefined,
        confirmed: true,
      });
      router.push(res.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.code === "future_birth_date" ? m.forms.invalidDate : m.common.error);
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <section className={styles.canvas}>
      <div className={styles.top}>
        <IconButton icon="back" label={m.common.back} variant="overMedia" href="/journey" />
      </div>
      <header className={styles.header}>
        <h1 className={styles.title}>{m.journey.birthEvent}</h1>
        <p className={styles.help}>{m.journey.birthTransitionBody}</p>
      </header>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>{m.journey.birthDate}</span>
          <input type="date" className={styles.input} value={birthDate} max={today} onChange={(e) => setBirthDate(e.target.value)} disabled={!canEdit} dir="ltr" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            {m.journey.birthTime} · {m.common.optional}
          </span>
          <input type="time" className={styles.input} value={birthTime} onChange={(e) => setBirthTime(e.target.value)} disabled={!canEdit} dir="ltr" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            {m.journey.babyName} · {m.common.optional}
          </span>
          <input type="text" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={!canEdit} />
          <span className={styles.hint}>{m.journey.babyNameHelp}</span>
        </label>
        <fieldset className={styles.field}>
          <legend className={styles.label}>
            {m.journey.recordGender} · {m.common.optional}
          </legend>
          <div className={styles.genderRow}>
            {(["girl", "boy", "undisclosed"] as BabyGender[]).map((g) => (
              <label key={g} className={cx(styles.genderCard, styles[g], gender === g && styles.genderOn)}>
                <input type="radio" name="birth-gender" value={g} checked={gender === g} onChange={() => setGender(gender === g ? "" : g)} className={styles.radio} />
                <span>{g === "girl" ? m.gender.girl : g === "boy" ? m.gender.boy : m.gender.undisclosed}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.footer}>
        <Button variant="lightOverMedia" fullWidth onClick={() => setConfirm(true)} disabled={!canEdit || !birthDate}>
          {m.journey.confirmBirth}
        </Button>
        <Button variant="quiet" fullWidth href="/journey" className={styles.cancel}>
          {m.common.cancel}
        </Button>
      </div>

      <BottomSheet open={confirm} onClose={() => setConfirm(false)} title={m.journey.birthEvent} tone="dark">
        <p>{m.journey.confirmBirthHelp}</p>
        <Button variant="lightOverMedia" fullWidth onClick={submit} loading={busy}>
          {m.journey.confirmBirth}
        </Button>
        <Button variant="quiet" fullWidth onClick={() => setConfirm(false)} className={styles.cancel}>
          {m.common.cancel}
        </Button>
      </BottomSheet>
    </section>
  );
}
