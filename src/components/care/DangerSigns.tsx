"use client";

import { useState } from "react";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { BottomSheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/icons/Icon";
import { m } from "@/i18n";
import styles from "./CareWindow.module.css";

/** Always reachable, never alarming: which symptoms should not wait for the next appointment. */
export function DangerSigns() {
  const [open, setOpen] = useState(false);
  const d = m.careWindows.dangerSigns;
  return (
    <>
      <RowGroup>
        <TaskRow title={d.row} meta={d.rowMeta} onClick={() => setOpen(true)} leading={<Icon name="alert" size={20} />} />
      </RowGroup>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={d.title}>
        <div className={styles.body}>
          <p className={styles.lead}>{d.intro}</p>
          <ul className={styles.list}>
            {d.items.map((line) => (
              <li key={line} className={styles.item}>
                <span className={styles.dot} aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <p className={styles.note}>{d.outro}</p>
        </div>
      </BottomSheet>
    </>
  );
}
