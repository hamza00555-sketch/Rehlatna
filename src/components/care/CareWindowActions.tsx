"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CareWindowVM } from "@/server/view-models/care";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./CareWindow.module.css";

/** What the family can do about a window: book it, record it, or say it does not apply. */
export function CareWindowActions({ vm, canEdit, onDone }: { vm: CareWindowVM; canEdit: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const log = async (state: "done" | "discussed" | "skipped" | null) => {
    setBusy(true);
    try {
      await api("/api/pregnancy/care-log", { key: vm.key, state }, "PATCH");
      router.refresh();
      onDone?.();
    } finally {
      setBusy(false);
    }
  };
  const bookHref = vm.appointmentType ? `/journey/appointments/new?type=${vm.appointmentType}&care=${vm.key}` : "/journey/appointments/new";
  const a = m.careWindows.actions;

  return (
    <div className={styles.actions}>
      {vm.matchedAppointmentId && (
        <Button href={`/journey/appointments/${vm.matchedAppointmentId}`} variant="outline" fullWidth>
          {a.viewAppointment}
        </Button>
      )}
      {canEdit && !vm.matchedAppointmentId && vm.status !== "done" && vm.status !== "upcoming" && (
        <Button href={bookHref} fullWidth>
          {a.addAppointment}
        </Button>
      )}
      {canEdit && vm.status !== "upcoming" && vm.status !== "done" && !vm.logged && (
        <div className={styles.row}>
          {(vm.kind === "decision" || vm.kind === "vaccine") && (
            <Button variant="outline" onClick={() => log("discussed")} disabled={busy}>
              {a.markDiscussed}
            </Button>
          )}
          <Button variant={vm.kind === "decision" || vm.kind === "vaccine" ? "quiet" : "outline"} onClick={() => log("done")} disabled={busy}>
            {a.markDone}
          </Button>
          {(vm.optional || vm.conditional) && (
            <Button variant="quiet" onClick={() => log("skipped")} disabled={busy}>
              {a.skip}
            </Button>
          )}
        </div>
      )}
      {canEdit && vm.status === "discussed" && (
        <Button variant="outline" onClick={() => log("done")} disabled={busy}>
          {a.markDone}
        </Button>
      )}
      {canEdit && vm.logged && (
        <Button variant="quiet" onClick={() => log(null)} disabled={busy}>
          {a.undo}
        </Button>
      )}
    </div>
  );
}
