import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { buildPreparationViewModel } from "@/server/view-models/preparation";
import type { PreparationCategoryKey } from "@/domain/types";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { StatusLine } from "@/components/preparation/PreparationMediaCard";
import { m } from "@/i18n";
import styles from "../preparation.module.css";

export const metadata = { title: "حقيبة المستشفى" };

const GROUPS: { title: string; categories: PreparationCategoryKey[] }[] = [
  { title: m.preparation.forMother, categories: ["mother_postpartum"] },
  { title: m.preparation.forBaby, categories: ["clothing", "care", "feeding", "sleep"] },
  { title: m.preparation.forCompanion, categories: ["hospital", "travel", "mobility", "other"] },
];

/** Grouped packing view of every item flagged for the hospital bag. */
export default async function HospitalBagPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const vm = buildPreparationViewModel(ctx);
  const bag = vm.hospitalBag;
  const ready = bag.filter((i) => i.status === "owned").length;

  return (
    <div className="page">
      <TopBar
        title={m.preparation.hospitalBag}
        subtitle={m.preparation.hospitalBagIntro}
        backHref="/preparation"
        actions={vm.canEdit ? <IconButton icon="plus" label={m.preparation.addItem} href="/preparation/item/new?category=hospital" /> : undefined}
      />
      <div className={styles.body}>
        {bag.length === 0 ? (
          <EmptyState title={m.preparation.hospitalBag} body={m.preparation.hospitalBagEmpty} icon="bag" />
        ) : (
          <>
            <Progress ratio={ready / bag.length} tone={ready === bag.length ? "complete" : "journey"} label={m.preparation.hospitalBag} caption={m.preparation.readiness(ready, bag.length)} />
            {GROUPS.map((g) => {
              const items = bag.filter((i) => g.categories.includes(i.category));
              if (items.length === 0) return null;
              return (
                <section key={g.title} className={styles.section}>
                  <SectionTitle as="h3">{g.title}</SectionTitle>
                  <RowGroup>
                    {items.map((item) => (
                      <TaskRow key={item.id} title={item.title} meta={m.preparation.categories[item.category]} state={item.status === "owned" ? "completed" : item.status === "undecided" ? "undecided" : "open"} href={`/preparation/item/${item.id}`} trailing={<StatusLine status={item.status} />} />
                    ))}
                  </RowGroup>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
