"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HouseholdSettings, NotificationPreference } from "@/domain/types";
import { Toggle } from "@/components/ui/Toggle";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { Field, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { Select } from "@/components/ui/Field";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./Editors.module.css";

interface Props {
  settings: HouseholdSettings;
  notifications: NotificationPreference | null;
  canManage: boolean;
  canFinance: boolean;
  financeOwnerName: string | null;
  members: { id: string; displayName: string; isViewer: boolean }[];
  isDemo: boolean;
}

export function SettingsPanel({ settings, notifications, canManage, canFinance, financeOwnerName, members, isDemo }: Props) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [n, setN] = useState(notifications ?? { appointments: true, weeklyUpdate: true, preparation: true, finance: false });
  const [productName, setProductName] = useState(settings.productName);
  const [currency, setCurrency] = useState(settings.currencyCode);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [switching, setSwitching] = useState(false);

  const patchSettings = async (patch: Partial<HouseholdSettings>) => {
    setS({ ...s, ...patch });
    await api("/api/household/settings", patch, "PATCH");
    router.refresh();
  };
  const patchNotif = async (patch: Partial<typeof n>) => {
    const next = { ...n, ...patch };
    setN(next);
    await api("/api/household/notifications", { appointments: next.appointments, weeklyUpdate: next.weeklyUpdate, preparation: next.preparation, finance: next.finance }, "PATCH");
  };

  return (
    <div className={styles.stack}>
      <section>
        <SectionTitle>{m.more.appearance}</SectionTitle>
        <ChoiceGroup legend={m.more.themeLegend} help={m.more.appearanceHelp} columns={3}>
          {(["system", "light", "dark"] as const).map((t) => (
            <ChoiceCard key={t} name="theme" value={t} checked={s.theme === t} onChange={() => patchSettings({ theme: t })} title={m.more.themeOptions[t]!} />
          ))}
        </ChoiceGroup>
        <Toggle id="reduce-motion" label={m.more.reduceMotion} description={m.more.reduceMotionHelp} checked={Boolean(s.reduceMotion)} onChange={(v) => patchSettings({ reduceMotion: v })} />
      </section>

      <section>
        <SectionTitle>{m.more.notifications}</SectionTitle>
        <Toggle id="n-appointments" label={m.more.notif.appointments} checked={n.appointments} onChange={(v) => patchNotif({ appointments: v })} />
        <Toggle id="n-weekly" label={m.more.notif.weeklyUpdate} checked={n.weeklyUpdate} onChange={(v) => patchNotif({ weeklyUpdate: v })} />
        <Toggle id="n-prep" label={m.more.notif.preparation} checked={n.preparation} onChange={(v) => patchNotif({ preparation: v })} />
        {canFinance && <Toggle id="n-finance" label={m.more.notif.finance} checked={n.finance} onChange={(v) => patchNotif({ finance: v })} />}
      </section>

      {canFinance && (
        <section>
          <SectionTitle>{m.more.financeSettings}</SectionTitle>
          <PrivacyNotice variant="private">{financeOwnerName ? m.more.financeOwnedBy(financeOwnerName) : m.more.financeSharedLabel}</PrivacyNotice>
          <Toggle id="fin-enabled" label={m.onboarding.financeEnable} checked={s.financeEnabled} onChange={(v) => patchSettings({ financeEnabled: v })} />
          <Toggle id="fin-shared" label={m.onboarding.financeShared} description={m.onboarding.financeSharedHelp} checked={s.financeShared} disabled={!s.financeEnabled} onChange={(v) => patchSettings({ financeShared: v })} />
        </section>
      )}

      {canManage && (
        <section className={styles.stack}>
          <SectionTitle>{m.more.productName}</SectionTitle>
          <Field id="product-name" label={m.more.productName} help={m.onboarding.productNameHelp}>
            <TextInput id="product-name" value={productName} onChange={(e) => setProductName(e.target.value)} maxLength={40} />
          </Field>
          <Field id="currency" label={m.more.currency}>
            <TextInput id="currency" numeric value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </Field>
          <Button
            variant="outline"
            fullWidth
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await patchSettings({ productName: productName.trim() || settings.productName, currencyCode: currency.length === 3 ? currency : settings.currencyCode });
              } finally {
                setBusy(false);
              }
            }}
          >
            {m.common.save}
          </Button>
        </section>
      )}

      <section className={styles.stack}>
        <SectionTitle>{m.more.exportData}</SectionTitle>
        <Button href="/api/household/export" variant="outline" fullWidth>
          {m.more.exportDataHelp}
        </Button>
      </section>

      <section className={styles.stack}>
        <SectionTitle>{m.more.developerTools}</SectionTitle>
        <PrivacyNotice variant="warning">{m.more.developerToolsHelp}</PrivacyNotice>
        <Field id="member-switch" label={m.a11y.memberSwitcher}>
          <Select
            id="member-switch"
            value={members.find((mm) => mm.isViewer)?.id ?? ""}
            disabled={switching}
            onChange={async (e) => {
              setSwitching(true);
              try {
                await api("/api/session/member", { memberId: e.target.value });
                router.refresh();
              } finally {
                setSwitching(false);
              }
            }}
          >
            {members.map((mm) => (
              <option key={mm.id} value={mm.id}>
                {mm.displayName}
              </option>
            ))}
          </Select>
        </Field>
        {isDemo ? (
          <div className={styles.row}>
            <Button
              variant="outline"
              onClick={async () => {
                await api("/api/demo/reset");
                router.refresh();
              }}
            >
              {m.more.demoReset}
            </Button>
            <Button
              variant="quiet"
              onClick={async () => {
                await api("/api/session/exit");
                router.push("/onboarding");
                router.refresh();
              }}
            >
              {m.more.exitDemo}
            </Button>
          </div>
        ) : (
          canManage && (
            <>
              <Button variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
                {m.more.deleteHousehold}
              </Button>
              <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={m.more.deleteHousehold}>
                <p>{m.more.deleteHouseholdConfirm}</p>
                <Button
                  variant="danger"
                  fullWidth
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api("/api/household", undefined, "DELETE");
                      router.push("/onboarding");
                      router.refresh();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {m.common.confirm}
                </Button>
                <Button variant="quiet" fullWidth onClick={() => setConfirmDelete(false)}>
                  {m.common.cancel}
                </Button>
              </BottomSheet>
            </>
          )
        )}
      </section>
    </div>
  );
}
