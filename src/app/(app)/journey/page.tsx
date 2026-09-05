import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { buildJourneyViewModel } from "@/server/view-models/journey";
import { TopBar } from "@/components/ui/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import { JourneyActions } from "@/components/journey/JourneyActions";
import { m } from "@/i18n";
import styles from "./journey.module.css";

export const metadata = { title: "الرحلة" };

/** The journey is one continuous narrative — never a calendar grid. */
export default async function JourneyPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const vm = buildJourneyViewModel(ctx);
  const canEdit = ctx.viewer.permissions.includes("journey:edit");
  const babyName = ctx.data.baby?.displayName ?? null;

  return (
    <div className="page">
      <TopBar
        title={ctx.data.household.settings.productName}
        subtitle={m.journey.title}
        actions={<JourneyActions canEdit={canEdit} today={ctx.today} showGender={ctx.data.baby?.gender === "unknown"} showName={!babyName} />}
      />
      {vm.items.length === 0 ? (
        <EmptyState title={m.journey.title} body={m.journey.empty} icon="journey" />
      ) : (
        <div className={styles.timeline}>
          <JourneyTimeline items={vm.sections.pregnancy} title={vm.sections.postpartum.length > 0 || vm.sections.birth.length > 0 ? m.journey.pregnancySection : undefined} />
          <JourneyTimeline items={vm.sections.birth} title={vm.sections.birth.length > 0 ? m.journey.birthSection : undefined} />
          <JourneyTimeline items={vm.sections.postpartum} title={vm.sections.postpartum.length > 0 ? m.journey.postpartumSection : undefined} />
        </div>
      )}
    </div>
  );
}
