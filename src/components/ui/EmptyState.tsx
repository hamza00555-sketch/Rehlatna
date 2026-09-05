import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "@/components/icons/Icon";
import styles from "./EmptyState.module.css";

interface Props {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: IconName;
  state?: "default" | "loading" | "error";
  compact?: boolean;
}

/**
 * Quiet first-use / no-results state: one restrained material visual (a
 * neutral tone panel until production material imagery exists), one
 * sentence, one action.
 */
export function EmptyState({ title, body, action, icon = "sprout", state = "default", compact }: Props) {
  return (
    <section className={cx(styles.empty, styles[state], compact && styles.compact)} aria-busy={state === "loading" || undefined}>
      <div className={styles.visual} aria-hidden="true">
        <Icon name={icon} size={24} />
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
      {action && <div className={styles.action}>{action}</div>}
    </section>
  );
}
