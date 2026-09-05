"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BirthPlan, CareProvider, Hospital, InsuranceRecord } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput, TextArea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./Editors.module.css";

interface Props {
  plan: BirthPlan | null;
  hospitals: Pick<Hospital, "id" | "name" | "city">[];
  doctors: Pick<CareProvider, "id" | "name" | "kind">[];
  insurance: Pick<InsuranceRecord, "id" | "provider">[];
  canEdit: boolean;
}

export function BirthPlanEditor({ plan, hospitals, doctors, insurance, canEdit }: Props) {
  const router = useRouter();
  const [hospitalId, setHospitalId] = useState(plan?.hospitalId ?? "");
  const [doctorId, setDoctorId] = useState(plan?.doctorId ?? "");
  const [insuranceId, setInsuranceId] = useState(plan?.insuranceId ?? "");
  const [support, setSupport] = useState(plan?.supportPerson ?? "");
  const [preferences, setPreferences] = useState(plan?.preferences ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      await api("/api/birth-plan", { hospitalId: hospitalId || undefined, doctorId: doctorId || undefined, insuranceId: insuranceId || undefined, supportPerson: support.trim() || undefined, preferences: preferences.trim() || undefined }, "PUT");
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.stack}>
      <Field id="bp-hospital" label={m.birthPlan.hospital} help={hospitals.length === 0 ? m.care.noProvidersBody : undefined}>
        <Select id="bp-hospital" value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} disabled={!canEdit}>
          <option value="">{m.birthPlan.notChosen}</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} · {h.city}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="bp-doctor" label={m.birthPlan.doctor}>
        <Select id="bp-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} disabled={!canEdit}>
          <option value="">{m.birthPlan.notChosen}</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {m.care.kinds[d.kind]}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="bp-insurance" label={m.birthPlan.insurance}>
        <Select id="bp-insurance" value={insuranceId} onChange={(e) => setInsuranceId(e.target.value)} disabled={!canEdit}>
          <option value="">{m.birthPlan.notChosen}</option>
          {insurance.map((i) => (
            <option key={i.id} value={i.id}>
              {i.provider}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="bp-support" label={m.birthPlan.support} help={m.birthPlan.supportHelp} optional>
        <TextInput id="bp-support" value={support} onChange={(e) => setSupport(e.target.value)} disabled={!canEdit} />
      </Field>
      <Field id="bp-pref" label={m.birthPlan.preferences} help={m.birthPlan.preferencesHelp} optional>
        <TextArea id="bp-pref" value={preferences} onChange={(e) => setPreferences(e.target.value)} disabled={!canEdit} />
      </Field>
      {canEdit && (
        <Button fullWidth onClick={save} loading={busy}>
          {m.common.save}
        </Button>
      )}
      {saved && (
        <p className={styles.saved} role="status">
          {m.forms.saved}
        </p>
      )}
    </div>
  );
}
