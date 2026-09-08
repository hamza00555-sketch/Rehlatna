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
      {step === "email" && (
        <>
          <a href="/api/auth/google" className={styles.google}>
            <GoogleMark />
            <span>{m.auth.google}</span>
          </a>
          <div className={styles.divider} role="separator" aria-label={m.auth.or}>
            <span>{m.auth.or}</span>
          </div>
        </>
      )}
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

/** Google's "G" mark, inline so no external asset is needed. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-10L2.6 34.7C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
