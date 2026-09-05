import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { cx } from "@/lib/cx";
import styles from "./ChoiceCard.module.css";

/**
 * Large mutually-exclusive (or multi) choice with real radio/checkbox
 * semantics. Selection shows through border, weight AND a check mark — never
 * colour alone. Label and consequence stay visible together.
 */

interface GroupProps {
  legend: string;
  help?: string;
  children: ReactNode;
  columns?: 1 | 2 | 3;
}

export function ChoiceGroup({ legend, help, children, columns = 1 }: GroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      {help && <p className={styles.help}>{help}</p>}
      <div className={cx(styles.list, columns === 2 && styles.twoCols, columns === 3 && styles.threeCols)}>{children}</div>
    </fieldset>
  );
}

interface CardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  variant?: "neutral" | "medical" | "boy" | "girl";
  type?: "radio" | "checkbox";
  disabled?: boolean;
  leading?: ReactNode;
}

export function ChoiceCard({ name, value, checked, onChange, title, description, variant = "neutral", type = "radio", disabled, leading }: CardProps) {
  const id = `${name}-${value}`;
  return (
    <label
      htmlFor={id}
      className={cx(styles.card, styles[variant], checked && styles.selected, disabled && styles.disabled)}
      data-checked={checked || undefined}
    >
      <input
        id={id}
        className={styles.input}
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
      />
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      <span className={styles.mark} aria-hidden="true">
        {checked && <Icon name="check" size={16} />}
      </span>
    </label>
  );
}
