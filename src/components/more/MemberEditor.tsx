"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HouseholdRole, Permission } from "@/domain/types";
import { ALL_PERMISSIONS, permissionsForRoles } from "@/domain/permissions";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { Toggle } from "@/components/ui/Toggle";
import { Field, TextInput } from "@/components/ui/Field";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { api, ApiError } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./Editors.module.css";

const ROLES: HouseholdRole[] = ["mother", "partner", "financial_planner", "family_supporter"];

interface Props {
  memberId: string;
  roles: HouseholdRole[];
  permissions: Permission[];
  isSelf: boolean;
  canManage: boolean;
}

/** Roles drive defaults; permissions stay editable per member. Changes apply on the member's next request. */
export function MemberEditor({ memberId, roles: initialRoles, permissions: initialPermissions, isSelf, canManage }: Props) {
  const router = useRouter();
  const [roles, setRoles] = useState<HouseholdRole[]>(initialRoles);
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!canManage) return <PrivacyNotice variant="general">{m.family.manageOnly}</PrivacyNotice>;

  const toggleRole = (role: HouseholdRole) => {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    if (next.length === 0) return;
    setRoles(next);
    setPermissions(permissionsForRoles(next));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/api/household/members/${memberId}`, { roles, permissions }, "PATCH");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.code === "cannot_remove_own_manage" ? m.family.cannotRemoveSelfManage : m.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.stack}>
      <ChoiceGroup legend={m.family.rolesTitle} columns={2}>
        {ROLES.map((role) => (
          <ChoiceCard key={role} type="checkbox" name={`roles-${memberId}`} value={role} checked={roles.includes(role)} onChange={() => toggleRole(role)} title={m.family.roles[role]!} />
        ))}
      </ChoiceGroup>
      <fieldset className={styles.stack}>
        <legend className="sr-only">{m.family.permissionsTitle}</legend>
        <PrivacyNotice variant="general">{m.family.permissionsHelp}</PrivacyNotice>
        {ALL_PERMISSIONS.map((p) => (
          <Toggle
            key={p}
            id={`perm-${memberId}-${p}`}
            label={m.family.permissions[p]!}
            checked={permissions.includes(p)}
            disabled={isSelf && p === "household:manage"}
            onChange={(on) => setPermissions(on ? [...permissions, p] : permissions.filter((x) => x !== p))}
          />
        ))}
      </fieldset>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      <Button fullWidth onClick={save} loading={busy}>
        {m.common.save}
      </Button>
      {saved && (
        <p className={styles.saved} role="status">
          {m.forms.saved}
        </p>
      )}
    </div>
  );
}

export function AddMemberForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<HouseholdRole>("family_supporter");
  const [busy, setBusy] = useState(false);
  return (
    <div className={styles.stack}>
      <Field id="new-member-name" label={m.family.memberName}>
        <TextInput id="new-member-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </Field>
      <ChoiceGroup legend={m.family.memberRoles} columns={2}>
        {ROLES.map((r) => (
          <ChoiceCard key={r} name="new-member-role" value={r} checked={role === r} onChange={(v) => setRole(v as HouseholdRole)} title={m.family.roles[r]!} />
        ))}
      </ChoiceGroup>
      <Button
        fullWidth
        variant="outline"
        disabled={!name.trim()}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/household/members", { displayName: name.trim(), roles: [role] });
            setName("");
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        {m.family.addMember}
      </Button>
    </div>
  );
}
