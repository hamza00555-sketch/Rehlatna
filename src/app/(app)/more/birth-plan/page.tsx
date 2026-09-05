import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { BirthPlanEditor } from "@/components/more/BirthPlanEditor";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "../more.module.css";

export const metadata = { title: "خطة الولادة" };

/** Birth plan readiness: hospital · doctor · insurance (verified) · support · preferences. */
export default async function BirthPlanPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const { data } = ctx;
  const pregnancy = ctx.data.pregnancy;
  const plan = data.birthPlan;
  const canEdit = can(ctx.viewer, "care:edit");
  const hospital = data.hospitals.find((h) => h.id === plan?.hospitalId);
  const doctor = data.careProviders.find((d) => d.id === plan?.doctorId);
  const insurance = data.insurance.find((i) => i.id === plan?.insuranceId);
  const rows = [
    { title: m.birthPlan.hospital, value: hospital?.name, href: hospital ? `/more/providers/hospital/${hospital.id}` : "/more/providers/new?kind=hospital", done: Boolean(hospital), warn: hospital && !hospital.insuranceLastVerifiedAt ? m.birthPlan.needsVerification : undefined, icon: "hospital" as const },
    { title: m.birthPlan.doctor, value: doctor?.name, href: doctor ? `/more/providers/doctor/${doctor.id}` : "/more/providers/new?kind=doctor", done: Boolean(doctor), icon: "stethoscope" as const },
    { title: m.birthPlan.insurance, value: insurance?.provider, href: insurance ? `/more/providers/insurance/${insurance.id}` : "/more/providers/new?kind=insurance", done: Boolean(insurance), warn: insurance && !insurance.lastVerifiedAt ? m.birthPlan.needsVerification : undefined, icon: "shield" as const },
    { title: m.birthPlan.support, value: plan?.supportPerson, done: Boolean(plan?.supportPerson), icon: "users" as const },
    { title: m.birthPlan.preferences, value: plan?.preferences, done: Boolean(plan?.preferences), icon: "edit" as const },
  ];
  const doneCount = rows.filter((r) => r.done).length;

  return (
    <div className="page">
      <TopBar title={m.birthPlan.title} subtitle={m.birthPlan.subtitle} backHref="/more" />
      <div className={styles.body}>
        <Card tone="warm" padding="panel" className={styles.coverageHead}>
          <span className={styles.coverageIcon} aria-hidden="true">
            <Icon name="calendar" size={20} />
          </span>
          <div className={styles.coverageText}>
            <span className={styles.coverageTitle}>{m.birthPlan.deliveryIn(pregnancy.deliveryCity)}</span>
            <span className={styles.coverageMeta}>
              <DateText iso={pregnancy.dueDate} style="long" />
            </span>
          </div>
        </Card>

        <Card tone="surface" padding="md" className={styles.readiness}>
          <div className={styles.segments} role="progressbar" aria-label={m.birthPlan.title} aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={rows.length}>
            {rows.map((r, i) => (
              <span key={i} className={cx(styles.segment, r.done && styles.segmentOn)} />
            ))}
          </div>
          <div className={styles.readinessText}>
            <span className={styles.readinessCount}>{m.birthPlan.readiness(doneCount, rows.length)}</span>
            <span>{doneCount === rows.length ? m.finance.complete : m.birthPlan.onTrack}</span>
          </div>
        </Card>

        <RowGroup>
          {rows.map((r) => (
            <TaskRow key={r.title} title={r.title} meta={r.warn ?? r.value ?? m.birthPlan.notChosen} state={r.done ? "completed" : "open"} href={r.href} leading={<Icon name={r.icon} size={20} />} />
          ))}
        </RowGroup>

        <BirthPlanEditor plan={plan} hospitals={data.hospitals} doctors={data.careProviders} insurance={data.insurance} canEdit={canEdit} />

        <PrivacyNotice variant="general">{m.birthPlan.flexibleNote}</PrivacyNotice>
        <Button href="/preparation/hospital-bag" variant="outline" fullWidth>
          {m.birthPlan.continuePrep} · {m.birthPlan.hospitalBagLink}
        </Button>
      </div>
    </div>
  );
}
