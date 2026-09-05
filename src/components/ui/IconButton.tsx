import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { cx } from "@/lib/cx";
import styles from "./IconButton.module.css";

type Variant = "neutral" | "overMedia" | "quiet" | "accent";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Required: icon-only controls always carry a screen-reader label. */
  label: string;
  variant?: Variant;
  href?: string;
  filled?: boolean;
}

/** Compact circular action — 20px optical icon inside a 44px target. */
export function IconButton({ icon, label, variant = "neutral", href, filled, className, ...rest }: Props) {
  const classes = cx(styles.button, styles[variant], className);
  const content = <Icon name={icon} size={20} filled={filled} />;
  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label} title={label}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" {...rest} className={classes} aria-label={label} title={label}>
      {content}
    </button>
  );
}
