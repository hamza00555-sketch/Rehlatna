"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./BottomNavigation.module.css";

const ITEMS: { href: string; icon: IconName; label: string }[] = [
  { href: "/today", icon: "today", label: m.nav.today },
  { href: "/journey", icon: "journey", label: m.nav.journey },
  { href: "/preparation", icon: "preparation", label: m.nav.preparation },
  { href: "/more", icon: "more", label: m.nav.more },
];

/**
 * Exactly four destinations. Finance is never a tab — it lives inside More
 * (and a Today bento module) for authorized members only.
 */
export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label={m.a11y.bottomNav}>
      <ul className={styles.list}>
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className={styles.item}>
              <Link href={item.href} className={cx(styles.link, active && styles.active)} aria-current={active ? "page" : undefined}>
                <Icon name={item.icon} size={24} filled={active} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
