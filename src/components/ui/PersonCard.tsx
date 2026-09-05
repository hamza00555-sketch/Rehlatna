import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { cx } from "@/lib/cx";
import styles from "./PersonCard.module.css";

interface Props {
  name: string;
  /** Relationship text identifies the role — never colour. */
  relation: string;
  href?: string;
  variant?: "default" | "baby";
  meta?: ReactNode;
  initials?: string;
}

export function PersonCard({ name, relation, href, variant = "default", meta, initials }: Props) {
  const classes = cx(styles.card, variant === "baby" && styles.baby, href && styles.interactive);
  const body = (
    <>
      <span className={styles.avatar} aria-hidden="true">
        {initials ? <span className={styles.initials}>{initials}</span> : <Icon name={variant === "baby" ? "sprout" : "user"} size={20} />}
      </span>
      <span className={styles.text}>
        <span className={styles.name}>{name}</span>
        <span className={styles.relation}>{relation}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
      {href && (
        <span className={styles.chevron} aria-hidden="true">
          <Icon name="forward" size={20} />
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
