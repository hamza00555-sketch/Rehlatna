"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { api } from "@/lib/api";
import { m } from "@/i18n";

interface Props {
  target: { kind: "hospital" | "insurance"; id: string };
  canEdit: boolean;
}

/** "تأكّد من التغطية": record today's verification (with the belief formed) or create a task. */
export function VerifyCoverage({ target, canEdit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [belief, setBelief] = useState<"yes" | "no">("yes");
  const [busy, setBusy] = useState(false);
  if (!canEdit) return null;
  const base = target.kind === "hospital" ? `/api/care/hospitals/${target.id}/verify` : `/api/care/insurance/${target.id}/verify`;

  const run = async (body: unknown) => {
    setBusy(true);
    try {
      await api(base, body);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        {m.care.verifyCoverage}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.care.verifyCoverage}>
        <p>{m.care.coverageInfo}</p>
        {target.kind === "hospital" && (
          <ChoiceGroup legend={m.care.believedCoveredField} columns={2}>
            <ChoiceCard name="belief" value="yes" checked={belief === "yes"} onChange={() => setBelief("yes")} title={m.care.coverageBelief.yes!} />
            <ChoiceCard name="belief" value="no" checked={belief === "no"} onChange={() => setBelief("no")} title={m.care.coverageBelief.no!} />
          </ChoiceGroup>
        )}
        <Button fullWidth loading={busy} onClick={() => run(target.kind === "hospital" ? { action: "verified", believedCovered: belief === "yes" } : { action: "verified" })}>
          {m.care.markVerifiedToday}
        </Button>
        <Button variant="outline" fullWidth disabled={busy} onClick={() => run({ action: "task" })}>
          {m.care.createVerifyTask}
        </Button>
      </BottomSheet>
    </>
  );
}

export function VerificationTasks({ tasks, canEdit }: { tasks: { id: string; subject: string; done: boolean }[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (tasks.length === 0) return null;
  return (
    <RowGroup>
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          title={t.subject}
          state={busy === t.id ? "disabled" : t.done ? "completed" : "open"}
          onToggle={
            canEdit
              ? async () => {
                  setBusy(t.id);
                  try {
                    await api(`/api/care/verification-tasks/${t.id}`, { done: !t.done }, "PATCH");
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
