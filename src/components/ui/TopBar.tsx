import type { ReactNode } from "react";
import { IconButton } from "./IconButton";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./TopBar.module.css";

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Back destination; the icon points to the inline start for RTL. */
  backHref?: string;
  /** No more than two actions. */
  actions?: ReactNode;
  variant?: "standard" | "overMedia";
  as?: "h1" | "h2";
}

/** Minimal header: one title, optional subtitle, ≤2 actions, no breadcrumbs. */
export function TopBar({ title, subtitle, backHref, actions, variant = "standard", as: Heading = "h1" }: Props) {
  return (
    <header className={cx(styles.bar, styles[variant])}>
      {backHref && (
        <IconButton icon="back" label={m.common.back} href={backHref} variant={variant === "overMedia" ? "overMedia" : "quiet"} className={styles.back} />
      )}
      <div className={styles.text}>
        <Heading className={styles.title}>{title}</Heading>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
