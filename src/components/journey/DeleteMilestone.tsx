"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { api } from "@/lib/api";
import { m } from "@/i18n";

/** Destructive action always behind an explicit confirmation sheet. */
export function DeleteMilestone({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="danger" fullWidth onClick={() => setOpen(true)}>
        {m.common.delete}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.common.delete}>
        <p>{m.finance.confirmChangeBody}</p>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/api/milestones/${encodeURIComponent(id)}`, undefined, "DELETE");
              router.push("/journey");
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {m.common.confirm}
        </Button>
        <Button variant="quiet" fullWidth onClick={() => setOpen(false)}>
          {m.common.cancel}
        </Button>
      </BottomSheet>
    </>
  );
}
