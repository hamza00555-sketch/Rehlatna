import { redirect } from "next/navigation";
import { BottomNavigation } from "@/components/shell/BottomNavigation";
import { DemoBadge } from "@/components/shell/DemoBadge";
import { getContext } from "@/server/session";

/** Authenticated shell: the four-destination navigation lives here. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  if (!ctx) redirect("/onboarding");
  return (
    <>
      {ctx.session.mode === "demo" && <DemoBadge />}
      <main id="main">{children}</main>
      <BottomNavigation />
    </>
  );
}
