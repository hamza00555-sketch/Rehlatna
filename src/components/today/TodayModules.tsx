import Link from "next/link";
import type { BentoModule, NextAction } from "@/server/view-models/today";
import { Card, BentoItem } from "@/components/ui/Card";
import { Icon } from "@/components/icons/Icon";
import { Progress } from "@/components/ui/Progress";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DateText, Num, TimeText } from "@/components/ui/Num";
import { relativeDay } from "@/lib/format";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./TodayModules.module.css";

/** One contextual next step — a calm card, not a dashboard KPI. */
export function NextActionCard({ action }: { action: NextAction }) {
  return (
    <Link href={action.href} className={styles.next}>
      <span className={styles.nextText}>
        <span className={styles.nextLabel}>{m.today.nextAction}</span>
        <span className={styles.nextTitle}>{action.title}</span>
        {action.body && <span className={styles.nextBody}>{action.body}</span>}
      </span>
      <span className={styles.nextCta}>
        {action.cta}
        <Icon name="forward" size={20} />
      </span>
    </Link>
  );
}

export function BentoModuleView({ module, today }: { module: BentoModule; today: string }) {
  switch (module.kind) {
    case "appointment": {
      const a = module.appointment;
      const urgent = a.daysUntil <= 2;
      return (
        <BentoItem span={module.span}>
          <Card href={`/journey/appointments/${a.id}`} tone={urgent ? "blue" : "surface"} className={styles.module}>
            <span className={styles.label}>{m.today.nextAppointment}</span>
            <span className={styles.title}>{m.appointments.types[a.type]}</span>
            <span className={styles.meta}>
              <DateText iso={a.date} style="short" />
              {a.time && (
                <>
                  {" · "}
                  <TimeText value={a.time} />
                </>
              )}
            </span>
            <span className={styles.footer}>
              <span className={styles.relative}>{relativeDay(a.date, today)}</span>
              {a.openTasks > 0 && <StatusBadge tone="needed">{m.appointments.openTasks(a.openTasks)}</StatusBadge>}
            </span>
            {(a.doctorName || a.city) && <span className={styles.meta}>{[a.doctorName, a.city].filter(Boolean).join(" · ")}</span>}
          </Card>
        </BentoItem>
      );
    }
    case "journey":
      return (
        <BentoItem span={module.span}>
          <Card href="/journey" tone="tint" className={styles.module}>
            <span className={styles.label}>{m.today.journeyPoint}</span>
            <span className={styles.title}>{module.currentTitle}</span>
            {module.nextTitle && (
              <span className={styles.meta}>
                {m.journey.next}: {module.nextTitle}
                {module.nextInDays !== null && module.nextInDays > 0 && ` · ${m.common.inDays(module.nextInDays)}`}
              </span>
            )}
          </Card>
        </BentoItem>
      );
    case "week":
      return (
        <BentoItem span={module.span}>
          <Card href="/today/week" tone="warm" className={styles.module}>
            <span className={styles.label}>{m.today.whatHappening}</span>
            <ul className={styles.points}>
              {module.points.map((p, i) => (
                <li key={i} className={styles.pointRow}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Card>
        </BentoItem>
      );
    case "preparation": {
      const ratio = module.total === 0 ? 0 : module.ready / module.total;
      const complete = module.total > 0 && module.ready === module.total;
      return (
        <BentoItem span={module.span}>
          <Card href="/preparation" tone={complete ? "sage" : "surface"} className={styles.module}>
            <span className={styles.label}>{m.today.preparationReadiness}</span>
            {module.total === 0 ? (
              <span className={styles.title}>{m.today.preparationEmpty}</span>
            ) : (
              <Progress
                ratio={ratio}
                tone={complete ? "complete" : "journey"}
                label={m.today.preparationReadiness}
                caption={m.today.itemsReady(module.ready, module.total)}
                trailing={module.needed > 0 ? <span>{m.status.needed}: <Num value={module.needed} /></span> : undefined}
              />
            )}
          </Card>
        </BentoItem>
      );
    }
    case "finance": {
      const t = module.totals;
      return (
        <BentoItem span={module.span}>
          <Card href="/finance" tone={t.attention ? "attention" : "tint"} className={styles.module}>
            <span className={cx(styles.label, styles.private)}>
              <Icon name="lock" size={16} />
              {m.today.financeSummary} · {m.finance.privateLabel}
            </span>
            <Progress
              ratio={t.ratio}
              tone={t.remaining === 0 && t.target > 0 ? "complete" : t.attention ? "attention" : "onTrack"}
              label={m.finance.title}
              caption={
                <>
                  {m.finance.saved} <Num value={t.funded} format="currency" currency={module.currencyCode} /> {m.finance.of}{" "}
                  <Num value={t.target} format="currency" currency={module.currencyCode} />
                </>
              }
              trailing={<Num value={t.ratio} format="percent" />}
            />
            <span className={styles.meta}>
              {m.today.financeMonthly}: <Num value={t.monthly} format="currency" currency={module.currencyCode} />
            </span>
          </Card>
        </BentoItem>
      );
    }
    case "travel":
      return (
        <BentoItem span={module.span}>
          <Card href="/more/travel" tone="surface" className={styles.module}>
            <span className={styles.label}>{m.today.travelPrompt}</span>
            <span className={styles.title}>
              {module.fromCity} ← {module.toCity}
            </span>
            <span className={styles.meta}>{module.plannedDate ? <DateText iso={module.plannedDate} style="short" /> : module.hasPlan ? m.common.unknownDate : m.travel.create}</span>
          </Card>
        </BentoItem>
      );
    case "birthPlan":
      return (
        <BentoItem span={module.span}>
          <Card href="/more/birth-plan" tone="surface" className={styles.module}>
            <span className={styles.label}>{m.today.birthPlanPrompt}</span>
            <span className={styles.title}>{m.birthPlan.readiness(module.chosen, module.total)}</span>
          </Card>
        </BentoItem>
      );
  }
}
