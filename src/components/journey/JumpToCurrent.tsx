"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useReducedMotion } from "@/lib/useMediaPreferences";
import { m } from "@/i18n";
import styles from "./JumpToCurrent.module.css";

/**
 * A short, always-available way back to "where we are" on the journey.
 * Watches the single `[aria-current="step"]` item the timeline already
 * marks and shows a small pill only while it is scrolled out of view —
 * on a short list (most of pregnancy, early postpartum) nothing renders.
 */
export function JumpToCurrent() {
  const [hidden, setHidden] = useState(true);
  const reducedMotion = useReducedMotion();
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>('[aria-current="step"]');
    if (!target) return;
    targetRef.current = target;
    // Keep the pill clear of the fixed bottom nav when judging visibility.
    const navHeight = getComputedStyle(document.documentElement).getPropertyValue("--layout-bottom-nav-height") || "64px";
    const observer = new IntersectionObserver(([entry]) => setHidden(Boolean(entry?.isIntersecting)), {
      rootMargin: `0px 0px -${navHeight.trim()} 0px`,
      threshold: 0.4,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const jump = () => {
    targetRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  };

  return (
    <button
      type="button"
      className={styles.pill}
      onClick={jump}
      data-hidden={hidden || undefined}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : 0}
      aria-label={m.journey.jumpToCurrent}
    >
      <Icon name="pin" size={20} />
      {m.journey.currentStage}
    </button>
  );
}
