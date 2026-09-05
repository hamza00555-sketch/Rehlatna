"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { m } from "@/i18n";

/** Recoverable error boundary — data is safe on the server; offer a retry. */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="page">
      <EmptyState state="error" title={m.more.errorTitle} body={m.more.errorBody} icon="alert" action={<Button onClick={reset}>{m.common.retry}</Button>} />
    </div>
  );
}
