"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedingMethod, FeedingPreference } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { Field, TextArea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "@/components/more/Editors.module.css";

const METHODS: FeedingMethod[] = ["breastfeeding", "pumped", "formula"];

/**
 * Multi-select: the family chooses any combination. Formula is one option
 * among equals with a neutral explanation — never a default, never implied.
 */
export function FeedingEditor({ preference, canEdit }: { preference: FeedingPreference | null; canEdit: boolean }) {
  const router = useRouter();
  const [methods, setMethods] = useState<FeedingMethod[]>(preference?.methods ?? []);
  const [notes, setNotes] = useState(preference?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (value: string) => {
    const mth = value as FeedingMethod;
    setSaved(false);
    setMethods((prev) => (prev.includes(mth) ? prev.filter((x) => x !== mth) : [...prev, mth]));
  };

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      await api("/api/feeding", { methods, notes: notes.trim() || undefined }, "PUT");
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.stack}>
      <ChoiceGroup legend={m.postpartum.feedingPreferences} help={m.postpartum.feedingIntro}>
        {METHODS.map((mth) => (
          <ChoiceCard
            key={mth}
            type="checkbox"
            name="feeding"
            value={mth}
            checked={methods.includes(mth)}
            onChange={toggle}
            title={m.feeding[mth]}
            description={mth === "formula" ? m.feeding.formulaHelp : undefined}
            disabled={!canEdit}
          />
        ))}
      </ChoiceGroup>
      <Field id="feeding-notes" label={m.feeding.notes} optional help={m.feeding.notesHelp}>
        <TextArea id="feeding-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} />
      </Field>
      {canEdit && (
        <Button onClick={save} disabled={busy} fullWidth>
          {m.common.save}
        </Button>
      )}
      {saved && <p className={styles.saved} role="status">{m.feeding.saved}</p>}
    </div>
  );
}
