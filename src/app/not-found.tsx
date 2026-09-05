import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { m } from "@/i18n";

export default function NotFound() {
  return (
    <div className="page">
      <EmptyState title={m.more.notFoundTitle} body={m.more.notFoundBody} icon="info" action={<Button href="/today">{m.nav.today}</Button>} />
    </div>
  );
}
