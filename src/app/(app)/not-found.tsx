import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { m } from "@/i18n";

/** Missing record inside the shell: a calm dead end with a way back, never the error boundary. */
export default function AppNotFound() {
  return (
    <div className="page">
      <EmptyState title={m.more.notFoundTitle} body={m.more.notFoundBody} icon="info" action={<Button href="/today">{m.nav.today}</Button>} />
    </div>
  );
}
