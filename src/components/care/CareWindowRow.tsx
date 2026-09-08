"use client";

import { useState } from "react";
import type { CareWindowVM } from "@/server/view-models/care";
import { TaskRow } from "@/components/ui/TaskRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BottomSheet } from "@/components/ui/Sheet";
import { Icon, type IconName } from "@/components/icons/Icon";
import { CareWindowBody } from "./CareWindowBody";
import { CareWindowActions } from "./CareWindowActions";
import { m } from "@/i18n";

const ICONS: Record<CareWindowVM["kind"], IconName> = { visit: "stethoscope", scan: "image", screening: "shield", vaccine: "heart", decision: "info" };

/** One row in "what matters at this stage"; opens the window's detail in a sheet. */
export function CareWindowRow({ vm, canEdit }: { vm: CareWindowVM; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TaskRow
        title={vm.title}
        meta={m.careWindows.weeks(vm.startWeek, vm.endWeek)}
        onClick={() => setOpen(true)}
        leading={<Icon name={ICONS[vm.kind]} size={20} />}
        trailing={<StatusBadge tone={vm.badge.tone}>{vm.badge.label}</StatusBadge>}
      />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={vm.title}>
        <CareWindowBody vm={vm} />
        <CareWindowActions vm={vm} canEdit={canEdit} onDone={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}
