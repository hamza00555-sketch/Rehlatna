"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TravelPlan } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Field, TextInput, DateInput, TextArea } from "@/components/ui/Field";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./Editors.module.css";

interface Props {
  plan: TravelPlan | null;
  fromCity: string;
  toCity: string;
  canEdit: boolean;
}

export function TravelPlanEditor({ plan, fromCity, toCity, canEdit }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(plan?.fromCity ?? fromCity);
  const [to, setTo] = useState(plan?.toCity ?? toCity);
  const [plannedDate, setPlannedDate] = useState(plan?.plannedDate ?? "");
  const [returnDate, setReturnDate] = useState(plan?.returnDate ?? "");
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [tasks, setTasks] = useState(plan?.tasks ?? []);
  const [newTask, setNewTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      await api("/api/travel", { fromCity: from.trim(), toCity: to.trim(), plannedDate: plannedDate || undefined, returnDate: returnDate || undefined, notes: notes.trim() || undefined, tasks }, "PUT");
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.row}>
        <Field id="tp-from" label={m.travel.from}>
          <TextInput id="tp-from" value={from} onChange={(e) => setFrom(e.target.value)} disabled={!canEdit} />
        </Field>
        <Field id="tp-to" label={m.travel.to}>
          <TextInput id="tp-to" value={to} onChange={(e) => setTo(e.target.value)} disabled={!canEdit} />
        </Field>
      </div>
      <div className={styles.row}>
        <Field id="tp-date" label={m.travel.plannedDate} optional>
          <DateInput id="tp-date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} disabled={!canEdit} />
        </Field>
        <Field id="tp-return" label={m.travel.returnDate} optional>
          <DateInput id="tp-return" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} disabled={!canEdit} />
        </Field>
      </div>

      <section>
        <SectionTitle as="h3">{m.travel.tasks}</SectionTitle>
        {tasks.length > 0 && (
          <RowGroup>
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                title={t.title}
                state={t.done ? "completed" : "open"}
                onToggle={canEdit ? () => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))) : undefined}
                trailing={canEdit ? <IconButton icon="trash" label={m.common.delete} variant="quiet" onClick={() => setTasks(tasks.filter((x) => x.id !== t.id))} /> : undefined}
              />
            ))}
          </RowGroup>
        )}
        {canEdit && (
          <div className={styles.addRow}>
            <TextInput
              aria-label={m.travel.addTask}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTask.trim()) {
                  e.preventDefault();
                  setTasks([...tasks, { id: `tmp_${Date.now()}`, title: newTask.trim(), done: false }]);
                  setNewTask("");
                }
              }}
            />
            <IconButton
              icon="plus"
              label={m.travel.addTask}
              disabled={!newTask.trim()}
              onClick={() => {
                setTasks([...tasks, { id: `tmp_${Date.now()}`, title: newTask.trim(), done: false }]);
                setNewTask("");
              }}
            />
          </div>
        )}
      </section>

      <Field id="tp-notes" label={m.common.notes} optional>
        <TextArea id="tp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} />
      </Field>

      {canEdit && (
        <Button fullWidth onClick={save} loading={busy}>
          {m.common.save}
        </Button>
      )}
      {saved && (
        <p className={styles.saved} role="status">
          {m.travel.saved}
        </p>
      )}
    </div>
  );
}
