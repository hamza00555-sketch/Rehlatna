"use client";

import { useRouter } from "next/navigation";
import type { PreparationFilter } from "@/server/view-models/preparation";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { m } from "@/i18n";

const FILTERS: PreparationFilter[] = ["all", "ready", "needed", "future"];

export function PreparationFilters({ current, basePath }: { current: PreparationFilter; basePath: string }) {
  const router = useRouter();
  return (
    <ChipRow label={m.preparation.status}>
      {FILTERS.map((f) => (
        <Chip key={f} selected={current === f} onClick={() => router.replace(f === "all" ? basePath : `${basePath}?status=${f}`, { scroll: false })}>
          {m.preparation.filters[f]}
        </Chip>
      ))}
    </ChipRow>
  );
}
