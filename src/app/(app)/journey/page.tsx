import { TopBar } from "@/components/ui/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { m } from "@/i18n";

export default function JourneyPage() {
  return (
    <div className="page">
      <TopBar title={m.journey.title} />
      <EmptyState title={m.journey.title} body={m.journey.empty} icon="journey" compact />
    </div>
  );
}
