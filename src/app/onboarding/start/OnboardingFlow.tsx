"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DatingMethod, HouseholdRole } from "@/domain/types";
import { addDays } from "@/domain/dates";
import { pregnancyProgress, dueDateFromLmp, GESTATION_DAYS, LMP_MAX_PAST_DAYS } from "@/domain/pregnancy";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { Field, DateInput, TextInput } from "@/components/ui/Field";
import { DateText } from "@/components/ui/Num";
import { Toggle } from "@/components/ui/Toggle";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { Icon } from "@/components/icons/Icon";
import { api, ApiError } from "@/lib/api";
import { fmtInt } from "@/lib/format";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./onboarding-flow.module.css";

type Step = "story" | "dueDate" | "household" | "finance" | "cities";
const STEPS: Step[] = ["story", "dueDate", "household", "finance", "cities"];

interface FormState {
  datingMethod: DatingMethod;
  lastPeriodStartDate?: string;
  /** Only used when datingMethod === "clinician". */
  dueDate?: string;
  creatorName: string;
  creatorRole: HouseholdRole;
  hasPartner: boolean;
  partnerName: string;
  partnerRole: HouseholdRole;
  financeEnabled: boolean;
  financeOwner: "creator" | "partner";
  financeShared: boolean;
  followUpCity: string;
  sameCity: boolean;
  deliveryCity: string;
  productName: string;
}

const ROLE_OPTIONS: HouseholdRole[] = ["mother", "partner", "family_supporter"];

/**
 * Onboarding: story → due date → household & roles → finance privacy →
 * cities. Produces a real, respectful empty household (no demo content).
 */
export function OnboardingFlow({ today }: { today: string }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    datingMethod: "lmp",
    creatorName: "",
    creatorRole: "mother",
    hasPartner: true,
    partnerName: "",
    partnerRole: "partner",
    financeEnabled: false,
    financeOwner: "creator",
    financeShared: false,
    followUpCity: "",
    sameCity: true,
    deliveryCity: "",
    productName: "",
  });
  const step = STEPS[stepIndex]!;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const resolvedDueDate = form.datingMethod === "lmp" ? (form.lastPeriodStartDate ? dueDateFromLmp(form.lastPeriodStartDate) : undefined) : form.dueDate;
  const progress = useMemo(() => (resolvedDueDate ? pregnancyProgress(resolvedDueDate, today) : null), [resolvedDueDate, today]);

  const canContinue =
    step === "story" ||
    (step === "dueDate" && Boolean(resolvedDueDate)) ||
    (step === "household" && form.creatorName.trim().length > 0 && (!form.hasPartner || form.partnerName.trim().length > 0)) ||
    step === "finance" ||
    (step === "cities" && form.followUpCity.trim().length > 0 && (form.sameCity || form.deliveryCity.trim().length > 0));

  const next = async () => {
    setError(null);
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    setBusy(true);
    try {
      await api("/api/onboarding", {
        dating:
          form.datingMethod === "lmp"
            ? { datingMethod: "lmp" as const, lastPeriodStartDate: form.lastPeriodStartDate }
            : { datingMethod: "clinician" as const, dueDate: form.dueDate },
        creator: { displayName: form.creatorName.trim(), roles: [form.creatorRole] },
        partner: form.hasPartner ? { displayName: form.partnerName.trim(), roles: [form.partnerRole] } : undefined,
        finance: {
          enabled: form.financeEnabled,
          owner: form.hasPartner ? form.financeOwner : "creator",
          shared: form.financeShared,
        },
        followUpCity: form.followUpCity.trim(),
        deliveryCity: form.sameCity ? form.followUpCity.trim() : form.deliveryCity.trim(),
        productName: form.productName.trim() || undefined,
      });
      router.push("/today");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? m.common.error : m.common.error);
      setBusy(false);
    }
  };

  const back = () => (stepIndex === 0 ? router.push("/onboarding") : setStepIndex(stepIndex - 1));

  if (step === "story") {
    return (
      <section className={styles.story}>
        <div className={styles.storyTop}>
          <IconButton icon="back" label={m.common.back} variant="overMedia" onClick={back} />
          <Dots count={STEPS.length} active={stepIndex} />
        </div>
        <div className={styles.storyCopy}>
          <h1 className={styles.storyTitle}>{m.onboarding.storyTitle}</h1>
          <p className={styles.storySub}>{m.onboarding.storySubtitle}</p>
        </div>
        <Button variant="lightOverMedia" fullWidth onClick={next}>
          {m.onboarding.storyCta}
        </Button>
      </section>
    );
  }

  return (
    <div className={cx("page", styles.page)}>
      <div className={styles.top}>
        <IconButton icon="back" label={m.common.back} variant="quiet" onClick={back} />
        <span className={styles.stepLabel}>{m.onboarding.stepOf(stepIndex + 1, STEPS.length)}</span>
        <Dots count={STEPS.length} active={stepIndex} />
      </div>

      {step === "dueDate" && (
        <section className={styles.step}>
          <header className={styles.header}>
            <h1 className={styles.title}>{form.datingMethod === "lmp" ? m.onboarding.lmpTitle : m.onboarding.dueDateTitle}</h1>
          </header>
          <ChoiceGroup legend={m.onboarding.datingMethodLabel} columns={2}>
            <ChoiceCard name="onboarding-dating-method" value="lmp" checked={form.datingMethod === "lmp"} onChange={() => set("datingMethod", "lmp")} title={m.onboarding.lmpTabLabel} />
            <ChoiceCard
              name="onboarding-dating-method"
              value="clinician"
              checked={form.datingMethod === "clinician"}
              onChange={() => set("datingMethod", "clinician")}
              title={m.onboarding.clinicianTabLabel}
              description={m.onboarding.clinicianTabHelp}
            />
          </ChoiceGroup>
          {form.datingMethod === "lmp" ? (
            <Field id="onboarding-lmp" label={m.onboarding.lmpLabel} help={m.onboarding.lmpHelp}>
              <DateInput
                id="onboarding-lmp"
                value={form.lastPeriodStartDate ?? ""}
                onChange={(e) => set("lastPeriodStartDate", e.target.value)}
                min={addDays(today, -LMP_MAX_PAST_DAYS)}
                max={today}
                aria-describedby="onboarding-lmp-help"
              />
            </Field>
          ) : (
            <Field id="onboarding-due" label={m.onboarding.dueDateLabel} help={m.onboarding.dueDateHelp}>
              <DateInput
                id="onboarding-due"
                value={form.dueDate ?? ""}
                onChange={(e) => set("dueDate", e.target.value)}
                min={today}
                max={addDays(today, GESTATION_DAYS + 14)}
                aria-describedby="onboarding-due-help"
              />
            </Field>
          )}
          <div className={styles.preview} aria-live="polite">
            {progress && resolvedDueDate ? (
              <span className={styles.previewChip}>
                {m.onboarding.gestationalAgePreview(progress.week, progress.gestationalDays % 7)} · {m.onboarding.dueDatePreviewLabel}: <DateText iso={resolvedDueDate} style="long" />
              </span>
            ) : (
              <span className={styles.previewHint}>{form.datingMethod === "lmp" ? m.onboarding.lmpLabel : m.onboarding.dueDateLabel}</span>
            )}
          </div>
        </section>
      )}

      {step === "household" && (
        <section className={styles.step}>
          <header className={styles.header}>
            <h1 className={styles.title}>{m.onboarding.householdTitle}</h1>
            <p className={styles.help}>{m.onboarding.householdHelp}</p>
          </header>
          <Field id="creatorName" label={m.onboarding.yourName}>
            <TextInput id="creatorName" value={form.creatorName} onChange={(e) => set("creatorName", e.target.value)} autoComplete="given-name" />
          </Field>
          <ChoiceGroup legend={m.onboarding.yourRole}>
            {ROLE_OPTIONS.map((role) => (
              <ChoiceCard
                key={role}
                name="creatorRole"
                value={role}
                checked={form.creatorRole === role}
                onChange={(v) => set("creatorRole", v as HouseholdRole)}
                title={m.family.roles[role]!}
                description={m.family.roleHelp[role]}
                leading={<Icon name={role === "mother" ? "heart" : role === "partner" ? "users" : "user"} size={20} />}
              />
            ))}
          </ChoiceGroup>
          <Toggle id="hasPartner" checked={form.hasPartner} onChange={(v) => set("hasPartner", v)} label={m.onboarding.addPartner} description={form.hasPartner ? undefined : m.onboarding.noPartnerYet} />
          {form.hasPartner && (
            <>
              <Field id="partnerName" label={m.onboarding.partnerName}>
                <TextInput id="partnerName" value={form.partnerName} onChange={(e) => set("partnerName", e.target.value)} />
              </Field>
              <ChoiceGroup legend={m.family.memberRoles} columns={2}>
                {ROLE_OPTIONS.filter((r) => r !== form.creatorRole || r === "family_supporter").map((role) => (
                  <ChoiceCard
                    key={role}
                    name="partnerRole"
                    value={role}
                    checked={form.partnerRole === role}
                    onChange={(v) => set("partnerRole", v as HouseholdRole)}
                    title={m.family.roles[role]!}
                  />
                ))}
              </ChoiceGroup>
            </>
          )}
        </section>
      )}

      {step === "finance" && (
        <section className={styles.step}>
          <header className={styles.header}>
            <h1 className={styles.title}>{m.onboarding.privacyTitle}</h1>
            <p className={styles.help}>{m.onboarding.privacyHelp}</p>
          </header>
          <PrivacyNotice variant="general">{m.onboarding.privacyNotice}</PrivacyNotice>
          <Toggle id="financeEnabled" checked={form.financeEnabled} onChange={(v) => set("financeEnabled", v)} label={m.onboarding.financeEnable} />
          {form.financeEnabled && (
            <>
              {form.hasPartner && (
                <ChoiceGroup legend={m.onboarding.financeOwner} columns={2}>
                  <ChoiceCard name="financeOwner" value="creator" checked={form.financeOwner === "creator"} onChange={() => set("financeOwner", "creator")} title={form.creatorName.trim() || m.onboarding.yourName} />
                  <ChoiceCard name="financeOwner" value="partner" checked={form.financeOwner === "partner"} onChange={() => set("financeOwner", "partner")} title={form.partnerName.trim() || m.onboarding.partnerName} />
                </ChoiceGroup>
              )}
              <ChoiceGroup legend={m.finance.visibility.private!}>
                <ChoiceCard name="financeShared" value="private" checked={!form.financeShared} onChange={() => set("financeShared", false)} title={m.onboarding.financePrivate} description={m.onboarding.financePrivateHelp} leading={<Icon name="lock" size={20} />} />
                <ChoiceCard name="financeShared" value="shared" checked={form.financeShared} onChange={() => set("financeShared", true)} title={m.onboarding.financeShared} description={m.onboarding.financeSharedHelp} leading={<Icon name="users" size={20} />} />
              </ChoiceGroup>
              <PrivacyNotice variant="private">{m.onboarding.financePrivateHelp}</PrivacyNotice>
            </>
          )}
        </section>
      )}

      {step === "cities" && (
        <section className={styles.step}>
          <header className={styles.header}>
            <h1 className={styles.title}>{m.onboarding.citiesTitle}</h1>
            <p className={styles.help}>{m.onboarding.citiesHelp}</p>
          </header>
          <Field id="followUpCity" label={m.onboarding.followUpCity}>
            <TextInput id="followUpCity" value={form.followUpCity} onChange={(e) => set("followUpCity", e.target.value)} autoComplete="address-level2" />
          </Field>
          <Toggle id="sameCity" checked={form.sameCity} onChange={(v) => set("sameCity", v)} label={m.onboarding.sameCity} />
          {!form.sameCity && (
            <Field id="deliveryCity" label={m.onboarding.deliveryCity}>
              <TextInput id="deliveryCity" value={form.deliveryCity} onChange={(e) => set("deliveryCity", e.target.value)} />
            </Field>
          )}
          <Field id="productName" label={m.onboarding.productNameLabel} help={m.onboarding.productNameHelp} optional>
            <TextInput id="productName" value={form.productName} onChange={(e) => set("productName", e.target.value)} maxLength={40} />
          </Field>
        </section>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.footer}>
        <Button fullWidth onClick={next} disabled={!canContinue} loading={busy}>
          {stepIndex === STEPS.length - 1 ? m.onboarding.finish : m.common.continue}
        </Button>
      </div>
    </div>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <span className={styles.dots} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cx(styles.dot, i === active && styles.dotActive, i < active && styles.dotDone)} />
      ))}
      <span className="sr-only">{fmtInt(active + 1)}</span>
    </span>
  );
}
