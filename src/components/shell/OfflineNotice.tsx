"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { m } from "@/i18n";
import styles from "./OfflineNotice.module.css";

/** Offline: keep the last rendered data on screen and say so plainly. */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className={styles.notice} role="status" aria-live="polite">
      <Icon name="offline" size={20} />
      <span>
        <strong>{m.more.offlineTitle}</strong> · {m.more.offlineBody}
      </span>
    </div>
  );
}
