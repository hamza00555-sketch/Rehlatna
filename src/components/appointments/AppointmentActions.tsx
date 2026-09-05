"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChecklistTask } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { api } from "@/lib/api";
import { m } from "@/i18n";

/** Toggle preparation tasks in place; the server owns the state. */
export function AppointmentTasks({ id, tasks, canEdit }: { id: string; tasks: ChecklistTask[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (tasks.length === 0) return null;
  return (
    <RowGroup>
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          title={t.title}
          state={busy === t.id ? "disabled" : t.done ? "completed" : "open"}
          onToggle={
            canEdit
              ? async () => {
                  setBusy(t.id);
                  try {
                    await api(`/api/appointments/${id}`, { toggleTaskId: t.id }, "PATCH");
                    router.refresh();
                  } finally {
                    setBusy(null);
                  }
                }
              : undefined
          }
        />
      ))}
    </RowGroup>
  );
}

export function MarkAppointmentDone({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      fullWidth
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/appointments/${id}`, { status: "done" }, "PATCH");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {m.appointments.markDone}
    </Button>
  );
}

export function CancelAppointment({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="danger" fullWidth onClick={() => setOpen(true)}>
        {m.appointments.cancelAppointment}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.appointments.cancelAppointment}>
        <p>{m.finance.confirmChangeBody}</p>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/api/appointments/${id}`, { status: "cancelled" }, "PATCH");
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
