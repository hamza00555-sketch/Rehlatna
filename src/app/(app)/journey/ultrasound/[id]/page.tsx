import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { TopBar } from "@/components/ui/TopBar";
import { UltrasoundEditor } from "@/components/appointments/UltrasoundEditor";
import { m } from "@/i18n";

type Params = { params: Promise<{ id: string }> };

export default async function UltrasoundPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const record = ctx.data.ultrasounds.find((u) => u.id === id);
  if (!record) notFound();
  return (
    <div className="page">
      <TopBar title={m.appointments.ultrasound} backHref={record.appointmentId ? `/journey/appointments/${record.appointmentId}` : "/journey"} />
      <UltrasoundEditor record={record} defaultDate={record.date} canEdit={ctx.viewer.permissions.includes("appointments:edit")} />
    </div>
  );
}
