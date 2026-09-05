import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { buildPreparationViewModel, CATEGORY_ORDER, parseFilter } from "@/server/view-models/preparation";
import type { PreparationCategoryKey } from "@/domain/types";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { PreparationMediaCard, StatusLine } from "@/components/preparation/PreparationMediaCard";
import { PreparationFilters } from "@/components/preparation/PreparationFilters";
import { m } from "@/i18n";
import styles from "../preparation.module.css";

type Params = { params: Promise<{ category: string }>; searchParams: Promise<{ status?: string }> };

export default async function CategoryPage({ params, searchParams }: Params) {
  const { category } = await params;
  const { status } = await searchParams;
  if (!CATEGORY_ORDER.includes(category as PreparationCategoryKey)) notFound();
  const key = category as PreparationCategoryKey;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const vm = buildPreparationViewModel(ctx, parseFilter(status), key);
  const summary = vm.categories.find((c) => c.key === key);

  return (
    <div className="page">
      <TopBar
        title={m.preparation.categories[key]!}
        subtitle={summary ? m.preparation.readiness(summary.ready, summary.total) : undefined}
        backHref="/preparation"
        actions={vm.canEdit ? <IconButton icon="plus" label={m.preparation.addItem} href={`/preparation/item/new?category=${key}`} /> : undefined}
      />
      <div className={styles.body}>
        <PreparationFilters current={vm.filter} basePath={`/preparation/${key}`} />
        {vm.items.length === 0 ? (
          <EmptyState
            compact
            title={m.preparation.categories[key]!}
            body={m.preparation.noItemsInCategory}
            icon="preparation"
            action={vm.canEdit ? <Button href={`/preparation/item/new?category=${key}`} variant="outline">{m.preparation.addItem}</Button> : undefined}
          />
        ) : (
          <>
            {vm.objects.length > 0 && (
              <div className={styles.grid}>
                {vm.objects.map((item) => (
                  <PreparationMediaCard key={item.id} item={item} />
                ))}
              </div>
            )}
            {vm.tasks.length > 0 && (
              <section className={styles.section}>
                <SectionTitle>{m.preparation.tasks}</SectionTitle>
                <RowGroup>
                  {vm.tasks.map((item) => (
                    <TaskRow key={item.id} title={item.title} state={item.status === "owned" ? "completed" : item.status === "undecided" ? "undecided" : "open"} href={`/preparation/item/${item.id}`} trailing={<StatusLine status={item.status} />} />
                  ))}
                </RowGroup>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
