"use client";

import { useEffect, useState } from "react";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** OS-level reduced motion, or the household preference stamped on <html>. */
export function useReducedMotion(): boolean {
  const os = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [pref, setPref] = useState(false);
  useEffect(() => {
    setPref(document.documentElement.dataset.motion === "reduced");
  }, []);
  return os || pref;
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/** Reduced Data / slow connections → poster only, no prefetch. */
export function useConnectionQuality(): { saveData: boolean; goodConnection: boolean } {
  const [state, setState] = useState({ saveData: false, goodConnection: true });
  useEffect(() => {
    const c = (navigator as unknown as { connection?: NetworkInformationLike }).connection;
    if (!c) return;
    const update = () =>
      setState({
        saveData: Boolean(c.saveData),
        goodConnection: !c.saveData && (c.effectiveType === undefined || c.effectiveType === "4g"),
      });
    update();
    const target = c as unknown as EventTarget;
    target.addEventListener?.("change", update);
    return () => target.removeEventListener?.("change", update);
  }, []);
  return state;
}
