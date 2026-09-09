import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { buildTodayViewModel } from "@/server/view-models/today";
import { BabyHero } from "@/components/hero/BabyHero";
import { Bento } from "@/components/ui/Card";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { BentoModuleView, NextActionCard } from "@/components/today/TodayModules";
import { PostpartumToday } from "@/components/today/PostpartumToday";
import { DangerSigns } from "@/components/care/DangerSigns";
import { m } from "@/i18n";
import styles from "./today.module.css";

/** Today: Baby Hero → one contextual next action → asymmetric bento. */
export default async function TodayPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const vm = buildTodayViewModel(ctx);

  if (vm.mode === "postpartum" && vm.postpartum) {
    return <PostpartumToday vm={vm} />;
  }
  if (!vm.pregnancy) redirect("/onboarding");

  return (
    <div className="page page--flush">
      <BabyHero vm={vm.pregnancy} baby={vm.baby} member={vm.member} todayIso={vm.todayIso} audience={vm.audience} />
      <div className={styles.body}>
        {vm.pregnancy.recentDueDateChange && <PrivacyNotice variant="general">{m.today.weekChangedByDueDate}</PrivacyNotice>}
        {vm.nextAction && <NextActionCard action={vm.nextAction} />}
        <Bento>
          {vm.bento.map((module, i) => (
            <BentoModuleView key={`${module.kind}-${i}`} module={module} today={vm.todayIso} />
          ))}
        </Bento>
        <DangerSigns />
      </div>
    </div>
  );
}
