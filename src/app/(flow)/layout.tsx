import { redirect } from "next/navigation";
import { DemoBadge } from "@/components/shell/DemoBadge";
import { getContext } from "@/server/session";

/** Focused moments (gender, name, birth) — no bottom navigation. */
export default async function FlowLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  if (!ctx) redirect("/onboarding");
  return (
    <>
      {ctx.session.mode === "demo" && <DemoBadge />}
      <main id="main">{children}</main>
    </>
  );
}
