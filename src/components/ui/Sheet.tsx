"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./IconButton";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./Sheet.module.css";

/**
 * ContentSheet — soft sheet attached to media or content (static), and
 * BottomSheet — a modal sheet built on <dialog> for correct focus handling.
 * Both use the 28px hero radius on the top corners only.
 */

export function ContentSheet({ children, tone = "light", className }: { children: ReactNode; tone?: "light" | "dark"; className?: string }) {
  return <section className={cx(styles.content, tone === "dark" && styles.contentDark, className)}>{children}</section>;
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tone?: "light" | "dark";
}

export function BottomSheet({ open, onClose, title, children, tone = "light" }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleClose = () => onClose();
    const handleClick = (e: MouseEvent) => {
      if (e.target === el) onClose();
    };
    el.addEventListener("close", handleClose);
    el.addEventListener("click", handleClick);
    return () => {
      el.removeEventListener("close", handleClose);
      el.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  return (
    <dialog ref={ref} className={cx(styles.dialog, tone === "dark" && styles.dialogDark)} aria-label={title}>
      <div className={styles.panel}>
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <IconButton icon="close" label={m.a11y.closeSheet} variant="quiet" onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
