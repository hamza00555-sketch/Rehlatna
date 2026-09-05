import { m } from "@/i18n";
import styles from "./DemoBadge.module.css";

/** Always visible while demo fixtures are active, so demo never masquerades as real data. */
export function DemoBadge() {
  return (
    <div className={styles.badge} role="status">
      {m.common.demoBadge}
    </div>
  );
}
