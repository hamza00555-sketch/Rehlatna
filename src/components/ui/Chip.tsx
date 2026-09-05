import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Chip.module.css";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  children: ReactNode;
}

/** FilterChip — the only control that defaults to pill geometry. */
export function Chip({ selected = false, children, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      {...rest}
      className={cx(styles.chip, selected && styles.selected, className)}
      data-hit-extended=""
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className={styles.row} role="radiogroup" aria-label={label}>
      {children}
    </div>
  );
}
