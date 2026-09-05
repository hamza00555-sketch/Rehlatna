import Link from "next/link";
import type { PostpartumHeroVM } from "@/server/view-models/today";
import type { BabyView } from "@/server/serializers";
import { Icon } from "@/components/icons/Icon";
import { DateText } from "@/components/ui/Num";
import { PostpartumTaskList } from "@/components/postpartum/PostpartumTaskList";
import { fmtInt } from "@/lib/format";
import { ageWord, m, unitFor } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./PostpartumHero.module.css";

interface Props {
  vm: PostpartumHeroVM;
  baby: BabyView | null;
  member: { displayName: string; initials: string };
  todayIso: string;
}

/**
 * After birth the hero shows the family's own photo (when supplied) or the
 * approved neutral material-and-light fallback — never a generated baby.
 * Age leads with days, then weeks, then months.
 */
export function PostpartumHero({ vm, baby, member, todayIso }: Props) {
  const { age } = vm;
  const name = m.baby.nameOf(baby?.displayName ?? null);
  const leadValue = age.leadUnit === "days" ? age.days : age.leadUnit === "weeks" ? age.weeks : age.months;
  const lead = fmtInt(leadValue);
  const unit = unitFor(leadValue, age.leadUnit);
  const who = ageWord(baby?.gender ?? "unknown");
  const ageLine =
    age.leadUnit === "days"
      ? m.postpartum.ageDays(age.days, who)
      : age.leadUnit === "weeks"
        ? m.postpartum.ageWeeks(age.weeks, age.weekDays, who)
        : m.postpartum.ageMonths(age.months, age.monthDays, who);

  return (
    <section className={cx(styles.hero, !vm.hasPersonalMedia && styles.neutral)}>
      <div className={styles.content}>
        <div className={styles.topRow}>
          <span className={styles.date}>
            <DateText iso={todayIso} style="monthDay" />
          </span>
          <Link href="/more/family" className={styles.avatar} aria-label={member.displayName}>
            <span>{member.initials}</span>
          </Link>
        </div>

        <div className={styles.nameBlock}>
          <h1 className={styles.name}>{name}</h1>
          <p className={styles.ageLine}>{ageLine}</p>
        </div>

        <div className={styles.ageBlock}>
          <span className={cx(styles.heroNumber, "num")}>{lead}</span>
          <span className={styles.unit}>{unit}</span>
          {age.withinFortyDays && age.fortyDayNumber && (
            <span className={styles.forty}>
              {m.postpartum.fortyDays} · {m.postpartum.fortyDayProgress(age.fortyDayNumber)}
            </span>
          )}
        </div>

        {!vm.hasPersonalMedia && (
          <Link href="/more/baby" className={styles.addPhoto}>
            <Icon name="camera" size={20} />
            <span>{m.postpartum.addPhoto}</span>
          </Link>
        )}
      </div>

      <div className={styles.sheet}>
        <h2 className={styles.sheetTitle}>{m.postpartum.tasksTitle}</h2>
        <PostpartumTaskList tasks={vm.tasks} />
        <Link href="/journey/postpartum" className={styles.historyLink}>
          {m.postpartum.viewAll}
          <Icon name="forward" size={16} />
        </Link>
        <Link href="/journey" className={styles.historyLink}>
          {m.postpartum.viewPregnancyHistory}
          <Icon name="forward" size={16} />
        </Link>
      </div>
    </section>
  );
}
