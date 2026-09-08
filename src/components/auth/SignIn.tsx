"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { api, ApiError } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./SignIn.module.css";

/** Passwordless: email → six-digit code. No account screens, no passwords to forget. */
export function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/otp", { email: email.trim() });
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? m.auth.sendFailed : m.common.error);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirect: string }>("/api/auth/verify", { email: email.trim(), token: code.trim() });
      router.push(res.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? m.auth.invalidCode : m.common.error);
      setBusy(false);
    }
  };

  return (
    <div className={styles.stack}>
      {step === "email" ? (
        <form
          className={styles.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Field id="auth-email" label={m.auth.email} error={error ?? undefined}>
            <TextInput id="auth-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" fullWidth loading={busy} disabled={!email.includes("@")}>
            {m.auth.sendCode}
          </Button>
          <PrivacyNotice variant="general">{m.auth.privacy}</PrivacyNotice>
        </form>
      ) : (
        <form
          className={styles.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className={styles.help}>{m.auth.codeHelp(email.trim())}</p>
          <Field id="auth-code" label={m.auth.code} help={m.auth.codeAlt} error={error ?? undefined}>
            <TextInput id="auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={8} dir="ltr" numeric value={code} onChange={(e) => setCode(e.target.value)} required />
          </Field>
          <Button type="submit" fullWidth loading={busy} disabled={code.trim().length < 6}>
            {m.auth.verify}
          </Button>
          <div className={styles.row}>
            <Button variant="quiet" onClick={() => void send()} disabled={busy}>
              {m.auth.resend}
            </Button>
            <Button variant="quiet" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
              {m.auth.changeEmail}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
