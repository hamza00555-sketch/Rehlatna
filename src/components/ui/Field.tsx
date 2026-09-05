import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Field.module.css";

/**
 * Labeled RTL inputs. The label always sits outside the field; placeholders
 * are never the only label. Numeric/date values render LTR with tabular
 * numerals inside the RTL layout.
 */

interface FieldProps {
  id: string;
  label: string;
  help?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}

export function Field({ id, label, help, error, optional, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> · اختياري</span>}
      </label>
      {children}
      {help && !error && (
        <p id={`${id}-help`} className={styles.help}>
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; numeric?: boolean };

export function TextInput({ invalid, numeric, className, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      className={cx(styles.control, invalid && styles.invalid, numeric && styles.numeric, className)}
      aria-invalid={invalid || undefined}
      dir={numeric ? "ltr" : rest.dir}
    />
  );
}

/** Native date control styled per DateSelector; digits stay Latin and LTR. */
export function DateInput({ invalid, className, ...rest }: Omit<InputProps, "type" | "numeric">) {
  return (
    <input
      type="date"
      {...rest}
      className={cx(styles.control, styles.numeric, styles.date, invalid && styles.invalid, className)}
      aria-invalid={invalid || undefined}
      dir="ltr"
    />
  );
}

export function TimeInput({ invalid, className, ...rest }: Omit<InputProps, "type" | "numeric">) {
  return (
    <input
      type="time"
      {...rest}
      className={cx(styles.control, styles.numeric, invalid && styles.invalid, className)}
      aria-invalid={invalid || undefined}
      dir="ltr"
    />
  );
}

/** Currency/number input with a fixed unit label outside the digits. */
export function MoneyInput({ unit, invalid, className, ...rest }: Omit<InputProps, "type" | "numeric"> & { unit: string }) {
  return (
    <div className={cx(styles.moneyWrap, invalid && styles.invalid)}>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="1"
        {...rest}
        className={cx(styles.control, styles.numeric, styles.moneyInput, className)}
        aria-invalid={invalid || undefined}
        dir="ltr"
      />
      <span className={styles.unit} aria-hidden="true">
        {unit}
      </span>
    </div>
  );
}

export function TextArea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} rows={rest.rows ?? 3} className={cx(styles.control, styles.textarea, invalid && styles.invalid, className)} aria-invalid={invalid || undefined} />;
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select {...rest} className={cx(styles.control, styles.select, invalid && styles.invalid, className)} aria-invalid={invalid || undefined}>
      {children}
    </select>
  );
}
