import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { fmtInt } from "@/lib/format";
import styles from "./Progress.module.css";

type Tone = "onTrack" | "attention" | "complete" | "journey";

interface ProgressProps {
  /** 0..1 */
  ratio: number;
  /** Plain-language caption — progress is never shown alone. */
  caption: ReactNode;
  trailing?: ReactNode;
  tone?: Tone;
  label: string;
  className?: string;
}

/** Linear progress paired with amounts/state. Animates only when the value changes. */
export function Progress({ ratio, caption, trailing, tone = "onTrack", label, className }: ProgressProps) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  const style = { "--fill": `${pct}%` } as CSSProperties;
  return (
    <div className={cx(styles.wrap, styles[tone], className)}>
      <div className={styles.captionRow}>
        <span className={styles.caption}>{caption}</span>
        {trailing && <span className={styles.trailing}>{trailing}</span>}
      </div>
      <div className={styles.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={styles.fill} style={style} />
      </div>
    </div>
  );
}

interface RingProps {
  ratio: number;
  phase: "before_birth" | "at_birth" | "after_birth";
  label: string;
}

/** GoalRing — max three per row, percentage inside, phase below. */
export function GoalRing({ ratio, phase, label }: RingProps) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  const style = { "--pct": `${pct}%` } as CSSProperties;
  return (
    <div className={styles.ringWrap}>
      <div className={cx(styles.ring, styles[`ring_${phase}`])} style={style} role="img" aria-label={`${label}: ${fmtInt(pct)}%`}>
        <span className={cx(styles.ringValue, "num")} dir="ltr">
          {fmtInt(pct)}%
        </span>
      </div>
      <span className={styles.ringLabel}>{label}</span>
    </div>
  );
}
