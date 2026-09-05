import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { buildJourneyViewModel } from "@/server/view-models/journey";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DateText } from "@/components/ui/Num";
import { DeleteMilestone } from "@/components/journey/DeleteMilestone";
import { fmtInt } from "@/lib/format";
import { m } from "@/i18n";
import styles from "./milestone.module.css";

type Params = { params: Promise<{ id: string }> };

export default async function MilestoneDetailPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const vm = buildJourneyViewModel(ctx);
  const item = vm.items.find((i) => i.id === decodeURIComponent(id));
  if (!item) notFound();

  const tone = item.state === "current" ? "needed" : item.state === "past" ? "ready" : "future";
  const stateLabel = item.state === "current" ? m.journey.current : item.state === "past" ? m.journey.past : m.journey.future;

  return (
    <div className="page">
      <TopBar title={item.title} backHref="/journey" subtitle={m.journey.types[item.type]} />
      <div className={styles.body}>
        <Card tone={item.state === "current" ? "warm" : "tint"} padding="panel" className={styles.headCard}>
          <StatusBadge tone={tone}>{stateLabel}</StatusBadge>
          <div className={styles.dateRow}>
            <DateText iso={item.date} style="weekday" className={styles.date} />
            {item.endDate && (
              <>
                <span className={styles.to}>→</span>
                <DateText iso={item.endDate} style="short" />
              </>
            )}
          </div>
          {item.week !== undefined && (
            <span className={styles.week}>
              {m.today.weekLabel} <span className="num">{fmtInt(item.week)}</span>
            </span>
          )}
          {item.description && <p className={styles.description}>{item.description}</p>}
        </Card>

        {item.origin === "user" && ctx.viewer.permissions.includes("journey:edit") && <DeleteMilestone id={item.id} />}
      </div>
    </div>
  );
}
