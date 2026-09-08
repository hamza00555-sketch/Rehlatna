import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { TopBar } from "@/components/ui/TopBar";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { m } from "@/i18n";
import type { AppointmentType } from "@/domain/types";

const TYPES: AppointmentType[] = ["checkup", "ultrasound", "lab", "specialist", "delivery_planning", "postpartum_checkup", "baby_checkup", "other"];

export const metadata = { title: "إضافة موعد" };

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const defaultType = TYPES.includes(type as AppointmentType) ? (type as AppointmentType) : undefined;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  if (!ctx.viewer.permissions.includes("appointments:edit")) redirect("/journey");
  return (
    <div className="page">
      <TopBar title={m.appointments.add} backHref="/journey" />
      <AppointmentForm doctors={ctx.data.careProviders} hospitals={ctx.data.hospitals} defaultCity={ctx.data.pregnancy.followUpCity} today={ctx.today} defaultType={defaultType} />
    </div>
  );
}
