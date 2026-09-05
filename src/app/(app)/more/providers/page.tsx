import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CareProviderRow } from "@/components/ui/CareProviderRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { VerificationTasks } from "@/components/care/VerifyCoverage";
import { m } from "@/i18n";
import styles from "../more.module.css";

export const metadata = { title: "الرعاية الصحية" };

/** Care directory grouped by purpose: follow-up (city A), delivery (city B), insurance. */
export default async function ProvidersPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const { data } = ctx;
  const canEdit = can(ctx.viewer, "care:edit");
  const p = ctx.data.pregnancy;
  const followUpDoctors = data.careProviders.filter((d) => d.kind === "follow_up" || d.kind === "specialist");
  const deliveryDoctors = data.careProviders.filter((d) => d.kind === "delivery" || d.kind === "backup");
  const followUpHospitals = data.hospitals.filter((h) => h.purposes.includes("follow_up"));
  const deliveryHospitals = data.hospitals.filter((h) => h.purposes.includes("delivery") || h.purposes.includes("emergency"));
  const openTasks = data.verificationTasks.filter((t) => !t.done);
  const empty = data.careProviders.length === 0 && data.hospitals.length === 0 && data.insurance.length === 0;

  const hospitalSubtitle = (h: (typeof data.hospitals)[number]) => (
    <>
      {h.city} · {h.insuranceLastVerifiedAt ? <>{m.care.lastVerified}: <DateText iso={h.insuranceLastVerifiedAt} style="short" /></> : m.care.needsVerification}
    </>
  );

  return (
    <div className="page">
      <TopBar title={m.care.title} subtitle={m.care.subtitle} backHref="/more" />
      <div className={styles.body}>
        {empty ? (
          <EmptyState title={m.care.noProviders} body={m.care.noProvidersBody} icon="stethoscope" action={canEdit ? <Button href="/more/providers/new">{m.care.addProvider}</Button> : undefined} />
        ) : (
          <>
            <Card tone="surface" padding="panel" className={styles.section}>
              <div className={styles.coverageHead}>
                <span className={styles.coverageIcon} style={{ background: "var(--color-accent-blue-soft)", color: "var(--color-accent-blue)" }} aria-hidden="true">
                  <Icon name="stethoscope" size={20} />
                </span>
                <div className={styles.coverageText}>
                  <span className={styles.coverageTitle}>{m.care.followUpSection}</span>
                  <span className={styles.coverageMeta}>
                    <Icon name="pin" size={16} /> {p.followUpCity}
                  </span>
                </div>
              </div>
              <div className={styles.people}>
                {followUpDoctors.map((d) => (
                  <CareProviderRow key={d.id} kind="doctor" title={d.name} subtitle={[m.care.kinds[d.kind], d.specialty].filter(Boolean).join(" · ")} href={`/more/providers/doctor/${d.id}`} />
                ))}
                {followUpHospitals.map((h) => (
                  <CareProviderRow key={h.id} kind="hospital" title={h.name} subtitle={hospitalSubtitle(h)} href={`/more/providers/hospital/${h.id}`} unverified={!h.insuranceLastVerifiedAt} />
                ))}
                {followUpDoctors.length + followUpHospitals.length === 0 && <p className={styles.coverageMeta}>{m.more.notChosenYet}</p>}
              </div>
            </Card>

            <Card tone="surface" padding="panel" className={styles.section}>
              <div className={styles.coverageHead}>
                <span className={styles.coverageIcon} style={{ background: "var(--color-accent-blue-soft)", color: "var(--color-accent-blue)" }} aria-hidden="true">
                  <Icon name="hospital" size={20} />
                </span>
                <div className={styles.coverageText}>
                  <span className={styles.coverageTitle}>{m.care.deliverySection}</span>
                  <span className={styles.coverageMeta}>
                    <Icon name="pin" size={16} /> {p.deliveryCity} · {m.care.candidateForDelivery}
                  </span>
                </div>
              </div>
              <div className={styles.people}>
                {deliveryHospitals.map((h) => (
                  <CareProviderRow key={h.id} kind="hospital" title={h.name} subtitle={hospitalSubtitle(h)} href={`/more/providers/hospital/${h.id}`} unverified={!h.insuranceLastVerifiedAt} trailing={data.birthPlan?.hospitalId === h.id ? <StatusBadge tone="ready">{m.birthPlan.hospital}</StatusBadge> : undefined} />
                ))}
                {deliveryDoctors.map((d) => (
                  <CareProviderRow key={d.id} kind="doctor" title={d.name} subtitle={[m.care.kinds[d.kind], d.specialty].filter(Boolean).join(" · ")} href={`/more/providers/doctor/${d.id}`} />
                ))}
                {deliveryHospitals.length + deliveryDoctors.length === 0 && <p className={styles.coverageMeta}>{m.more.notChosenYet}</p>}
              </div>
            </Card>

            <Card tone="surface" padding="panel" className={styles.section}>
              <div className={styles.coverageHead}>
                <span className={styles.coverageIcon} style={{ background: "var(--color-accent-blue-soft)", color: "var(--color-accent-blue)" }} aria-hidden="true">
                  <Icon name="shield" size={20} />
                </span>
                <div className={styles.coverageText}>
                  <span className={styles.coverageTitle}>{m.care.insuranceSection}</span>
                  <span className={styles.coverageMeta}>{m.care.coverageDisclaimer}</span>
                </div>
              </div>
              <div className={styles.people}>
                {data.insurance.map((i) => (
                  <CareProviderRow key={i.id} kind="insurance" title={i.provider} subtitle={i.planName} href={`/more/providers/insurance/${i.id}`} unverified={!i.lastVerifiedAt} trailing={i.lastVerifiedAt ? <StatusBadge tone="ready">{m.care.lastVerified} <DateText iso={i.lastVerifiedAt} style="short" /></StatusBadge> : <StatusBadge tone="unverified">{m.care.needsVerification}</StatusBadge>} />
                ))}
                {data.insurance.length === 0 && <p className={styles.coverageMeta}>{m.more.notChosenYet}</p>}
              </div>
              {openTasks.length > 0 && (
                <>
                  <span className={styles.coverageTitle}>{m.care.verificationTasks}</span>
                  <VerificationTasks tasks={openTasks} canEdit={canEdit} />
                </>
              )}
            </Card>

            {canEdit && (
              <Button href="/more/providers/new" fullWidth leading={<Icon name="plus" size={20} />}>
                {m.care.addProvider}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
