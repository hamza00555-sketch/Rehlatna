"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PostpartumTask, PostpartumTaskKind } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Field, TextInput, DateInput, Select } from "@/components/ui/Field";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { DateText } from "@/components/ui/Num";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "@/components/more/Editors.module.css";

const KINDS: PostpartumTaskKind[] = ["feeding", "medical", "mother_care", "home", "other"];

/** Full postpartum task stack: toggle, delete, and add — edits go straight to the server. */
export function PostpartumTaskManager({ tasks, canEdit }: { tasks: PostpartumTask[]; canEdit: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PostpartumTaskKind>("feeding");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const renderRow = (t: PostpartumTask) => (
    <TaskRow
      key={t.id}
      title={t.title}
      meta={
        <>
          {m.postpartumTasks.kinds[t.kind]}
          {t.dueDate && (
            <>
              {" · "}
              <DateText iso={t.dueDate} style="short" />
            </>
          )}
        </>
      }
      state={t.done ? "completed" : "open"}
      onToggle={canEdit ? () => run(t.id, () => api(`/api/postpartum-tasks/${t.id}`, { done: !t.done }, "PATCH")) : undefined}
      trailing={canEdit ? <IconButton icon="trash" label={m.postpartumTasks.deleteTask} variant="quiet" disabled={busy === t.id} onClick={() => run(t.id, () => api(`/api/postpartum-tasks/${t.id}`, undefined, "DELETE"))} /> : undefined}
    />
  );

  return (
    <div className={styles.stack}>
      {tasks.length === 0 && <p className={styles.saved}>{m.postpartum.noTasks}</p>}
      {open.length > 0 && <RowGroup>{open.map(renderRow)}</RowGroup>}
      {done.length > 0 && <RowGroup>{done.map(renderRow)}</RowGroup>}

      {canEdit && (
        <form
          className={styles.stack}
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            void run("new", async () => {
              await api("/api/postpartum-tasks", { kind, title: title.trim(), dueDate: dueDate || undefined });
              setTitle("");
              setDueDate("");
            });
          }}
        >
          <Field id="ppt-title" label={m.postpartumTasks.title}>
            <TextInput id="ppt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={m.postpartumTasks.placeholder} />
          </Field>
          <div className={styles.row}>
            <Field id="ppt-kind" label={m.postpartumTasks.kind}>
              <Select id="ppt-kind" value={kind} onChange={(e) => setKind(e.target.value as PostpartumTaskKind)}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {m.postpartumTasks.kinds[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="ppt-date" label={m.postpartumTasks.dueDate} optional>
              <DateInput id="ppt-date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" variant="outline" disabled={busy === "new" || !title.trim()} fullWidth>
            {m.postpartumTasks.add}
          </Button>
        </form>
      )}
    </div>
  );
}
