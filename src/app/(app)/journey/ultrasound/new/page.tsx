import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { pregnancyProgress } from "@/domain/pregnancy";
import { TopBar } from "@/components/ui/TopBar";
import { UltrasoundEditor } from "@/components/appointments/UltrasoundEditor";
import { m } from "@/i18n";

export default async function NewUltrasoundPage({ searchParams }: { searchParams: Promise<{ appointment?: string }> }) {
  const { appointment } = await searchParams;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!ctx.viewer.permissions.includes("appointments:edit")) redirect("/journey");
  const appt = ctx.data.appointments.find((a) => a.id === appointment);
  const date = appt?.date ?? ctx.today;
  return (
    <div className="page">
      <TopBar title={m.appointments.addUltrasound} backHref={appt ? `/journey/appointments/${appt.id}` : "/journey"} />
      <UltrasoundEditor appointmentId={appt?.id} defaultDate={date} defaultWeek={pregnancyProgress(ctx.data.pregnancy.dueDate, date).week} canEdit />
    </div>
  );
}
