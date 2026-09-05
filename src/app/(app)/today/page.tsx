import { TopBar } from "@/components/ui/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { m } from "@/i18n";

/** Placeholder until Phase 2 delivers the Baby Hero Today experience. */
export default function TodayPage() {
  return (
    <div className="page">
      <TopBar title={m.nav.today} />
      <EmptyState title={m.today.journeyContinues} body={m.today.lifeGrows} compact />
    </div>
  );
}
