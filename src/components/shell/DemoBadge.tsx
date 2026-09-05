import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./DemoBadge.module.css";

/**
 * Always visible while demo fixtures are active, so demo never masquerades
 * as real data. Sits above the bottom navigation inside the app shell and at
 * the top edge on nav-less flows.
 */
export function DemoBadge({ placement = "top" }: { placement?: "top" | "aboveNav" }) {
  return (
    <div className={cx(styles.badge, placement === "aboveNav" && styles.aboveNav)} role="status">
      {m.common.demoBadge}
    </div>
  );
}
