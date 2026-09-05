"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CareProvider, CareProviderKind, Hospital, HospitalPurpose, InsuranceRecord } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { Field, TextInput, Select, TextArea } from "@/components/ui/Field";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./ProviderForm.module.css";

export type ProviderKind = "doctor" | "hospital" | "insurance";

interface Props {
  kind?: ProviderKind;
  doctor?: CareProvider;
  hospital?: Hospital;
  insurance?: InsuranceRecord;
  hospitals: Pick<Hospital, "id" | "name" | "city">[];
  defaultCity: string;
  deliveryCity: string;
}

const DOCTOR_KINDS: CareProviderKind[] = ["follow_up", "delivery", "specialist", "backup"];
const PURPOSES: HospitalPurpose[] = ["follow_up", "delivery", "emergency"];

/** One form for doctors, hospitals and insurance. Coverage is a belief, never a promise. */
export function ProviderForm({ kind: initialKind, doctor, hospital, insurance, hospitals, defaultCity, deliveryCity }: Props) {
  const router = useRouter();
  const editing = Boolean(doctor || hospital || insurance);
  const [kind, setKind] = useState<ProviderKind>(initialKind ?? (hospital ? "hospital" : insurance ? "insurance" : "doctor"));
  // doctor
  const [name, setName] = useState(doctor?.name ?? hospital?.name ?? insurance?.provider ?? "");
  const [specialty, setSpecialty] = useState(doctor?.specialty ?? "");
  const [doctorKind, setDoctorKind] = useState<CareProviderKind>(doctor?.kind ?? "follow_up");
  const [hospitalId, setHospitalId] = useState(doctor?.hospitalId ?? "");
  const [city, setCity] = useState(doctor?.city ?? hospital?.city ?? defaultCity);
  const [phone, setPhone] = useState(doctor?.phone ?? hospital?.phone ?? "");
  const [notes, setNotes] = useState(doctor?.notes ?? hospital?.notes ?? insurance?.coverageNotes ?? "");
  // hospital
  const [purposes, setPurposes] = useState<HospitalPurpose[]>(hospital?.purposes ?? ["delivery"]);
  const [locationUrl, setLocationUrl] = useState(hospital?.locationUrl ?? "");
  const [belief, setBelief] = useState<"yes" | "no" | "unknown">(hospital?.insuranceBelievedCovered === true ? "yes" : hospital?.insuranceBelievedCovered === false ? "no" : "unknown");
  // insurance
  const [planName, setPlanName] = useState(insurance?.planName ?? "");
  const [candidates, setCandidates] = useState<string[]>(insurance?.candidateHospitalIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError(m.forms.requiredField);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (kind === "doctor") {
        const payload = { kind: doctorKind, name: name.trim(), specialty: specialty.trim() || undefined, hospitalId: hospitalId || undefined, city: city.trim() || undefined, phone: phone.trim() || undefined, notes: notes.trim() || undefined };
        const id = doctor ? (await api(`/api/care/doctors/${doctor.id}`, payload, "PATCH"), doctor.id) : (await api<{ id: string }>("/api/care/doctors", payload)).id;
        router.push(`/more/providers/doctor/${id}`);
      } else if (kind === "hospital") {
        if (purposes.length === 0) throw new Error("purpose");
        const payload = { name: name.trim(), city: city.trim() || deliveryCity, purposes, phone: phone.trim() || undefined, locationUrl: locationUrl.trim() || undefined, notes: notes.trim() || undefined, insuranceBelievedCovered: belief === "unknown" ? undefined : belief === "yes" };
        const id = hospital ? (await api(`/api/care/hospitals/${hospital.id}`, payload, "PATCH"), hospital.id) : (await api<{ id: string }>("/api/care/hospitals", payload)).id;
        router.push(`/more/providers/hospital/${id}`);
      } else {
        const payload = { provider: name.trim(), planName: planName.trim() || undefined, coverageNotes: notes.trim() || undefined, candidateHospitalIds: candidates };
        const id = insurance ? (await api(`/api/care/insurance/${insurance.id}`, payload, "PATCH"), insurance.id) : (await api<{ id: string }>("/api/care/insurance", payload)).id;
        router.push(`/more/providers/insurance/${id}`);
      }
      router.refresh();
    } catch {
      setError(m.common.error);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      if (doctor) await api(`/api/care/doctors/${doctor.id}`, undefined, "DELETE");
      if (hospital) await api(`/api/care/hospitals/${hospital.id}`, undefined, "DELETE");
      if (insurance) await api(`/api/care/insurance/${insurance.id}`, undefined, "DELETE");
      router.push("/more/providers");
      router.refresh();
    } finally {
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
      {!editing && (
        <ChoiceGroup legend={m.care.kindLabel} columns={2}>
          {(["doctor", "hospital", "insurance"] as ProviderKind[]).map((k) => (
            <ChoiceCard key={k} name="provider-kind" value={k} checked={kind === k} onChange={(v) => setKind(v as ProviderKind)} title={m.care.kindOptions[k]!} />
          ))}
        </ChoiceGroup>
      )}

      <Field id="p-name" label={kind === "doctor" ? m.care.doctorName : kind === "hospital" ? m.care.hospitalName : m.care.provider} error={error ?? undefined}>
        <TextInput id="p-name" value={name} onChange={(e) => setName(e.target.value)} invalid={Boolean(error)} maxLength={120} />
      </Field>

      {kind === "doctor" && (
        <>
          <Field id="p-doctor-kind" label={m.care.kind}>
            <Select id="p-doctor-kind" value={doctorKind} onChange={(e) => setDoctorKind(e.target.value as CareProviderKind)}>
              {DOCTOR_KINDS.map((k) => (
                <option key={k} value={k}>
                  {m.care.kinds[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="p-specialty" label={m.care.specialty} optional>
            <TextInput id="p-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </Field>
          <Field id="p-hospital" label={m.appointments.hospital} optional>
            <Select id="p-hospital" value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
              <option value="">—</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} · {h.city}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {kind === "hospital" && (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{m.care.purpose}</legend>
          <ChipRow label={m.care.purpose}>
            {PURPOSES.map((p) => (
              <Chip key={p} selected={purposes.includes(p)} role="checkbox" aria-checked={purposes.includes(p)} onClick={() => setPurposes(purposes.includes(p) ? purposes.filter((x) => x !== p) : [...purposes, p])}>
                {m.care.purposes[p]}
              </Chip>
            ))}
          </ChipRow>
        </fieldset>
      )}

      {kind !== "insurance" && (
        <div className={styles.row}>
          <Field id="p-city" label={m.care.city}>
            <TextInput id="p-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field id="p-phone" label={m.care.phone} optional>
            <TextInput id="p-phone" numeric inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
      )}

      {kind === "hospital" && (
        <>
          <Field id="p-location" label={m.care.location} optional>
            <TextInput id="p-location" numeric inputMode="url" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} />
          </Field>
          <ChoiceGroup legend={m.care.believedCoveredField} help={m.care.coverageDisclaimer}>
            {(["yes", "no", "unknown"] as const).map((b) => (
              <ChoiceCard key={b} name="p-belief" value={b} checked={belief === b} onChange={(v) => setBelief(v as typeof belief)} title={m.care.coverageBelief[b]!} />
            ))}
          </ChoiceGroup>
        </>
      )}

      {kind === "insurance" && (
        <>
          <Field id="p-plan" label={m.care.plan} optional>
            <TextInput id="p-plan" value={planName} onChange={(e) => setPlanName(e.target.value)} />
          </Field>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>{m.care.candidateHospitals}</legend>
            {hospitals.length === 0 ? (
              <p className={styles.help}>{m.care.noProvidersBody}</p>
            ) : (
              <ChipRow label={m.care.candidateHospitals}>
                {hospitals.map((h) => (
                  <Chip key={h.id} selected={candidates.includes(h.id)} role="checkbox" aria-checked={candidates.includes(h.id)} onClick={() => setCandidates(candidates.includes(h.id) ? candidates.filter((x) => x !== h.id) : [...candidates, h.id])}>
                    {h.name}
                  </Chip>
                ))}
              </ChipRow>
            )}
          </fieldset>
          <PrivacyNotice variant="warning">{m.care.coverageDisclaimer}</PrivacyNotice>
        </>
      )}

      <Field id="p-notes" label={kind === "insurance" ? m.care.coverageNotes : m.common.notes} optional>
        <TextArea id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Button type="submit" fullWidth loading={busy}>
        {m.common.save}
      </Button>
      {editing && (
        <>
          <Button type="button" variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
            {m.care.deleteProvider}
          </Button>
          <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={m.care.deleteProvider}>
            <p>{m.finance.confirmChangeBody}</p>
            <Button variant="danger" fullWidth loading={busy} onClick={remove}>
              {m.common.confirm}
            </Button>
            <Button variant="quiet" fullWidth onClick={() => setConfirmDelete(false)}>
              {m.common.cancel}
            </Button>
          </BottomSheet>
        </>
      )}
    </form>
  );
}
