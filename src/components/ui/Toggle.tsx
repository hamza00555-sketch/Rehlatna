"use client";

import { cx } from "@/lib/cx";
import styles from "./Toggle.module.css";

interface Props {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Switch with role="switch"; state is shown by position, text and colour. */
export function Toggle({ id, checked, onChange, label, description, disabled }: Props) {
  return (
    <div className={cx(styles.row, disabled && styles.disabled)}>
      <div className={styles.text}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cx(styles.switch, checked && styles.on)}
        data-hit-extended=""
        onClick={() => onChange(!checked)}
      >
        <span className={styles.knob} />
        <span className="sr-only">{checked ? "مفعّل" : "غير مفعّل"}</span>
      </button>
    </div>
  );
}
