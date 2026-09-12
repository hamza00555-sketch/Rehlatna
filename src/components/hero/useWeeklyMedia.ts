"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeeklyBabyMedia } from "@/domain/types";
import { useConnectionQuality, useReducedMotion } from "@/lib/useMediaPreferences";

export type MediaState = "placeholder" | "poster" | "loading" | "playing" | "paused" | "error";

/**
 * Weekly media lifecycle for the Baby Hero.
 * - Poster first; video swaps in only once playback can start.
 * - No autoplay under reduced motion or Reduced Data; poster stays.
 * - Pauses when the hero leaves the viewport or the tab hides; resumes
 *   without resetting the timestamp.
 * - Failed video keeps the poster and offers a quiet retry.
 */
export function useWeeklyMedia(media: WeeklyBabyMedia) {
  const reducedMotion = useReducedMotion();
  const { saveData } = useConnectionQuality();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userPausedRef = useRef(false);
  const inViewRef = useRef(true);

  const hasVideo = Boolean(media.videoMp4 || media.videoWebm);
  const hasPoster = Boolean(media.posterWebp);
  const wantsVideo = hasVideo && !reducedMotion && !saveData;

  const [state, setState] = useState<MediaState>(hasPoster ? "poster" : "placeholder");

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || userPausedRef.current || !inViewRef.current || document.hidden) return;
    v.play()
      .then(() => setState("playing"))
      .catch(() => setState("paused"));
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !wantsVideo) {
      setState(hasPoster ? "poster" : "placeholder");
      return;
    }
    setState("loading");
    const onCanPlay = () => tryPlay();
    const onError = () => setState("error");
    const onPause = () => setState((s) => (s === "playing" ? "paused" : s));
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    v.addEventListener("pause", onPause);
    const lastSource = v.querySelector("source:last-of-type");
    lastSource?.addEventListener("error", onError);
    v.load();
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
      v.removeEventListener("pause", onPause);
      lastSource?.removeEventListener("error", onError);
    };
  }, [wantsVideo, hasPoster, media.week, tryPlay]);

  useEffect(() => {
    if (!wantsVideo) return;
    const el = containerRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = Boolean(entry?.isIntersecting);
        if (!inViewRef.current) v.pause();
        else tryPlay();
      },
      { threshold: 0 },
    );
    io.observe(el);
    const onVisibility = () => {
      if (document.hidden) v.pause();
      else tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [wantsVideo, tryPlay]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      tryPlay();
    } else {
      userPausedRef.current = true;
      v.pause();
      setState("paused");
    }
  }, [tryPlay]);

  const retry = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setState("loading");
    v.load();
  }, []);

  return { videoRef, containerRef, state, hasVideo, hasPoster, wantsVideo, reducedMotion, toggle, retry };
}
