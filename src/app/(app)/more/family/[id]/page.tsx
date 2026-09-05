import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { pregnancyProgress } from "@/domain/pregnancy";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { DateText, Num } from "@/components/ui/Num";
import { MemberEditor } from "@/components/more/MemberEditor";
import { CitiesEditor, DueDateEditor } from "@/components/more/PregnancyEditors";
import { m } from "@/i18n";
import styles from "../../more.module.css";

type Params = { params: Promise<{ id: string }> };

/** Member profile. The mother's profile carries the pregnancy facts (due date, cities) with minimal sensitive data. */
export default async function MemberPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const member = ctx.data.members.find((mm) => mm.id === id);
  if (!member) notFound();
  const isSelf = member.id === ctx.viewer.memberId;
  const isMother = member.roles.includes("mother");
  const canManage = can(ctx.viewer, "household:manage");
  const canEditJourney = can(ctx.viewer, "journey:edit");
  const p = ctx.data.pregnancy;
  const progress = pregnancyProgress(p.dueDate, ctx.today);

  return (
    <div className="page">
      <TopBar title={member.displayName} subtitle={member.roles.map((r) => m.family.roles[r]).join(" · ")} backHref="/more" />
      <div className={styles.body}>
        {isMother && (
          <section className={styles.section}>
            <SectionTitle>{m.family.motherProfile}</SectionTitle>
            <PrivacyNotice variant="general">{m.family.minimalData}</PrivacyNotice>
            <div className={styles.facts}>
              <Card tone="tint" padding="md" className={styles.fact}>
                <span className={styles.factLabel}>{m.family.dueDate}</span>
                <span className={styles.factValue}>
                  <DateText iso={p.dueDate} style="long" />
                </span>
                <span className={styles.factLabel}>
                  {m.today.weekLabel} <Num value={progress.week} />
                </span>
              </Card>
              <Card tone="tint" padding="md" className={styles.fact}>
                <span className={styles.factLabel}>{m.family.followUpCity}</span>
                <span className={styles.factValue}>{p.followUpCity}</span>
                <span className={styles.factLabel}>{m.family.deliveryCity}</span>
                <span className={styles.factValue}>{p.deliveryCity}</span>
              </Card>
            </div>
            {!ctx.data.baby?.birthDate && (
              <div className={styles.actions}>
                <DueDateEditor dueDate={p.dueDate} canEdit={canEditJourney} />
                <CitiesEditor followUpCity={p.followUpCity} deliveryCity={p.deliveryCity} canEdit={canEditJourney} />
              </div>
            )}
            {p.dueDateHistory.length > 0 && (
              <Card tone="surface" padding="md">
                <span className={styles.factLabel}>{m.family.dueDateHistory}</span>
                <ul>
                  {p.dueDateHistory.map((h, i) => (
                    <li key={i} className={styles.coverageMeta}>
                      <DateText iso={h.previous} style="short" /> → <DateText iso={h.next} style="short" />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        )}

        <section className={styles.section}>
          <SectionTitle>{m.family.permissionsTitle}</SectionTitle>
          <MemberEditor memberId={member.id} roles={member.roles} permissions={member.permissions} isSelf={isSelf} canManage={canManage} />
        </section>
      </div>
    </div>
  );
}
