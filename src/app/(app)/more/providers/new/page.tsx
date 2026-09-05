import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { ProviderForm, type ProviderKind } from "@/components/care/ProviderForm";
import { m } from "@/i18n";

export default async function NewProviderPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!can(ctx.viewer, "care:edit")) redirect("/more/providers");
  const initial = kind === "hospital" || kind === "insurance" || kind === "doctor" ? (kind as ProviderKind) : undefined;
  return (
    <div className="page">
      <TopBar title={m.care.addProvider} subtitle={m.care.addProviderHelp} backHref="/more/providers" />
      <ProviderForm kind={initial} hospitals={ctx.data.hospitals} defaultCity={ctx.data.pregnancy.followUpCity} deliveryCity={ctx.data.pregnancy.deliveryCity} />
    </div>
  );
}
