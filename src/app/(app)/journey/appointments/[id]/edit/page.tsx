import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { TopBar } from "@/components/ui/TopBar";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { CancelAppointment } from "@/components/appointments/AppointmentActions";
import { m } from "@/i18n";

type Params = { params: Promise<{ id: string }> };

export default async function EditAppointmentPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!ctx.viewer.permissions.includes("appointments:edit")) redirect(`/journey/appointments/${id}`);
  const appointment = ctx.data.appointments.find((a) => a.id === id);
  if (!appointment) notFound();
  return (
    <div className="page">
      <TopBar title={m.appointments.edit} backHref={`/journey/appointments/${id}`} />
      <AppointmentForm appointment={appointment} doctors={ctx.data.careProviders} hospitals={ctx.data.hospitals} defaultCity={ctx.data.pregnancy.followUpCity} today={ctx.today} />
      {appointment.status === "upcoming" && <CancelAppointment id={appointment.id} />}
    </div>
  );
}
