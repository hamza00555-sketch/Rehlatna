import { TopBar } from "@/components/ui/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { m } from "@/i18n";

export default function MorePage() {
  return (
    <div className="page">
      <TopBar title={m.more.title} />
      <EmptyState title={m.more.title} body={m.more.familyHelp} icon="more" compact />
    </div>
  );
}
