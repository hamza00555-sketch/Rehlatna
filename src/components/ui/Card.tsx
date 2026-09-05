import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import styles from "./Card.module.css";

type Tone = "surface" | "tint" | "warm" | "raised" | "sage" | "blue" | "rose" | "attention" | "dark";
type Padding = "none" | "sm" | "md" | "panel";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padding?: Padding;
  /** Hairline by default; `strong` for selected neutral, `dashed` for undecided. */
  outline?: "hairline" | "strong" | "dashed" | "none";
  elevated?: boolean;
  href?: string;
  children: ReactNode;
}

/**
 * Surface primitive: tone + hairline border by default (shadow reserved for
 * floating elements). Cards are 20px radius per the geometry rule.
 */
export function Card({ tone = "surface", padding = "md", outline = "hairline", elevated, href, className, children, ...rest }: CardProps) {
  const classes = cx(
    styles.card,
    styles[`tone_${tone}`],
    styles[`pad_${padding}`],
    styles[`outline_${outline}`],
    elevated && styles.elevated,
    href && styles.interactive,
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
}

/**
 * Asymmetric Bento: four-column grid, 12px gaps. Children pick spans so no
 * two modules need be the same size.
 */
export function Bento({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.bento, className)}>{children}</div>;
}

type Span = "1x1" | "2x1" | "1x2" | "2x2" | "3x1" | "full";

export function BentoItem({ span = "2x1", children, className }: { span?: Span; children: ReactNode; className?: string }) {
  return <div className={cx(styles.item, styles[`span_${span}`], className)}>{children}</div>;
}
