import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { buildJourneyViewModel } from "@/server/view-models/journey";
import { postpartumAge } from "@/domain/pregnancy";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import { PostpartumTaskManager } from "@/components/postpartum/PostpartumTaskManager";
import { m, ageWord, days } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./postpartum.module.css";

export const metadata = { title: "الأربعين والأشهر الأولى" };

/**
 * The postpartum chapter: forty days, first three months, the family's own
 * task rhythm, feeding choice, and a way back into the pregnancy history.
 */
export default async function PostpartumJourneyPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const baby = ctx.data.baby;
  if (!baby?.birthDate) redirect("/journey");
  const age = postpartumAge(baby.birthDate, ctx.today);
  const vm = buildJourneyViewModel(ctx);
  const canEdit = can(ctx.viewer, "care:edit");
  const feeding = ctx.data.feedingPreference;
  const fortyRatio = Math.min(1, age.days / 40);
  const monthIndex = Math.min(3, Math.floor(age.days / 30)); // 0..3
  const pregnancyCount = vm.sections.pregnancy.length;

  return (
    <div className="page">
      <TopBar title={m.postpartum.fortyTitle} subtitle={m.postpartum.fortySubtitle} backHref="/journey" />
      <div className={styles.body}>
        <Card tone="rose" padding="panel">
          <div className={styles.head}>
            <span className={styles.headIcon} aria-hidden="true">
              <Icon name="sprout" size={24} />
            </span>
            <div className={styles.headText}>
              <span className={styles.headTitle}>{m.baby.nameOf(baby.displayName ?? null)}</span>
              <span className={styles.headMeta}>
                {m.postpartum.ageDays(age.days, ageWord(baby.gender))} · <DateText iso={baby.birthDate} style="long" />
              </span>
            </div>
          </div>
        </Card>

        <section>
          <SectionTitle>{m.postpartum.fortyDays}</SectionTitle>
          <Card tone="surface" padding="md">
            <Progress
              ratio={fortyRatio}
              tone={age.withinFortyDays ? "onTrack" : "complete"}
              label={m.postpartum.fortyDays}
              caption={age.withinFortyDays && age.fortyDayNumber ? m.postpartum.fortyDayProgress(age.fortyDayNumber) : m.postpartum.fortyComplete}
              trailing={age.withinFortyDays && age.fortyDayNumber ? <span>{m.postpartum.remaining(days(Math.max(0, 40 - age.fortyDayNumber)))}</span> : <Icon name="check" size={20} />}
            />
          </Card>
        </section>

        <section>
          <SectionTitle>{m.postpartum.firstMonths}</SectionTitle>
          <div className={styles.months}>
            {m.postpartum.monthLabels.map((label, i) => {
              const n = i + 1;
              const state = monthIndex >= n ? "done" : monthIndex === n - 1 ? "now" : "future";
              return (
                <div key={label} className={cx(styles.month, state === "done" && styles.monthOn, state === "now" && styles.monthNow)}>
                  <span className={styles.monthLabel}>{label}</span>
                  <span className={styles.monthValue}>{state === "done" ? m.common.done : state === "now" ? m.postpartum.monthNow(days(Math.max(0, age.days - i * 30))) : m.status.future}</span>
                </div>
              );
            })}
          </div>
        </section>

        {vm.sections.postpartum.length > 0 && (
          <section>
            <JourneyTimeline items={vm.sections.postpartum} today={{ iso: ctx.today }} title={m.journey.postpartumSection} />
          </section>
        )}

        <section>
          <SectionTitle action={{ label: canEdit ? m.common.edit : m.common.view, href: "/more/feeding" }}>{m.postpartum.feedingPreferences}</SectionTitle>
          <Card tone="surface" padding="md">
            {feeding && feeding.methods.length > 0 ? (
              <div className={styles.chips}>
                {feeding.methods.map((mth) => (
                  <StatusBadge key={mth} tone="ready">
                    {m.feeding[mth]}
                  </StatusBadge>
                ))}
              </div>
            ) : (
              <span className={styles.headMeta}>{m.feeding.none}</span>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>{m.postpartum.tasksAll}</SectionTitle>
          <PostpartumTaskManager tasks={ctx.data.postpartumTasks} canEdit={canEdit} />
        </section>

        <section>
          <RowGroup>
            <TaskRow title={m.postpartum.pregnancyHistory} meta={m.postpartum.pregnancyHistoryMeta(pregnancyCount)} href="/journey" leading={<Icon name="journey" size={20} />} />
          </RowGroup>
        </section>
      </div>
    </div>
  );
}
