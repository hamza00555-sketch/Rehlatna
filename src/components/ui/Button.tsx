import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import styles from "./Button.module.css";

type Variant = "primary" | "lightOverMedia" | "outline" | "danger" | "quiet";

interface BaseProps {
  variant?: Variant;
  fullWidth?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  children: ReactNode;
  className?: string;
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = BaseProps & { href: string; disabled?: boolean; onClick?: undefined; type?: undefined };

/**
 * PrimaryButton — one confident action per decision surface. Neutral navy,
 * never gender-coloured. `outline`, `danger` and `quiet` are compositions
 * from approved primitives (recorded in docs/design-notes.md).
 */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", fullWidth, loading, leading, children, className } = props;
  const classes = cx(styles.button, styles[variant], fullWidth && styles.fullWidth, loading && styles.loading, className);

  if ("href" in props && props.href) {
    if (props.disabled) {
      return (
        <span className={cx(classes, styles.disabledLink)} aria-disabled="true">
          {leading}
          <span>{children}</span>
        </span>
      );
    }
    return (
      <Link href={props.href} className={classes}>
        {leading}
        <span>{children}</span>
      </Link>
    );
  }

  const { variant: _v, fullWidth: _f, loading: _l, leading: _le, className: _c, children: _ch, ...rest } = props as ButtonProps;
  return (
    <button {...rest} className={classes} disabled={rest.disabled || loading} aria-busy={loading || undefined}>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : leading}
      <span>{children}</span>
    </button>
  );
}
