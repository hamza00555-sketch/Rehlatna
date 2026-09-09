import { redirect } from "next/navigation";
import Link from "next/link";
import { getContext } from "@/server/session";
import { pregnancyProgress, trimesterOfWeek, MEDIA_MAX_WEEK, MEDIA_MIN_WEEK } from "@/domain/pregnancy";
import { weeklyMedia } from "@/media/weekly";
import { upcomingAppointments } from "@/server/view-models/today";
import { careWindowViews } from "@/server/view-models/care";
import { CareWindowRow } from "@/components/care/CareWindowRow";
import { DangerSigns } from "@/components/care/DangerSigns";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/Card";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { Icon } from "@/components/icons/Icon";
import { DateText } from "@/components/ui/Num";
import { fmtInt } from "@/lib/format";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./week.module.css";

export const metadata = { title: "تطور الأسبوع" };

/** Weekly development — general information, never diagnostic. Browsable week by week. */
export default async function WeeklyDevelopmentPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const progress = pregnancyProgress(ctx.data.pregnancy.dueDate, ctx.today);
  const requested = Number(weekParam);
  // Before week 5 the manifest has a single neutral entry, so browsing starts at the current week.
  const minWeek = Math.min(MEDIA_MIN_WEEK, progress.mediaWeek);
  const week = Number.isFinite(requested) && requested >= minWeek && requested <= MEDIA_MAX_WEEK ? requested : progress.mediaWeek;
  const media = weeklyMedia(week);
  const isCurrent = week === progress.mediaWeek;
  const trimester = trimesterOfWeek(week);
  const early = week < MEDIA_MIN_WEEK;
  const next = upcomingAppointments(ctx)[0];
  const care = isCurrent ? careWindowViews(ctx).visible : [];
  const canEditCare = ctx.viewer.permissions.includes("appointments:edit");

  return (
    <div className="page">
      <TopBar title={`${m.today.weekLabel} ${fmtInt(week)}`} subtitle={isCurrent ? m.today.currentWeek : undefined} backHref="/today" />

      <div className={styles.body}>
        <MediaFrame src={media.posterWebp} alt={media.alt} focalPoint={media.focalPoint} ratio={media.posterWebp ? "hero" : "card"} radius="hero" placeholderLabel={m.today.mediaPlaceholder} />
        {!media.medicallyReviewed && media.posterWebp && <StatusBadge tone="unverified">{m.today.devReviewBadge}</StatusBadge>}

        <nav className={styles.browse} aria-label={m.today.browseWeeks}>
          <Link href={`/today/week?week=${week - 1}`} className={cx(styles.browseLink, week <= minWeek && styles.browseDisabled)} aria-disabled={week <= minWeek || undefined}>
            <Icon name="back" size={20} />
            {m.today.previousWeek}
          </Link>
          {!isCurrent && (
            <Link href="/today/week" className={styles.browseCurrent}>
              {m.today.currentWeek}
            </Link>
          )}
          <Link href={`/today/week?week=${week + 1}`} className={cx(styles.browseLink, week >= MEDIA_MAX_WEEK && styles.browseDisabled)} aria-disabled={week >= MEDIA_MAX_WEEK || undefined}>
            {m.today.nextWeek}
            <Icon name="forward" size={20} />
          </Link>
        </nav>

        <section>
          <SectionTitle>{m.today.developing}</SectionTitle>
          <p className={styles.summary}>{media.developmentSummary}</p>
          <ul className={styles.points}>
            {media.developmentPoints.map((p, i) => (
              <li key={i} className={styles.point}>
                <span className={styles.dot} aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </section>

        {early ? (
          <p className={styles.summary}>{m.today.earlyWeeksNote}</p>
        ) : (
        <section>
          <SectionTitle>{m.today.sizeAndWeight}</SectionTitle>
          <div className={styles.stats}>
            <Card tone="tint" padding="md" className={styles.stat}>
              <Icon name="ruler" size={20} />
              <span className={styles.statLabel}>{m.today.length}</span>
              <span className={cx(styles.statValue, "num")}>{media.approximateSize ?? "—"}</span>
              {media.approximateSizeComparison && <span className={styles.statHint}>{m.today.sizeLike(media.approximateSizeComparison)}</span>}
              {media.lengthMeasure && <span className={styles.statHint}>{m.today.lengthMeasure[media.lengthMeasure]}</span>}
            </Card>
            <Card tone="tint" padding="md" className={styles.stat}>
              <Icon name="scale" size={20} />
              <span className={styles.statLabel}>{m.today.weight}</span>
              <span className={cx(styles.statValue, "num")}>{media.approximateWeight ?? "—"}</span>
            </Card>
          </div>
        </section>
        )}

        <section>
          <SectionTitle>{ctx.member.roles.includes("mother") ? m.today.motherContext : m.today.motherContextFamily}</SectionTitle>
          <Card tone="rose" padding="md">
            <p className={styles.summary}>{m.today.motherContextByTrimester[trimester]}</p>
          </Card>
        </section>

        {isCurrent && care.length > 0 && (
          <section>
            <SectionTitle>{m.careWindows.sectionTitle}</SectionTitle>
            <p className={styles.summary}>{m.careWindows.sectionHelp}</p>
            <RowGroup>
              {care.map((w) => (
                <CareWindowRow key={w.key} vm={w} canEdit={canEditCare} />
              ))}
            </RowGroup>
          </section>
        )}

        <DangerSigns />

        {isCurrent && (
          <section>
            <SectionTitle>{m.today.nextSteps}</SectionTitle>
            <RowGroup>
              {next ? (
                <TaskRow title={m.appointments.types[next.type] ?? next.type} meta={<DateText iso={next.date} style="short" />} href={`/journey/appointments/${next.id}`} leading={<Icon name="calendar" size={20} />} />
              ) : (
                <TaskRow title={m.today.addAppointment} href="/journey/appointments/new" leading={<Icon name="plus" size={20} />} />
              )}
              <TaskRow title={m.today.preparationReadiness} href="/preparation" leading={<Icon name="preparation" size={20} />} />
            </RowGroup>
          </section>
        )}

        <p className={styles.boundary}>{m.careWindows.disclaimer}</p>
      </div>
    </div>
  );
}
