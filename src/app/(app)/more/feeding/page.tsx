import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { FeedingEditor } from "@/components/postpartum/FeedingEditor";
import { m } from "@/i18n";
import styles from "../more.module.css";

export const metadata = { title: "خيارات التغذية" };

/** Feeding is a family choice recorded before or after birth; nothing is pre-selected. */
export default async function FeedingPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  return (
    <div className="page">
      <TopBar title={m.postpartum.feedingPreferences} subtitle={m.feeding.note} backHref={ctx.data.baby?.birthDate ? "/journey/postpartum" : "/more"} />
      <div className={styles.body}>
        <FeedingEditor preference={ctx.data.feedingPreference} canEdit={can(ctx.viewer, "care:edit")} />
        <PrivacyNotice variant="general">{m.feeding.disclaimer}</PrivacyNotice>
      </div>
    </div>
  );
}
