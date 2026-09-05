import Link from "next/link";
import type { JourneyItemVM } from "@/server/view-models/journey";
import { Icon, type IconName } from "@/components/icons/Icon";
import { DateText } from "@/components/ui/Num";
import { fmtInt } from "@/lib/format";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./JourneyTimeline.module.css";

const TYPE_ICON: Record<JourneyItemVM["type"], IconName> = {
  automatic: "sprout",
  manual: "edit",
  medical: "stethoscope",
  family: "heart",
  financial: "wallet",
  travel: "car",
  preparation: "bag",
  birth: "heart",
  postpartum: "sprout",
};

const KEY_ICON: Record<string, IconName> = {
  setup: "sprout",
  hospital_bag: "bag",
  due_window: "calendar",
  due_date: "calendar",
  birth: "heart",
  forty_days: "moon",
};

interface Props {
  items: JourneyItemVM[];
  title?: string;
}

/**
 * Continuous vertical narrative. Exactly one item is `current`; past and
 * future are visually quiet. Media thumbnails sit at the start, the rail
 * between them and the copy (per the approved composition).
 */
export function JourneyTimeline({ items, title }: Props) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section} aria-label={title}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}
      <ol className={styles.list}>
        {items.map((item, index) => {
          const icon: IconName = (item.key ? KEY_ICON[item.key] : undefined) ?? TYPE_ICON[item.type];
          const stateLabel = item.state === "current" ? m.a11y.milestoneCurrent : item.state === "past" ? m.a11y.milestonePast : m.a11y.milestoneFuture;
          return (
            <li key={item.id} className={cx(styles.item, styles[item.state], index === 0 && styles.first, index === items.length - 1 && styles.last)}>
              <span className={styles.thumb} aria-hidden="true">
                <Icon name={icon} size={24} />
              </span>
              <span className={styles.rail} aria-hidden="true">
                <span className={styles.node} />
              </span>
              <Link href={item.href} className={styles.text} aria-current={item.state === "current" ? "step" : undefined}>
                <span className="sr-only">{stateLabel}: </span>
                <span className={styles.title}>{item.state === "current" ? m.journey.current : item.title}</span>
                {item.state === "current" && <span className={styles.subtitle}>{item.title}</span>}
                <span className={styles.meta}>
                  {item.week !== undefined && item.type !== "birth" && (
                    <>
                      {m.today.weekLabel} <span className="num">{fmtInt(item.week)}</span>
                      {" · "}
                    </>
                  )}
                  {item.state === "future" && item.daysFromToday > 0 ? m.journey.nextIn(item.daysFromToday) : <DateText iso={item.date} style="short" />}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
