"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, AppointmentType, CareProvider, Hospital } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Field, TextInput, DateInput, TimeInput, Select, TextArea } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./AppointmentForm.module.css";

const TYPES: AppointmentType[] = ["checkup", "ultrasound", "lab", "specialist", "delivery_planning", "postpartum_checkup", "baby_checkup", "other"];

interface Props {
  appointment?: Appointment;
  doctors: Pick<CareProvider, "id" | "name" | "hospitalId" | "city">[];
  hospitals: Pick<Hospital, "id" | "name" | "city">[];
  defaultCity: string;
  today: string;
  /** Pre-selected type when the form opens from a care window. */
  defaultType?: AppointmentType;
  /** The care window this appointment is booked for (shown, and stored on the appointment). */
  careWindow?: { key: string; title: string };
}

interface TaskDraft {
  id?: string;
  title: string;
  done: boolean;
}

export function AppointmentForm({ appointment, doctors, hospitals, defaultCity, today, defaultType, careWindow }: Props) {
  const router = useRouter();
  const [type, setType] = useState<AppointmentType>(appointment?.type ?? defaultType ?? "checkup");
  const [date, setDate] = useState(appointment?.date ?? today);
  const [time, setTime] = useState(appointment?.time ?? "");
  const [doctorId, setDoctorId] = useState(appointment?.doctorId ?? "");
  const [hospitalId, setHospitalId] = useState(appointment?.hospitalId ?? "");
  const [city, setCity] = useState(appointment?.city ?? defaultCity);
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [reminder, setReminder] = useState(appointment?.reminder ?? true);
  const [tasks, setTasks] = useState<TaskDraft[]>(appointment?.preparationTasks.map((t) => ({ ...t })) ?? []);
  const [newTask, setNewTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickHospital = (id: string) => {
    setHospitalId(id);
    const h = hospitals.find((x) => x.id === id);
    if (h?.city) setCity(h.city);
  };

  const submit = async () => {
    if (!date) {
      setError(m.forms.invalidDate);
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      type,
      date,
      time: time || undefined,
      doctorId: doctorId || undefined,
      hospitalId: hospitalId || undefined,
      city: city.trim() || undefined,
      notes: notes.trim() || undefined,
      preparationTasks: tasks.filter((t) => t.title.trim()),
      reminder,
      careWindowKey: appointment?.careWindowKey ?? careWindow?.key,
    };
    try {
      if (appointment) {
        await api(`/api/appointments/${appointment.id}`, payload, "PATCH");
        router.push(`/journey/appointments/${appointment.id}`);
      } else {
        const res = await api<{ id: string }>("/api/appointments", payload);
        router.push(`/journey/appointments/${res.id}`);
      }
      router.refresh();
    } catch {
      setError(m.common.error);
      setBusy(false);
    }
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {careWindow && <p className={styles.linked}>{m.careWindows.linkedTo(careWindow.title)}</p>}
      <Field id="apt-type" label={m.appointments.type}>
        <Select id="apt-type" value={type} onChange={(e) => setType(e.target.value as AppointmentType)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {m.appointments.types[t]}
            </option>
          ))}
        </Select>
      </Field>
      <div className={styles.row}>
        <Field id="apt-date" label={m.appointments.date}>
          <DateInput id="apt-date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field id="apt-time" label={m.appointments.time} optional>
          <TimeInput id="apt-time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field id="apt-doctor" label={m.appointments.doctor} optional>
        <Select id="apt-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">—</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="apt-hospital" label={m.appointments.hospital} optional>
        <Select id="apt-hospital" value={hospitalId} onChange={(e) => pickHospital(e.target.value)}>
          <option value="">—</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} · {h.city}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="apt-city" label={m.appointments.city} optional>
        <TextInput id="apt-city" value={city} onChange={(e) => setCity(e.target.value)} />
      </Field>

      <fieldset className={styles.tasks}>
        <legend className={styles.legend}>{m.appointments.preparationTasks}</legend>
        {tasks.map((t, i) => (
          <div key={t.id ?? i} className={styles.taskRow}>
            <TextInput aria-label={m.appointments.addTask} value={t.title} onChange={(e) => setTasks(tasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <IconButton icon="trash" label={m.common.delete} variant="quiet" onClick={() => setTasks(tasks.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div className={styles.taskRow}>
          <TextInput
            aria-label={m.appointments.addTask}
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTask.trim()) {
                e.preventDefault();
                setTasks([...tasks, { title: newTask.trim(), done: false }]);
                setNewTask("");
              }
            }}
          />
          <IconButton
            icon="plus"
            label={m.appointments.addTask}
            variant="neutral"
            disabled={!newTask.trim()}
            onClick={() => {
              setTasks([...tasks, { title: newTask.trim(), done: false }]);
              setNewTask("");
            }}
          />
        </div>
      </fieldset>

      <Field id="apt-notes" label={m.common.notes} optional>
        <TextArea id="apt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Toggle id="apt-reminder" checked={reminder} onChange={setReminder} label={m.appointments.reminder} />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth loading={busy}>
        {m.common.save}
      </Button>
    </form>
  );
}
