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
  /** Member switcher and demo controls: only in the demo or on a local session without Supabase. */
  showDeveloperTools: boolean;
  /** Signed-in email when Supabase auth is active; null on the local development session. */
  authEmail?: string | null;
}

export function SettingsPanel({ settings, notifications, canManage, canFinance, financeOwnerName, members, isDemo, showDeveloperTools, authEmail }: Props) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [n, setN] = useState(notifications ?? { appointments: true, weeklyUpdate: true, preparation: true, finance: false });
  const [productName, setProductName] = useState(settings.productName);
  const [currency, setCurrency] = useState(settings.currencyCode);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optimistic, but honest: a failed save reverts the control and says so.
  const patchSettings = async (patch: Partial<HouseholdSettings>) => {
    const previous = s;
    setS({ ...s, ...patch });
    setError(null);
    try {
      await api("/api/household/settings", patch, "PATCH");
      router.refresh();
    } catch {
      setS(previous);
      setError(m.more.saveFailed);
    }
  };
  const patchNotif = async (patch: Partial<typeof n>) => {
    const previous = n;
    const next = { ...n, ...patch };
    setN(next);
    setError(null);
    try {
      await api("/api/household/notifications", { appointments: next.appointments, weeklyUpdate: next.weeklyUpdate, preparation: next.preparation, finance: next.finance }, "PATCH");
    } catch {
      setN(previous);
      setError(m.more.saveFailed);
    }
  };
  const signOut = async () => {
    await api("/api/session/exit");
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <div className={styles.stack}>
      {error && (
        <div role="alert">
          <PrivacyNotice variant="warning">{error}</PrivacyNotice>
        </div>
      )}
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
        <SectionTitle>
          {m.more.notifications} · {m.more.notificationsUnavailable}
        </SectionTitle>
        <PrivacyNotice variant="warning">{m.more.notificationsUnavailableHelp}</PrivacyNotice>
        <Toggle id="n-appointments" label={m.more.notif.appointments} checked={n.appointments} disabled onChange={(v) => patchNotif({ appointments: v })} />
        <Toggle id="n-weekly" label={m.more.notif.weeklyUpdate} checked={n.weeklyUpdate} disabled onChange={(v) => patchNotif({ weeklyUpdate: v })} />
        <Toggle id="n-prep" label={m.more.notif.preparation} checked={n.preparation} disabled onChange={(v) => patchNotif({ preparation: v })} />
        {canFinance && <Toggle id="n-finance" label={m.more.notif.finance} checked={n.finance} disabled onChange={(v) => patchNotif({ finance: v })} />}
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

      {!isDemo && authEmail && (
        <section className={styles.stack}>
          <SectionTitle>{m.more.account}</SectionTitle>
          <div className={styles.row}>
            <span className={styles.saved}>{m.auth.signedInAs(authEmail)}</span>
            <Button variant="quiet" onClick={signOut}>
              {m.auth.signOut}
            </Button>
          </div>
        </section>
      )}

      {!isDemo && canManage && (
        <section className={styles.stack}>
          <SectionTitle>{m.more.startOver}</SectionTitle>
          <PrivacyNotice variant="warning">{m.more.deleteHouseholdHelp}</PrivacyNotice>
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
                setError(null);
                try {
                  const res = await api<{ redirect: string }>("/api/household", undefined, "DELETE");
                  router.push(res.redirect);
                  router.refresh();
                } catch {
                  setError(m.more.saveFailed);
                  setConfirmDelete(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {m.more.deleteHouseholdCta}
            </Button>
            <Button variant="quiet" fullWidth onClick={() => setConfirmDelete(false)}>
              {m.common.cancel}
            </Button>
          </BottomSheet>
        </section>
      )}

      {showDeveloperTools && (
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
        {isDemo && (
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
            <Button variant="quiet" onClick={signOut}>
              {m.more.exitDemo}
            </Button>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
