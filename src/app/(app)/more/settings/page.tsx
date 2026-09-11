import { redirect } from "next/navigation";
import { getContext, readAppearanceCookie, resolveAppearance } from "@/server/session";
import { getAuthUser, supabaseConfigured } from "@/server/supabase";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/Card";
import { SettingsPanel } from "@/components/more/SettingsPanel";
import { m } from "@/i18n";
import styles from "../more.module.css";

export const metadata = { title: "الإعدادات والخصوصية" };

export default async function SettingsPage() {
  const ctx = await getContext();
  if (!ctx) redirect("/onboarding");
  const { data, viewer } = ctx;
  const planner = data.members.find((mm) => mm.roles.includes("financial_planner"));
  // Same effective theme/reduceMotion RootLayout renders with — otherwise
  // the radios can show a stale value the cookie already overrides.
  const appearance = resolveAppearance(data.household.settings, await readAppearanceCookie());
  const settings = { ...data.household.settings, ...appearance };
  return (
    <div className="page">
      <TopBar title={`${m.more.settings} · ${m.more.privacy}`} subtitle={m.more.settingsSubtitle} backHref="/more" />
      <div className={styles.body}>
        <Card tone="warm" padding="panel" className={styles.privacyCard}>
          <span className={styles.privacyTitle}>{m.more.privacyStatement}</span>
          <span className={styles.coverageMeta}>{m.more.privacyStatementBody}</span>
        </Card>
        <SettingsPanel
          authEmail={(await getAuthUser())?.email ?? null}
          settings={settings}
          notifications={data.notificationPreferences.find((n) => n.memberId === viewer.memberId) ?? null}
          canManage={can(viewer, "household:manage")}
          canFinance={can(viewer, "finance:edit")}
          financeOwnerName={data.household.settings.financeShared ? null : planner?.displayName ?? null}
          members={data.members.map((mm) => ({ id: mm.id, displayName: mm.displayName, isViewer: mm.id === viewer.memberId }))}
          isDemo={ctx.session.mode === "demo"}
          showDeveloperTools={ctx.session.mode === "demo" || !supabaseConfigured()}
        />
      </div>
    </div>
  );
}
