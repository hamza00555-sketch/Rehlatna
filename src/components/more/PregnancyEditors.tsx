"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { Field, DateInput, TextInput } from "@/components/ui/Field";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { Toggle } from "@/components/ui/Toggle";
import { Num } from "@/components/ui/Num";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./Editors.module.css";

/** Due-date edits are explained: the displayed week changes; stored records do not. */
export function DueDateEditor({ dueDate, canEdit }: { dueDate: string; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(dueDate);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ weekBefore: number; weekAfter: number } | null>(null);
  if (!canEdit) return null;
  return (
    <>
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        {m.family.editDueDate}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.family.editDueDate}>
        <Field id="due-edit" label={m.family.dueDate} help={m.onboarding.dueDateHelp}>
          <DateInput id="due-edit" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        {result && (
          <PrivacyNotice variant="general">
            {m.family.dueDateChanged} {m.today.weekLabel} <Num value={result.weekBefore} /> → <Num value={result.weekAfter} />
          </PrivacyNotice>
        )}
        <Button
          fullWidth
          loading={busy}
          disabled={value === dueDate}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await api<{ changed: boolean; weekBefore?: number; weekAfter?: number }>("/api/pregnancy", { dueDate: value }, "PATCH");
              if (res.changed && res.weekBefore !== undefined && res.weekAfter !== undefined) setResult({ weekBefore: res.weekBefore, weekAfter: res.weekAfter });
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {m.common.save}
        </Button>
      </BottomSheet>
    </>
  );
}

export function CitiesEditor({ followUpCity, deliveryCity, canEdit }: { followUpCity: string; deliveryCity: string; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [follow, setFollow] = useState(followUpCity);
  const [same, setSame] = useState(followUpCity === deliveryCity);
  const [delivery, setDelivery] = useState(deliveryCity);
  const [busy, setBusy] = useState(false);
  if (!canEdit) return null;
  return (
    <>
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        {m.family.editCities}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.family.editCities}>
        <p className={styles.headMeta}>{m.onboarding.citiesHelp}</p>
        <Field id="city-follow" label={m.onboarding.followUpCity}>
          <TextInput id="city-follow" value={follow} onChange={(e) => setFollow(e.target.value)} />
        </Field>
        <Toggle id="city-same" label={m.onboarding.sameCity} checked={same} onChange={setSame} />
        {!same && (
          <Field id="city-delivery" label={m.onboarding.deliveryCity}>
            <TextInput id="city-delivery" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </Field>
        )}
        <Button
          fullWidth
          loading={busy}
          disabled={!follow.trim() || (!same && !delivery.trim())}
          onClick={async () => {
            setBusy(true);
            try {
              await api("/api/pregnancy/cities", { followUpCity: follow.trim(), deliveryCity: same ? follow.trim() : delivery.trim() }, "PATCH");
              setOpen(false);
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {m.common.save}
        </Button>
      </BottomSheet>
    </>
  );
}
