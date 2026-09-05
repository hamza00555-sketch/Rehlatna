import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { TopBar } from "@/components/ui/TopBar";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { m } from "@/i18n";

export const metadata = { title: "إضافة موعد" };

export default async function NewAppointmentPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!ctx.viewer.permissions.includes("appointments:edit")) redirect("/journey");
  return (
    <div className="page">
      <TopBar title={m.appointments.add} backHref="/journey" />
      <AppointmentForm doctors={ctx.data.careProviders} hospitals={ctx.data.hospitals} defaultCity={ctx.data.pregnancy.followUpCity} today={ctx.today} />
    </div>
  );
}
