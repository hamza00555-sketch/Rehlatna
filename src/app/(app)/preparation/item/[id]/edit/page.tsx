import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { TopBar } from "@/components/ui/TopBar";
import { ItemForm } from "@/components/preparation/ItemForm";
import { m } from "@/i18n";

type Params = { params: Promise<{ id: string }> };

export default async function EditItemPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!ctx.viewer.permissions.includes("preparation:edit")) redirect(`/preparation/item/${id}`);
  const item = ctx.data.preparationItems.find((i) => i.id === id);
  if (!item) notFound();
  return (
    <div className="page">
      <TopBar title={m.preparation.editItem} backHref={`/preparation/item/${id}`} />
      <ItemForm item={item} />
    </div>
  );
}
