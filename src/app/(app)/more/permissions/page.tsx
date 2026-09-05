import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { TopBar } from "@/components/ui/TopBar";
import { PersonCard } from "@/components/ui/PersonCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { AddMemberForm } from "@/components/more/MemberEditor";
import { initialsOf } from "@/server/view-models/today";
import { m } from "@/i18n";
import styles from "../more.module.css";

export const metadata = { title: "الأدوار والصلاحيات" };

export default async function PermissionsPage() {
  const ctx = await getContext();
  if (!ctx) redirect("/onboarding");
  const canManage = can(ctx.viewer, "household:manage");
  return (
    <div className="page">
      <TopBar title={m.more.permissions} subtitle={m.more.accountsRolesHelp} backHref="/more" />
      <div className={styles.body}>
        <PrivacyNotice variant="general">{m.family.permissionsHelp}</PrivacyNotice>
        <section className={styles.people}>
          {ctx.data.members.map((mm) => (
            <PersonCard key={mm.id} name={mm.displayName} relation={mm.roles.map((r) => m.family.roles[r]).join(" · ")} meta={m.family.permissionCount(mm.permissions.length)} href={`/more/family/${mm.id}`} initials={initialsOf(mm.displayName)} />
          ))}
        </section>
        {canManage && (
          <section className={styles.section}>
            <SectionTitle>{m.family.addMember}</SectionTitle>
            <AddMemberForm />
          </section>
        )}
      </div>
    </div>
  );
}
