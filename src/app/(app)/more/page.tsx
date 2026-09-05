import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { serializeFinanceOverview } from "@/server/serializers";
import { pregnancyProgress } from "@/domain/pregnancy";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { PersonCard } from "@/components/ui/PersonCard";
import { CareProviderRow } from "@/components/ui/CareProviderRow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { Icon } from "@/components/icons/Icon";
import { DateText } from "@/components/ui/Num";
import { initialsOf } from "@/server/view-models/today";
import { fmtInt } from "@/lib/format";
import { m } from "@/i18n";
import styles from "./more.module.css";

export const metadata = { title: "المزيد" };

/** More = the family hub: people, care providers, planning, settings. Finance appears only for viewers who may see it. */
export default async function MorePage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const { data, viewer, today } = ctx;
  const pregnancy = ctx.data.pregnancy;
  const progress = pregnancyProgress(pregnancy.dueDate, today);
  const baby = data.baby;
  const born = Boolean(baby?.birthDate);
  const followUpDoctor = data.careProviders.find((d) => d.kind === "follow_up") ?? data.careProviders[0];
  const deliveryHospital = data.hospitals.find((h) => h.id === data.birthPlan?.hospitalId) ?? data.hospitals.find((h) => h.purposes.includes("delivery"));
  const insurance = data.insurance[0];
  const finance = serializeFinanceOverview(data, viewer, today);
  const citiesDiffer = pregnancy.followUpCity !== pregnancy.deliveryCity;

  return (
    <div className="page">
      <TopBar title={m.more.familyTitle} subtitle={m.more.familySubtitle} actions={<IconButton icon="sliders" label={m.more.settings} variant="quiet" href="/more/settings" />} />
      <div className={styles.body}>
        <section className={styles.people}>
          {data.members.map((mm) => (
            <PersonCard key={mm.id} name={mm.displayName} relation={mm.roles.map((r) => m.family.roles[r]).join(" · ")} href={`/more/family/${mm.id}`} initials={initialsOf(mm.displayName)} meta={mm.id === viewer.memberId ? m.a11y.memberSwitcher : undefined} />
          ))}
          <PersonCard
            name={m.baby.nameOf(baby?.displayName ?? null)}
            relation={born && baby?.birthDate ? <DateText iso={baby.birthDate} style="long" /> as unknown as string : `${m.today.weekLabel} ${fmtInt(progress.week)}`}
            href="/more/baby"
            variant="baby"
          />
        </section>

        <section className={styles.section}>
          <SectionTitle action={{ label: m.common.view, href: "/more/providers" }}>{m.more.careSection}</SectionTitle>
          <div className={styles.people}>
            <CareProviderRow kind="doctor" title={followUpDoctor?.name ?? m.more.followUpDoctor} subtitle={followUpDoctor ? m.care.kinds[followUpDoctor.kind] : m.more.notChosenYet} href={followUpDoctor ? `/more/providers/doctor/${followUpDoctor.id}` : "/more/providers/new?kind=doctor"} />
            <CareProviderRow kind="hospital" title={deliveryHospital?.name ?? m.more.deliveryHospital} subtitle={deliveryHospital ? deliveryHospital.city : m.more.notChosenYet} href={deliveryHospital ? `/more/providers/hospital/${deliveryHospital.id}` : "/more/providers/new?kind=hospital"} unverified={Boolean(deliveryHospital) && !deliveryHospital?.insuranceLastVerifiedAt} />
            <CareProviderRow kind="insurance" title={insurance?.provider ?? m.care.insurance} subtitle={insurance ? (insurance.lastVerifiedAt ? <>{m.care.lastVerified}: <DateText iso={insurance.lastVerifiedAt} style="short" /></> : m.care.neverVerified) : m.more.notChosenYet} href={insurance ? `/more/providers/insurance/${insurance.id}` : "/more/providers/new?kind=insurance"} unverified={Boolean(insurance) && !insurance?.lastVerifiedAt} />
          </div>
        </section>

        <section className={styles.section}>
          <SectionTitle>{m.more.planning}</SectionTitle>
          <RowGroup>
            {!born && <TaskRow title={m.more.birthPlan} meta={m.birthPlan.deliveryIn(pregnancy.deliveryCity)} href="/more/birth-plan" leading={<Icon name="heart" size={20} />} />}
            {citiesDiffer && <TaskRow title={m.more.travel} meta={m.travel.route(pregnancy.followUpCity, pregnancy.deliveryCity)} href="/more/travel" leading={<Icon name="car" size={20} />} />}
            <TaskRow title={m.preparation.hospitalBag} href="/preparation/hospital-bag" leading={<Icon name="bag" size={20} />} />
            {finance && <TaskRow title={m.more.finance} meta={m.finance.privateLabel} href="/finance" leading={<Icon name="lock" size={20} />} />}
            {!born && can(viewer, "journey:edit") && <TaskRow title={m.journey.birthEvent} meta={m.family.arrivalHelp} href="/journey/birth" leading={<Icon name="sprout" size={20} />} />}
          </RowGroup>
        </section>

        <section className={styles.section}>
          <RowGroup>
            <TaskRow title={m.more.permissions} meta={m.more.accountsRolesHelp} href="/more/permissions" leading={<Icon name="users" size={20} />} />
            <TaskRow title={m.more.settings} meta={m.more.settingsSubtitle} href="/more/settings" leading={<Icon name="sliders" size={20} />} />
          </RowGroup>
        </section>
      </div>
    </div>
  );
}
