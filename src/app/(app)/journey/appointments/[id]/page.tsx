import { notFound, redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { pregnancyProgress } from "@/domain/pregnancy";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CareProviderRow } from "@/components/ui/CareProviderRow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { DateText, TimeText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { AppointmentTasks, MarkAppointmentDone } from "@/components/appointments/AppointmentActions";
import { fmtInt, relativeDay } from "@/lib/format";
import { parseIso } from "@/domain/dates";
import { m } from "@/i18n";
import styles from "./appointment.module.css";

type Params = { params: Promise<{ id: string }> };

export default async function AppointmentDetailPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const appt = ctx.data.appointments.find((a) => a.id === id);
  if (!appt) notFound();
  const canEdit = ctx.viewer.permissions.includes("appointments:edit");
  const doctor = ctx.data.careProviders.find((d) => d.id === appt.doctorId);
  const hospital = ctx.data.hospitals.find((h) => h.id === appt.hospitalId);
  const ultrasounds = ctx.data.ultrasounds.filter((u) => u.appointmentId === appt.id);
  const week = pregnancyProgress(ctx.data.pregnancy.dueDate, appt.date).week;
  const day = parseIso(appt.date).getUTCDate();
  const badgeTone = appt.status === "done" ? "ready" : appt.status === "cancelled" ? "future" : "needed";
  const linkedWindow = appt.careWindowKey ? m.careWindows.windows[appt.careWindowKey as keyof typeof m.careWindows.windows] : undefined;

  return (
    <div className="page">
      <TopBar
        title={m.appointments.types[appt.type] ?? appt.type}
        backHref="/journey"
        actions={canEdit ? <IconButton icon="edit" label={m.common.edit} variant="quiet" href={`/journey/appointments/${appt.id}/edit`} /> : undefined}
      />

      <div className={styles.body}>
        <section className={styles.dateHero}>
          <div className={styles.dateBlock}>
            <DateText iso={appt.date} style="weekday" className={styles.weekday} />
            <span className={styles.bigDay}>
              <span className="num">{fmtInt(day)}</span>
              <DateText iso={appt.date} style="month" className={styles.month} />
            </span>
            <div className={styles.chips}>
              {appt.time && (
                <span className={styles.timeChip}>
                  <Icon name="clock" size={16} />
                  <TimeText value={appt.time} />
                </span>
              )}
              <StatusBadge tone={badgeTone}>{appt.status === "upcoming" ? relativeDay(appt.date, ctx.today) : m.appointments.statuses[appt.status]}</StatusBadge>
              <StatusBadge tone="future">
                {m.today.weekLabel} <span className="num">{fmtInt(week)}</span>
              </StatusBadge>
              {linkedWindow && <StatusBadge tone="medical">{linkedWindow.title}</StatusBadge>}
            </div>
          </div>
        </section>

        {(doctor || hospital) && (
          <div className={styles.providers}>
            {doctor && <CareProviderRow kind="doctor" title={doctor.name} subtitle={doctor.specialty} href={`/more/providers/doctor/${doctor.id}`} />}
            {hospital && (
              <CareProviderRow
                kind="hospital"
                title={hospital.name}
                subtitle={[hospital.city, appt.city && appt.city !== hospital.city ? appt.city : null].filter(Boolean).join(" · ")}
                href={`/more/providers/hospital/${hospital.id}`}
              />
            )}
          </div>
        )}
        {!hospital && appt.city && (
          <p className={styles.city}>
            <Icon name="pin" size={16} /> {appt.city}
          </p>
        )}

        {appt.preparationTasks.length > 0 && (
          <section>
            <SectionTitle>{m.appointments.preparationTasks}</SectionTitle>
            <AppointmentTasks id={appt.id} tasks={appt.preparationTasks} canEdit={canEdit} />
          </section>
        )}

        <section>
          <SectionTitle>{m.common.notes}</SectionTitle>
          <Card tone="tint" padding="md">
            <p className={styles.notes}>{appt.notes ?? "—"}</p>
          </Card>
        </section>

        {(appt.type === "ultrasound" || ultrasounds.length > 0) && (
          <section>
            <SectionTitle>{m.appointments.ultrasound}</SectionTitle>
            <RowGroup>
              {ultrasounds.map((u) => (
                <TaskRow key={u.id} title={m.appointments.ultrasound} meta={<DateText iso={u.date} style="short" />} href={`/journey/ultrasound/${u.id}`} />
              ))}
              {canEdit && <TaskRow title={m.appointments.addUltrasound} href={`/journey/ultrasound/new?appointment=${appt.id}`} leading={<Icon name="plus" size={20} />} />}
            </RowGroup>
          </section>
        )}

        <div className={styles.actions}>
          {appt.status === "upcoming" && canEdit && <MarkAppointmentDone id={appt.id} />}
          <div className={styles.secondary}>
            {hospital?.locationUrl && (
              <Button href={hospital.locationUrl} variant="outline" leading={<Icon name="pin" size={20} />}>
                {m.care.openLocation}
              </Button>
            )}
            {(hospital?.phone || doctor?.phone) && (
              <Button href={`tel:${hospital?.phone ?? doctor?.phone}`} variant="outline" leading={<Icon name="phone" size={20} />}>
                {m.care.call}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
