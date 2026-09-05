import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import type { PreparationCategoryKey } from "@/domain/types";
import { CATEGORY_ORDER } from "@/server/view-models/preparation";
import { TopBar } from "@/components/ui/TopBar";
import { ItemForm } from "@/components/preparation/ItemForm";
import { m } from "@/i18n";

export const metadata = { title: "إضافة عنصر" };

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!ctx.viewer.permissions.includes("preparation:edit")) redirect("/preparation");
  const defaultCategory = CATEGORY_ORDER.includes(category as PreparationCategoryKey) ? (category as PreparationCategoryKey) : undefined;
  return (
    <div className="page">
      <TopBar title={m.preparation.addItem} backHref={defaultCategory ? `/preparation/${defaultCategory}` : "/preparation"} />
      <ItemForm defaultCategory={defaultCategory} />
    </div>
  );
}
