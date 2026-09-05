"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./PostpartumTaskList.module.css";

interface Task {
  id: string;
  title: string;
  kind: string;
  done: boolean;
  dueDate?: string;
}

/** Dark compact rows for feeding, medical and mother-care tasks — max five in view. */
export function PostpartumTaskList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (tasks.length === 0) return <p className={styles.empty}>{m.postpartum.noTasks}</p>;

  return (
    <ul className={styles.list}>
      {tasks.slice(0, 5).map((t) => (
        <li key={t.id}>
          <button
            type="button"
            role="checkbox"
            aria-checked={t.done}
            disabled={busy === t.id}
            className={cx(styles.row, t.kind === "medical" && styles.medical, t.done && styles.completed)}
            onClick={async () => {
              setBusy(t.id);
              try {
                await api(`/api/postpartum-tasks/${t.id}`, { done: !t.done }, "PATCH");
                router.refresh();
              } finally {
                setBusy(null);
              }
            }}
          >
            <span className={styles.check} aria-hidden="true">
              {t.done && <Icon name="check" size={16} />}
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{t.title}</span>
              <span className={styles.meta}>{m.postpartumTasks.kinds[t.kind]}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
