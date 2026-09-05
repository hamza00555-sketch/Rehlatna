import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { cx } from "@/lib/cx";
import styles from "./CareProviderRow.module.css";

type Kind = "doctor" | "hospital" | "insurance";
const ICONS: Record<Kind, IconName> = { doctor: "stethoscope", hospital: "hospital", insurance: "shield" };

interface Props {
  kind: Kind;
  title: string;
  subtitle?: ReactNode;
  href: string;
  /** Coverage unverified/stale → warning treatment with explicit text. */
  unverified?: boolean;
  trailing?: ReactNode;
}

export function CareProviderRow({ kind, title, subtitle, href, unverified, trailing }: Props) {
  return (
    <Link href={href} className={cx(styles.row, unverified && styles.unverified)}>
      <span className={styles.icon} aria-hidden="true">
        <Icon name={ICONS[kind]} size={20} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        {trailing && <span className={styles.trailing}>{trailing}</span>}
      </span>
      <span className={styles.chevron} aria-hidden="true">
        <Icon name="forward" size={20} />
      </span>
    </Link>
  );
}
