"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./onboarding.module.css";

/** Secondary entry into the populated demo — clearly a demo, never the default. */
export function DemoEntry() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="quiet"
      fullWidth
      loading={busy}
      className={styles.demo}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/demo/enter", { scenario: "pregnancy" });
          router.push("/today");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {m.more.enterDemo}
    </Button>
  );
}
