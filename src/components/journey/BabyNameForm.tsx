"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { Field, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { fmtInt } from "@/lib/format";
import { m } from "@/i18n";
import styles from "./BabyNameForm.module.css";

/** Optional name moment: gentle preview, easy to leave neutral. */
export function BabyNameForm({ current, week, canEdit }: { current: string | null; week: number; canEdit: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(current ?? "");
  const [busy, setBusy] = useState(false);

  const save = async (value: string | null) => {
    setBusy(true);
    try {
      await api("/api/baby", { displayName: value }, "PATCH");
      router.push("/journey");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const preview = name.trim() || m.baby.neutral;

  return (
    <div className="page">
      <TopBar title={m.name.title} subtitle={m.name.help} backHref="/journey" />
      <div className={styles.body}>
        <Field id="babyName" label={m.name.label} optional>
          <TextInput id="babyName" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={!canEdit} autoComplete="off" />
        </Field>
        <Card tone="rose" padding="md" className={styles.preview}>
          <span className={styles.previewLabel}>{m.today.weekLabel} <span className="num">{fmtInt(week)}</span></span>
          <span className={styles.previewName} aria-live="polite">
            {preview}
          </span>
        </Card>
        <div className={styles.actions}>
          <Button fullWidth onClick={() => save(name.trim() || null)} loading={busy} disabled={!canEdit}>
            {m.common.save}
          </Button>
          {current && (
            <Button variant="quiet" fullWidth onClick={() => save(null)} disabled={busy || !canEdit}>
              {m.name.keepNeutral}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
