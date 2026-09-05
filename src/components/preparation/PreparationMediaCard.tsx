import Link from "next/link";
import type { PreparationStatus } from "@/domain/types";
import type { PreparationItemView } from "@/server/serializers";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { Icon, type IconName } from "@/components/icons/Icon";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./PreparationMediaCard.module.css";

export const STATUS_ICON: Record<PreparationStatus, IconName> = {
  owned: "check",
  need_to_buy: "alert",
  not_required: "minus",
  undecided: "more",
};

/** Status shown as text AND icon — never colour alone. */
export function StatusLine({ status, className }: { status: PreparationStatus; className?: string }) {
  return (
    <span className={cx(styles.status, styles[`status_${status}`], className)}>
      <span className={styles.statusIcon} aria-hidden="true">
        <Icon name={STATUS_ICON[status]} size={16} />
      </span>
      {m.preparation.statuses[status]}
    </span>
  );
}

/**
 * Image-led object card for major physical items. Production studio
 * photography is pending — the neutral MediaFrame placeholder stands in.
 */
export function PreparationMediaCard({ item }: { item: PreparationItemView }) {
  return (
    <Link href={`/preparation/item/${item.id}`} className={cx(styles.card, styles[item.status])}>
      <MediaFrame alt={item.title} ratio="card" radius="card" placeholderLabel={m.preparation.imagePlaceholder} className={styles.media} />
      <span className={styles.title}>{item.title}</span>
      <StatusLine status={item.status} />
    </Link>
  );
}
