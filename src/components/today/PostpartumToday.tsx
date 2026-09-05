import type { TodayViewModel } from "@/server/view-models/today";
import { Bento } from "@/components/ui/Card";
import { BentoModuleView, NextActionCard } from "./TodayModules";
import { PostpartumHero } from "@/components/hero/PostpartumHero";
import styles from "@/app/(app)/today/today.module.css";

/** Postpartum Today: the hero switches from week to baby age; the journey continues. */
export function PostpartumToday({ vm }: { vm: TodayViewModel }) {
  if (!vm.postpartum) return null;
  return (
    <div className="page page--flush">
      <PostpartumHero vm={vm.postpartum} baby={vm.baby} member={vm.member} todayIso={vm.todayIso} />
      <div className={styles.body}>
        {vm.nextAction && <NextActionCard action={vm.nextAction} />}
        <Bento>
          {vm.bento.map((module, i) => (
            <BentoModuleView key={`${module.kind}-${i}`} module={module} today={vm.todayIso} />
          ))}
        </Bento>
      </div>
    </div>
  );
}
