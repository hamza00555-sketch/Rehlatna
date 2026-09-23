import { redirect } from "next/navigation";
import Link from "next/link";
import { getContext } from "@/server/session";
import { pregnancyProgress, trimesterOfWeek } from "@/domain/pregnancy";
import { WEEKLY_MEDIA } from "@/media/weekly";
import { TopBar } from "@/components/ui/TopBar";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { fmtInt } from "@/lib/format";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./weeks.module.css";

export const metadata = { title: "مراحل نمو الجنين" };

/** Every week 0–40 in order, grouped by trimester; each row opens that week. */
export default async function AllWeeksPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const current = pregnancyProgress(ctx.data.pregnancy.dueDate, ctx.today).mediaWeek;
  const all = [...WEEKLY_MEDIA.values()].sort((a, b) => a.week - b.week);
  const groups = ([1, 2, 3] as const).map((t) => ({ trimester: t, weeks: all.filter((w) => trimesterOfWeek(w.week) === t) }));

  return (
    <div className="page">
      <TopBar title={m.today.allWeeksTitle} backHref="/today/week" />
      <p className={styles.intro}>{m.today.allWeeksIntro}</p>

      {groups.map((g) => (
        <section key={g.trimester} className={styles.group}>
          <SectionTitle>{m.today.trimesterHeading[g.trimester]}</SectionTitle>
          <ol className={styles.list}>
            {g.weeks.map((w) => (
              <li key={w.week}>
                <Link href={`/today/week?week=${w.week}`} className={cx(styles.row, w.week === current && styles.current)} aria-current={w.week === current ? "step" : undefined}>
                  {w.thumbnailWebp ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.thumbnailWebp} alt="" className={styles.thumb} loading="lazy" decoding="async" />
                  ) : (
                    <span className={styles.thumb} aria-hidden="true" />
                  )}
                  <span className={styles.text}>
                    <span className={styles.head}>
                      <span className={cx(styles.week, "num")}>
                        {m.today.weekLabel} {fmtInt(w.week)}
                      </span>
                      {w.week === current && <span className={styles.badge}>{m.today.currentWeek}</span>}
                    </span>
                    <span className={styles.summary}>{w.developmentSummary}</span>
                    {(w.approximateSize || w.approximateWeight) && (
                      <span className={cx(styles.meta, "num")}>{[w.approximateSize, w.approximateWeight].filter(Boolean).join(" · ")}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <p className={styles.boundary}>{m.careWindows.disclaimer}</p>
    </div>
  );
}
