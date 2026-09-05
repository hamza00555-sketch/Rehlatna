"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { m } from "@/i18n";

/** Seeds the suggested starter list — every item begins `undecided`. */
export function SuggestButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/preparation", { suggested: true });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {m.preparation.startSuggested}
    </Button>
  );
}
