import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CareProviderRow } from "@/components/ui/CareProviderRow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { m } from "@/i18n";
import styles from "../../../more.module.css";

type Params = { params: Promise<{ id: string }> };

export default async function DoctorPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const doctor = ctx.data.careProviders.find((d) => d.id === id);
  if (!doctor) notFound();
  const hospital = ctx.data.hospitals.find((h) => h.id === doctor.hospitalId);
  const appointments = ctx.data.appointments.filter((a) => a.doctorId === doctor.id && a.status !== "cancelled").sort((a, b) => (a.date < b.date ? -1 : 1));
  const next = appointments.find((a) => a.status === "upcoming" && a.date >= ctx.today);
  const canEdit = can(ctx.viewer, "care:edit");

  return (
    <div className="page">
      <TopBar title={doctor.name} subtitle={[m.care.kinds[doctor.kind], doctor.specialty].filter(Boolean).join(" · ")} backHref="/more/providers" actions={canEdit ? <IconButton icon="edit" label={m.common.edit} variant="quiet" href={`/more/providers/edit/doctor/${doctor.id}`} /> : undefined} />
      <div className={styles.body}>
        <div className={styles.chips}>
          {doctor.city && (
            <StatusBadge tone="future">
              <Icon name="pin" size={16} /> {doctor.city}
            </StatusBadge>
          )}
          <StatusBadge tone="medical">{m.care.kinds[doctor.kind]}</StatusBadge>
        </div>
        {hospital && <CareProviderRow kind="hospital" title={hospital.name} subtitle={hospital.city} href={`/more/providers/hospital/${hospital.id}`} />}
        {next && (
          <Card tone="blue" padding="md" className={styles.fact}>
            <span className={styles.factLabel}>{m.care.nextAppointment}</span>
            <span className={styles.factValue}>
              {m.appointments.types[next.type]} · <DateText iso={next.date} style="long" />
            </span>
          </Card>
        )}
        {appointments.length > 0 && (
          <section className={styles.section}>
            <SectionTitle>{m.care.linkedAppointments}</SectionTitle>
            <RowGroup>
              {appointments.map((a) => (
                <TaskRow key={a.id} title={m.appointments.types[a.type] ?? a.type} meta={<DateText iso={a.date} style="short" />} state={a.status === "done" ? "completed" : "open"} href={`/journey/appointments/${a.id}`} />
              ))}
            </RowGroup>
          </section>
        )}
        {doctor.notes && (
          <Card tone="tint" padding="md">
            <p className={styles.notes}>{doctor.notes}</p>
          </Card>
        )}
        <div className={styles.actions}>
          {doctor.phone && (
            <Button href={`tel:${doctor.phone}`} variant="outline" leading={<Icon name="phone" size={20} />}>
              {m.care.call}
            </Button>
          )}
          {can(ctx.viewer, "appointments:edit") && (
            <Button href="/journey/appointments/new" variant="outline" leading={<Icon name="calendar" size={20} />}>
              {m.appointments.add}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
