"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BabyGender } from "@/domain/types";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./GenderChoice.module.css";

type Option = { value: BabyGender | "later"; label: string; tone: "boy" | "girl" | "neutral" | "warm" };

const OPTIONS: Option[] = [
  { value: "girl", label: m.gender.girl, tone: "girl" },
  { value: "boy", label: m.gender.boy, tone: "boy" },
  { value: "later", label: m.gender.later, tone: "neutral" },
  { value: "undisclosed", label: m.gender.undisclosed, tone: "warm" },
];

/**
 * A calm optional moment on a dark cinematic canvas. Blue/rose fields sit
 * around a neutral centre; nothing else in the product recolours.
 */
export function GenderChoice({ current, canEdit }: { current: BabyGender; canEdit: boolean }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Option["value"]>(current === "unknown" ? "later" : current);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/baby", { gender: choice === "later" ? "unknown" : choice }, "PATCH");
      router.push("/journey");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.canvas}>
      <div className={styles.top}>
        <IconButton icon="back" label={m.common.back} variant="overMedia" href="/journey" />
      </div>
      <header className={styles.header}>
        <h1 className={styles.title}>{m.gender.title}</h1>
        <p className={styles.help}>{m.gender.help}</p>
      </header>

      {/* Abstract light field — production artwork pending; a restrained
          dual-tone gradient stands in, never a stereotyped illustration. */}
      <div className={styles.orb} aria-hidden="true" />

      <fieldset className={styles.grid} disabled={!canEdit}>
        <legend className="sr-only">{m.gender.title}</legend>
        {OPTIONS.map((opt) => {
          const selected = choice === opt.value;
          return (
            <label key={opt.value} className={cx(styles.card, styles[opt.tone], selected && styles.selected)}>
              <input type="radio" name="gender" value={opt.value} checked={selected} onChange={() => setChoice(opt.value)} className={styles.input} />
              <span className={styles.ring} aria-hidden="true">
                {selected && <span className={styles.ringDot} />}
              </span>
              <span className={styles.label}>{opt.label}</span>
            </label>
          );
        })}
      </fieldset>

      <div className={styles.footer}>
        <Button variant="lightOverMedia" fullWidth onClick={save} loading={busy} disabled={!canEdit}>
          {m.common.save}
        </Button>
      </div>
    </section>
  );
}
