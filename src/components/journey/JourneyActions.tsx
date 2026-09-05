"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MilestoneType } from "@/domain/types";
import { IconButton } from "@/components/ui/IconButton";
import { BottomSheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, DateInput, Select } from "@/components/ui/Field";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { api } from "@/lib/api";
import { m } from "@/i18n";

const MANUAL_TYPES: MilestoneType[] = ["manual", "family", "travel", "preparation", "financial", "medical"];

interface Props {
  canEdit: boolean;
  today: string;
  showGender: boolean;
  showName: boolean;
}

/** TopBar "add" action → sheet with manual milestone form and the optional moments. */
export function JourneyActions({ canEdit, today, showGender, showName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [type, setType] = useState<MilestoneType>("family");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  const submit = async () => {
    if (!title.trim()) {
      setError(m.forms.requiredField);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/milestones", { title: title.trim(), date, type });
      setOpen(false);
      setTitle("");
      router.refresh();
    } catch {
      setError(m.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <IconButton icon="plus" label={m.journey.addMilestone} variant="neutral" onClick={() => setOpen(true)} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.journey.addMilestone}>
        {(showGender || showName) && (
          <RowGroup>
            {showGender && <TaskRow title={m.journey.genderMoment} href="/journey/gender" />}
            {showName && <TaskRow title={m.journey.nameMoment} href="/journey/name" />}
          </RowGroup>
        )}
        <Field id="ms-title" label={m.journey.milestoneTitle} error={error ?? undefined}>
          <TextInput id="ms-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={Boolean(error)} maxLength={120} />
        </Field>
        <Field id="ms-date" label={m.journey.milestoneDate}>
          <DateInput id="ms-date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field id="ms-type" label={m.journey.milestoneType}>
          <Select id="ms-type" value={type} onChange={(e) => setType(e.target.value as MilestoneType)}>
            {MANUAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {m.journey.types[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Button fullWidth onClick={submit} loading={busy}>
          {m.common.add}
        </Button>
      </BottomSheet>
    </>
  );
}
