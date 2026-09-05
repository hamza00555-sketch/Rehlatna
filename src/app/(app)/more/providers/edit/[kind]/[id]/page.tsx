import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { ProviderForm } from "@/components/care/ProviderForm";
import { m } from "@/i18n";

type Params = { params: Promise<{ kind: string; id: string }> };

export default async function EditProviderPage({ params }: Params) {
  const { kind, id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!can(ctx.viewer, "care:edit")) redirect(`/more/providers/${kind}/${id}`);
  const doctor = kind === "doctor" ? ctx.data.careProviders.find((d) => d.id === id) : undefined;
  const hospital = kind === "hospital" ? ctx.data.hospitals.find((h) => h.id === id) : undefined;
  const insurance = kind === "insurance" ? ctx.data.insurance.find((i) => i.id === id) : undefined;
  if (!doctor && !hospital && !insurance) notFound();
  return (
    <div className="page">
      <TopBar title={m.care.editProvider} backHref={`/more/providers/${kind}/${id}`} />
      <ProviderForm doctor={doctor} hospital={hospital} insurance={insurance} hospitals={ctx.data.hospitals} defaultCity={ctx.data.pregnancy.followUpCity} deliveryCity={ctx.data.pregnancy.deliveryCity} />
    </div>
  );
}
