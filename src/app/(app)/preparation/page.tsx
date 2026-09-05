import { TopBar } from "@/components/ui/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { m } from "@/i18n";

export default function PreparationPage() {
  return (
    <div className="page">
      <TopBar title={m.preparation.title} />
      <EmptyState title={m.preparation.emptyTitle} body={m.preparation.emptyBody} icon="preparation" />
    </div>
  );
}
