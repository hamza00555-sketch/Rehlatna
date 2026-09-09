import type { CareWindowVM } from "@/server/view-models/care";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { m } from "@/i18n";
import styles from "./CareWindow.module.css";

/** The explanatory part of a care window: status, what it usually means, what it may include. */
export function CareWindowBody({ vm }: { vm: CareWindowVM }) {
  return (
    <div className={styles.body}>
      <div className={styles.badges}>
        <StatusBadge tone={vm.badge.tone}>{vm.badge.label}</StatusBadge>
        <span className={styles.weeks}>{m.careWindows.weeks(vm.startWeek, vm.endWeek)}</span>
      </div>
      <p className={styles.lead}>{vm.status === "needs_attention" ? m.careWindows.notRecorded : vm.body}</p>
      {vm.logged && <p className={styles.logged}>{m.careWindows.loggedAs[vm.logged.state]}</p>}
      {vm.matchedAppointmentId && (vm.status === "active" || vm.status === "needs_attention") && <p className={styles.note}>{m.careWindows.candidateAppointment}</p>}
      {vm.includes.length > 0 && (
        <>
          <p className={styles.includesIntro}>{vm.includesIntro}</p>
          <ul className={styles.list}>
            {vm.includes.map((line) => (
              <li key={line} className={styles.item}>
                <span className={styles.dot} aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </>
      )}
      {vm.optional && <p className={styles.note}>{m.careWindows.optionalNote}</p>}
      <p className={styles.disclaimer}>{m.careWindows.disclaimer}</p>
    </div>
  );
}
