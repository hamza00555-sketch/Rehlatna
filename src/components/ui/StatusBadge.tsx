import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./StatusBadge.module.css";

export type BadgeTone = "ready" | "needed" | "future" | "unverified" | "medical";

/** Small semantic label. Always text with colour — never colour alone. */
export function StatusBadge({ tone, children, className }: { tone: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cx(styles.badge, styles[tone], className)}>{children}</span>;
}
