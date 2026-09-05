import type { ReactNode } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import styles from "./SectionTitle.module.css";

interface Props {
  children: ReactNode;
  action?: { label: string; href: string };
  as?: "h2" | "h3";
  className?: string;
}

export function SectionTitle({ children, action, as: Heading = "h2", className }: Props) {
  return (
    <div className={cx(styles.row, className)}>
      <Heading className={styles.title}>{children}</Heading>
      {action && (
        <Link href={action.href} className={styles.action}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
