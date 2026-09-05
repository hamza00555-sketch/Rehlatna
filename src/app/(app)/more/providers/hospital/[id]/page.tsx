import { DEV_MEDIA } from "@/media/dev";
import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { daysBetween } from "@/domain/dates";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CareProviderRow } from "@/components/ui/CareProviderRow";
import { DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { VerifyCoverage, VerificationTasks } from "@/components/care/VerifyCoverage";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "../../../more.module.css";

type Params = { params: Promise<{ id: string }> };

/** Hospital detail. Coverage is always shown as a belief with its last verification date — never as a guarantee. */
export default async function HospitalPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const hospital = ctx.data.hospitals.find((h) => h.id === id);
  if (!hospital) notFound();
  const canEdit = can(ctx.viewer, "care:edit");
  const doctors = ctx.data.careProviders.filter((d) => d.hospitalId === hospital.id);
  const insurance = ctx.data.insurance.filter((i) => i.candidateHospitalIds.includes(hospital.id));
  const tasks = ctx.data.verificationTasks.filter((t) => t.relatedHospitalId === hospital.id);
  const verified = hospital.insuranceLastVerifiedAt;
  const stale = verified ? daysBetween(verified, ctx.today) > 90 : false;
  const coverageTitle = !verified ? m.care.unconfirmed : hospital.insuranceBelievedCovered ? m.care.believedCovered : m.care.notBelievedCovered;
  const isDeliveryChoice = ctx.data.birthPlan?.hospitalId === hospital.id;

  return (
    <div className="page">
      <TopBar title={hospital.name} backHref="/more/providers" actions={canEdit ? <IconButton icon="edit" label={m.common.edit} variant="quiet" href={`/more/providers/edit/hospital/${hospital.id}`} /> : undefined} />
      <div className={styles.body}>
        <div className={styles.hero}>
          <MediaFrame src={DEV_MEDIA.hospitalPlaceholder} focalPoint={{ x: 0.5, y: 0.55 }} alt={hospital.name} ratio="card" radius="hero" placeholderLabel={m.care.imagePlaceholder} />
          <div className={styles.chips}>
            <StatusBadge tone="future">
              <Icon name="pin" size={16} /> {hospital.city}
            </StatusBadge>
            {hospital.purposes.map((p) => (
              <StatusBadge key={p} tone="medical">
                {m.care.purposes[p]}
              </StatusBadge>
            ))}
            {isDeliveryChoice && <StatusBadge tone="ready">{m.birthPlan.hospital}</StatusBadge>}
          </div>
        </div>

        <Card tone={!verified || stale || hospital.insuranceBelievedCovered === false ? "attention" : "sage"} padding="panel" className={styles.coverage}>
          <div className={styles.coverageHead}>
            <span className={cx(styles.coverageIcon, verified && !stale && hospital.insuranceBelievedCovered && styles.coverageIconOk)} aria-hidden="true">
              <Icon name={verified && !stale && hospital.insuranceBelievedCovered ? "check" : "alert"} size={20} />
            </span>
            <div className={styles.coverageText}>
              <span className={styles.coverageTitle}>{coverageTitle}</span>
              <span className={styles.coverageMeta}>{verified ? <>{m.care.lastVerified}: <DateText iso={verified} style="long" />{stale && ` · ${m.care.stale}`}</> : m.care.neverVerified}</span>
            </div>
          </div>
          <p className={styles.coverageMeta}>{m.care.coverageInfo}</p>
          <VerifyCoverage target={{ kind: "hospital", id: hospital.id }} canEdit={canEdit} />
          <VerificationTasks tasks={tasks} canEdit={canEdit} />
        </Card>

        {(doctors.length > 0 || insurance.length > 0) && (
          <section className={styles.section}>
            <SectionTitle>{m.care.title}</SectionTitle>
            <div className={styles.people}>
              {doctors.map((d) => (
                <CareProviderRow key={d.id} kind="doctor" title={d.name} subtitle={m.care.kinds[d.kind]} href={`/more/providers/doctor/${d.id}`} />
              ))}
              {insurance.map((i) => (
                <CareProviderRow key={i.id} kind="insurance" title={i.provider} subtitle={i.planName} href={`/more/providers/insurance/${i.id}`} unverified={!i.lastVerifiedAt} />
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <SectionTitle>{m.common.notes}</SectionTitle>
          <Card tone="tint" padding="md">
            <p className={styles.notes}>{hospital.notes ?? "—"}</p>
          </Card>
        </section>

        <div className={styles.actions}>
          {hospital.phone && (
            <Button href={`tel:${hospital.phone}`} variant="outline" leading={<Icon name="phone" size={20} />}>
              {m.care.call}
            </Button>
          )}
          {hospital.locationUrl && (
            <Button href={hospital.locationUrl} variant="outline" leading={<Icon name="pin" size={20} />}>
              {m.care.openLocation}
            </Button>
          )}
        </div>
        {!isDeliveryChoice && hospital.purposes.includes("delivery") && canEdit && (
          <Button href="/more/birth-plan" fullWidth>
            {m.birthPlan.chooseHospital}
          </Button>
        )}
      </div>
    </div>
  );
}
