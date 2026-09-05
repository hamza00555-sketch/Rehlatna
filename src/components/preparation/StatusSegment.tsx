"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PreparationStatus } from "@/domain/types";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { api } from "@/lib/api";
import { m } from "@/i18n";

const ORDER: PreparationStatus[] = ["need_to_buy", "undecided", "owned", "not_required"];

/** Quick status change on the item page; the server owns the state. */
export function StatusSegment({ itemId, status, canEdit }: { itemId: string; status: PreparationStatus; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  return (
    <>
      <ChipRow label={m.preparation.status}>
        {ORDER.map((s) => (
          <Chip
            key={s}
            selected={status === s}
            disabled={!canEdit || busy}
            onClick={async () => {
              if (s === status) return;
              setBusy(true);
              try {
                await api(`/api/preparation/${itemId}`, { status: s }, "PATCH");
                setAnnounce(m.a11y.statusChanged);
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}
          >
            {m.preparation.statuses[s]}
          </Chip>
        ))}
      </ChipRow>
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </>
  );
}
