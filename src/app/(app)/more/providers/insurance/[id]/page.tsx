import { notFound, redirect } from "next/navigation";
import { daysBetween } from "@/domain/dates";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CareProviderRow } from "@/components/ui/CareProviderRow";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { VerifyCoverage, VerificationTasks } from "@/components/care/VerifyCoverage";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "../../../more.module.css";

type Params = { params: Promise<{ id: string }> };

export default async function InsurancePage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const record = ctx.data.insurance.find((i) => i.id === id);
  if (!record) notFound();
  const canEdit = can(ctx.viewer, "care:edit");
  const candidates = ctx.data.hospitals.filter((h) => record.candidateHospitalIds.includes(h.id));
  const tasks = ctx.data.verificationTasks.filter((t) => t.relatedInsuranceId === record.id);
  const verified = record.lastVerifiedAt;
  const stale = verified ? daysBetween(verified, ctx.today) > 90 : false;
  const ok = Boolean(verified) && !stale;

  return (
    <div className="page">
      <TopBar title={record.provider} subtitle={record.planName} backHref="/more/providers" actions={canEdit ? <IconButton icon="edit" label={m.common.edit} variant="quiet" href={`/more/providers/edit/insurance/${record.id}`} /> : undefined} />
      <div className={styles.body}>
        <Card tone={ok ? "sage" : "attention"} padding="panel" className={styles.coverage}>
          <div className={styles.coverageHead}>
            <span className={cx(styles.coverageIcon, ok && styles.coverageIconOk)} aria-hidden="true">
              <Icon name={ok ? "shield" : "alert"} size={20} />
            </span>
            <div className={styles.coverageText}>
              <span className={styles.coverageTitle}>{verified ? m.care.believedCovered : m.care.needsVerification}</span>
              <span className={styles.coverageMeta}>{verified ? <>{m.care.lastVerified}: <DateText iso={verified} style="long" />{stale && ` · ${m.care.stale}`}</> : m.care.neverVerified}</span>
            </div>
          </div>
          {record.coverageNotes && <p className={styles.notes}>{record.coverageNotes}</p>}
          <VerifyCoverage target={{ kind: "insurance", id: record.id }} canEdit={canEdit} />
        </Card>

        {tasks.length > 0 && (
          <section className={styles.section}>
            <SectionTitle>{m.care.verificationTasks}</SectionTitle>
            <VerificationTasks tasks={tasks} canEdit={canEdit} />
          </section>
        )}

        <section className={styles.section}>
          <SectionTitle>{m.care.candidateHospitals}</SectionTitle>
          {candidates.length === 0 ? (
            <p className={styles.coverageMeta}>{m.more.notChosenYet}</p>
          ) : (
            <div className={styles.people}>
              {candidates.map((h) => (
                <CareProviderRow
                  key={h.id}
                  kind="hospital"
                  title={h.name}
                  subtitle={h.city}
                  href={`/more/providers/hospital/${h.id}`}
                  unverified={!h.insuranceLastVerifiedAt}
                  trailing={<StatusBadge tone={h.insuranceLastVerifiedAt ? (h.insuranceBelievedCovered ? "ready" : "needed") : "unverified"}>{h.insuranceLastVerifiedAt ? (h.insuranceBelievedCovered ? m.care.believedCovered : m.care.notBelievedCovered) : m.care.needsVerification}</StatusBadge>}
                />
              ))}
            </div>
          )}
        </section>

        <PrivacyNotice variant="warning">{m.care.coverageInfo}</PrivacyNotice>
      </div>
    </div>
  );
}
