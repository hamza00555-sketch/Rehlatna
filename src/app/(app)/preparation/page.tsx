import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { buildPreparationViewModel, parseFilter } from "@/server/view-models/preparation";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Num } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { PreparationMediaCard, StatusLine } from "@/components/preparation/PreparationMediaCard";
import { PreparationFilters } from "@/components/preparation/PreparationFilters";
import { SuggestButton } from "@/components/preparation/SuggestButton";
import { m } from "@/i18n";
import styles from "./preparation.module.css";

export const metadata = { title: "التجهيز" };

/** Preparation home: status filters → image-led objects → task rows → categories. Never one long checklist. */
export default async function PreparationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const vm = buildPreparationViewModel(ctx, parseFilter(status));

  if (vm.isEmpty) {
    return (
      <div className="page">
        <TopBar title={m.preparation.title} subtitle={m.preparation.subtitle} />
        <EmptyState
          title={m.preparation.emptyTitle}
          body={m.preparation.emptyBody}
          icon="preparation"
          action={
            vm.canEdit ? (
              <div className={styles.emptyActions}>
                <SuggestButton />
                <Button href="/preparation/item/new" variant="outline">
                  {m.preparation.addItem}
                </Button>
              </div>
            ) : undefined
          }
        />
      </div>
    );
  }

  const complete = vm.readiness.total > 0 && vm.readiness.ready === vm.readiness.total;

  return (
    <div className="page">
      <TopBar
        title={m.preparation.title}
        subtitle={m.preparation.subtitle}
        actions={vm.canEdit ? <IconButton icon="plus" label={m.preparation.addItem} href="/preparation/item/new" /> : undefined}
      />
      <div className={styles.body}>
        <div className={styles.head}>
          <PreparationFilters current={vm.filter} basePath="/preparation" />
          <Progress
            ratio={vm.readiness.total === 0 ? 0 : vm.readiness.ready / vm.readiness.total}
            tone={complete ? "complete" : "journey"}
            label={m.today.preparationReadiness}
            caption={m.preparation.readiness(vm.readiness.ready, vm.readiness.total)}
            trailing={vm.readiness.needed > 0 ? <>{m.status.needed}: <Num value={vm.readiness.needed} /></> : undefined}
          />
        </div>

        {vm.objects.length > 0 && (
          <section className={styles.section}>
            <SectionTitle>{m.preparation.objects}</SectionTitle>
            <div className={styles.grid}>
              {vm.objects.map((item) => (
                <PreparationMediaCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {vm.tasks.length > 0 && (
          <section className={styles.section}>
            <SectionTitle action={vm.canEdit ? { label: m.common.add, href: "/preparation/item/new" } : undefined}>{m.preparation.tasks}</SectionTitle>
            <RowGroup>
              {vm.tasks.map((item) => (
                <TaskRow
                  key={item.id}
                  title={item.title}
                  meta={m.preparation.categories[item.category]}
                  state={item.status === "owned" ? "completed" : item.status === "undecided" ? "undecided" : "open"}
                  href={`/preparation/item/${item.id}`}
                  trailing={<StatusLine status={item.status} />}
                />
              ))}
            </RowGroup>
          </section>
        )}

        {vm.items.length === 0 && <EmptyState compact title={m.preparation.filters[vm.filter]} body={m.preparation.noItemsInCategory} icon="preparation" />}

        <section className={styles.section}>
          <SectionTitle>{m.preparation.byCategory}</SectionTitle>
          <RowGroup>
            {vm.categories.map((c) => (
              <TaskRow
                key={c.key}
                title={c.title}
                meta={m.preparation.readiness(c.ready, c.total)}
                href={`/preparation/${c.key}`}
                trailing={c.needed > 0 ? <StatusBadge tone="needed">{m.status.needed} <Num value={c.needed} /></StatusBadge> : c.total > 0 && c.ready === c.total ? <StatusBadge tone="ready">{m.status.ready}</StatusBadge> : undefined}
              />
            ))}
            <TaskRow title={m.preparation.hospitalBag} meta={m.preparation.readiness(vm.hospitalBag.filter((i) => i.status === "owned").length, vm.hospitalBag.length)} href="/preparation/hospital-bag" leading={<Icon name="bag" size={20} />} />
          </RowGroup>
        </section>
      </div>
    </div>
  );
}
