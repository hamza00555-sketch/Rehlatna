import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { cx } from "@/lib/cx";
import styles from "./TaskRow.module.css";

type State = "open" | "completed" | "undecided" | "disabled";

interface Props {
  title: string;
  meta?: ReactNode;
  state?: State;
  /** One clear action: toggle (checkbox), navigate (href) OR open (onClick). Never several. */
  onToggle?: () => void;
  href?: string;
  onClick?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

/** Compact task/row primitive for small actions and consumables. */
export function TaskRow({ title, meta, state = "open", onToggle, href, onClick, leading, trailing, className }: Props) {
  const classes = cx(styles.row, styles[state], className);
  const body = (
    <>
      {onToggle && (
        <span className={cx(styles.check, state === "completed" && styles.checkOn)} aria-hidden="true">
          {state === "completed" && <Icon name="check" size={16} />}
        </span>
      )}
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
      {(href || onClick) && (
        <span className={styles.chevron} aria-hidden="true">
          <Icon name="forward" size={20} />
        </span>
      )}
    </>
  );

  if (onClick && !onToggle && !href && state !== "disabled") {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {body}
      </button>
    );
  }

  if (onToggle && state !== "disabled" && trailing) {
    // A secondary control beside a toggle: split into siblings so no
    // interactive element nests inside another.
    return (
      <div className={classes}>
        <button type="button" className={styles.toggleArea} onClick={onToggle} role="checkbox" aria-checked={state === "completed"}>
          <span className={cx(styles.check, state === "completed" && styles.checkOn)} aria-hidden="true">
            {state === "completed" && <Icon name="check" size={16} />}
          </span>
          {leading && <span className={styles.leading}>{leading}</span>}
          <span className={styles.text}>
            <span className={styles.title}>{title}</span>
            {meta && <span className={styles.meta}>{meta}</span>}
          </span>
        </button>
        <span className={styles.trailing}>{trailing}</span>
      </div>
    );
  }
  if (onToggle && state !== "disabled") {
    return (
      <button type="button" className={classes} onClick={onToggle} role="checkbox" aria-checked={state === "completed"}>
        {body}
      </button>
    );
  }
  if (href && state !== "disabled") {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <div className={classes} aria-disabled={state === "disabled" || undefined}>
      {body}
    </div>
  );
}

export function RowGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.group, className)}>{children}</div>;
}
