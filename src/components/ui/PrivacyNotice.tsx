import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { cx } from "@/lib/cx";
import styles from "./PrivacyNotice.module.css";

type Variant = "general" | "private" | "warning";

const ICONS: Record<Variant, IconName> = { general: "info", private: "lock", warning: "alert" };

/**
 * Inline explanation of who can see what, placed before the user commits
 * sensitive information. `private` corresponds to the spec's finance-private
 * variant (naming generalised: the planner is configurable, not "father").
 */
export function PrivacyNotice({ variant = "general", children }: { variant?: Variant; children: ReactNode }) {
  return (
    <div className={cx(styles.notice, styles[variant])} role="note">
      <span className={styles.icon} aria-hidden="true">
        <Icon name={ICONS[variant]} size={20} />
      </span>
      <div className={styles.text}>{children}</div>
    </div>
  );
}
