"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import type { PregnancyHeroVM } from "@/server/view-models/today";
import type { BabyView } from "@/server/serializers";
import { Icon } from "@/components/icons/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { DateText } from "@/components/ui/Num";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtInt, greetingForHour } from "@/lib/format";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import { useWeeklyMedia } from "./useWeeklyMedia";
import styles from "./BabyHero.module.css";

interface Props {
  vm: PregnancyHeroVM;
  baby: BabyView | null;
  member: { displayName: string; initials: string };
  todayIso: string;
  audience?: "mother" | "family";
}

const EXPAND_MS = 420;
const EASE = "cubic-bezier(0.32, 0.72, 0.24, 1)";

/**
 * Baby Hero — the signature Today experience. Pressing it expands THIS
 * container to full screen with a clip-path reveal; the video element is
 * never re-mounted, so playback continues. Reduced motion swaps the reveal
 * for a 120ms opacity change and keeps the poster.
 */
export function BabyHero({ vm, baby, member, todayIso, audience = "mother" }: Props) {
  const { progress, media, totalWeeks } = vm;
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const sheetWrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCleanupRef = useRef<{ timeoutId: ReturnType<typeof setTimeout>; clear: () => void } | null>(null);
  const mediaCtl = useWeeklyMedia(media);
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const expand = useCallback(() => {
    const el = rootRef.current;
    if (!el || expanded) return;
    const rect = el.getBoundingClientRect();
    setExpanded(true);
    if (mediaCtl.reducedMotion) return;
    setAnimating(true);
    requestAnimationFrame(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const anim = el.animate(
        [
          { clipPath: `inset(${rect.top}px ${vw - rect.right}px ${vh - rect.bottom}px ${rect.left}px round 0 0 28px 28px)` },
          { clipPath: "inset(0px 0px 0px 0px round 0px)" },
        ],
        { duration: EXPAND_MS, easing: EASE },
      );
      anim.finished.finally(() => setAnimating(false));
    });
  }, [expanded, mediaCtl.reducedMotion]);

  const collapse = useCallback(() => {
    const el = rootRef.current;
    if (!el || !expanded) return;
    const finish = () => {
      setExpanded(false);
      setAnimating(false);
      setDetailsOpen(false);
    };
    if (mediaCtl.reducedMotion) return finish();
    // Target geometry: where the collapsed hero sits (top of the page, current scroll).
    const placeholder = document.getElementById("baby-hero-anchor");
    const target = placeholder?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setAnimating(true);
    const to = target
      ? `inset(${Math.max(target.top, -vh)}px ${vw - target.right}px ${Math.max(vh - target.bottom, -vh)}px ${target.left}px round 0 0 28px 28px)`
      : "inset(0px 0px 40% 0px round 0 0 28px 28px)";
    const anim = el.animate([{ clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: to }], { duration: EXPAND_MS, easing: EASE });
    anim.finished.then(finish).catch(finish);
  }, [expanded, mediaCtl.reducedMotion]);

  // Scroll lock + focus in/out. Deliberately NOT dependent on detailsOpen:
  // toggling the details sheet must not re-run this and steal focus back
  // to the close button. Focus-return runs in the cleanup, which fires
  // after React has already committed expanded=false — by then the
  // trigger button is back in the DOM and triggerRef is populated (unlike
  // calling it inline from collapse()'s finish(), which always ran before
  // that commit and so was always a no-op).
  useEffect(() => {
    if (!expanded) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus();
    };
  }, [expanded]);

  // Escape + Tab handling. Kept separate so re-running it on detailsOpen
  // changes (needed for Escape's branch) never touches focus or scroll.
  useEffect(() => {
    if (!expanded) return;
    const isVisible = (el: HTMLElement) => !el.closest('[aria-hidden="true"]') && getComputedStyle(el).visibility !== "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailsOpen) {
          setDetailsOpen(false);
          // Whatever was focused inside the sheet is about to go inert —
          // move focus to the (never-inert) toggle now, synchronously,
          // rather than leaving it orphaned on a soon-to-be-inert node.
          toggleRef.current?.focus();
        } else collapse();
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap: the hero is a custom (non-<dialog>) modal, so Tab must
      // not leak to the page underneath while it's expanded.
      const root = rootRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')).filter(
        (el) => !el.closest("[inert]") && el.offsetParent !== null && isVisible(el),
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, collapse, detailsOpen]);

  // Cancels a still-pending cleanup (transitionend listener + fallback
  // timer) from a previous drag release, so it can't fire mid-way through
  // a new drag and yank the transform/transition out from under it.
  const cancelDragCleanup = useCallback(() => {
    const pending = dragCleanupRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    sheetWrapRef.current?.removeEventListener("transitionend", pending.clear);
    dragCleanupRef.current = null;
  }, []);

  const onHandlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      cancelDragCleanup();
      dragStartY.current = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
      // Drag the wrap (arrow row + sheet) as one unit, tracking the finger
      // 1:1 — the open/close transition would otherwise lag every
      // intermediate frame behind the pointer.
      if (sheetWrapRef.current) sheetWrapRef.current.style.transition = "none";
    },
    [cancelDragCleanup],
  );
  const onHandlePointerMove = useCallback((e: ReactPointerEvent) => {
    if (dragStartY.current == null || !sheetWrapRef.current) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    sheetWrapRef.current.style.transform = `translateY(${delta}px)`;
  }, []);
  const onHandlePointerUp = useCallback((e: ReactPointerEvent) => {
    if (dragStartY.current == null || !sheetWrapRef.current) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    dragStartY.current = null;
    const wrap = sheetWrapRef.current;
    const closing = delta > 70;
    // Re-enable the transition and set the transform straight to the
    // final resting value (matching the closed/open CSS classes exactly)
    // — the browser then animates continuously from the dragged position
    // to that target, never snapping back through 0 first. The inline
    // override is cleared once that animation settles, handing control
    // back to the class-driven style with no visible change.
    wrap.style.transition = "";
    wrap.style.transform = closing ? "translateY(calc(100% - var(--toggle-row-h)))" : "translateY(0)";
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    // Whichever of transitionend/timeout fires first must cancel the
    // other — otherwise the loser fires later, mid a possible new drag,
    // and stomps its live transform out from under it.
    const clear = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      wrap.style.transition = "";
      wrap.style.transform = "";
      wrap.removeEventListener("transitionend", clear);
      dragCleanupRef.current = null;
    };
    wrap.addEventListener("transitionend", clear);
    timeoutId = setTimeout(clear, 500);
    dragCleanupRef.current = { timeoutId, clear };
    if (closing) {
      setDetailsOpen(false);
      // Same reasoning as the Escape branch: focus was possibly inside the
      // sheet (e.g. the drag started on the handle right after a Tab into
      // it); move it to the toggle before the sheet goes inert.
      toggleRef.current?.focus();
    }
  }, []);

  const share = useCallback(async () => {
    const text = `${m.today.weekLabel} ${fmtInt(progress.week)} — ${media.developmentSummary}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user dismissed */
    }
  }, [progress.week, media.developmentSummary]);

  const accent =
    baby?.gender === "boy" ? "var(--color-accent-blue)" : baby?.gender === "girl" ? "var(--color-accent-rose)" : "var(--color-accent-warm)";
  const style = {
    "--accent-context": accent,
    "--fx": `${media.focalPoint.x * 100}%`,
    "--fy": `${media.focalPoint.y * 100}%`,
  } as CSSProperties;

  const hasMedia = mediaCtl.hasPoster || mediaCtl.hasVideo;
  const babyLabel = m.baby.nameOf(baby?.displayName ?? null);
  const remaining = progress.remainingWeeks >= 2 ? m.today.remainingApprox(progress.remainingWeeks) : progress.remainingDays > 0 ? m.today.remainingDays(progress.remainingDays) : progress.overdue ? m.today.pastDue : m.today.dueSoon;

  return (
    <>
      {/* Anchor keeps the page layout stable while the hero is fixed/expanded. */}
      <div id="baby-hero-anchor" className={cx(styles.anchor, expanded && styles.anchorActive)} aria-hidden="true" />
      <section
        ref={rootRef}
        className={cx(styles.hero, expanded && styles.expanded, animating && styles.animating, !hasMedia && styles.noMedia, mediaCtl.state === "error" && !mediaCtl.hasPoster && styles.error)}
        style={style}
        role={expanded ? "dialog" : undefined}
        aria-modal={expanded || undefined}
        aria-label={expanded ? `${m.today.weekLabel} ${fmtInt(progress.week)}` : undefined}
      >
        <div ref={mediaCtl.containerRef} className={styles.mediaLayer}>
          {mediaCtl.hasPoster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.posterWebp} alt={media.alt} className={styles.poster} decoding="async" fetchPriority="high" />
          )}
          {mediaCtl.wantsVideo && (
            <video
              ref={mediaCtl.videoRef}
              className={cx(styles.video, mediaCtl.state === "playing" && styles.videoVisible)}
              muted
              playsInline
              loop
              preload="metadata"
              poster={media.posterWebp}
              aria-hidden="true"
              tabIndex={-1}
            >
              {media.videoWebm && <source src={media.videoWebm} type="video/webm" />}
              {media.videoMp4 && <source src={media.videoMp4} type="video/mp4" />}
            </video>
          )}
        </div>
        <div className={styles.scrim} />
        {!expanded && <div className={styles.topScrim} />}

        {!expanded && (
          <button ref={triggerRef} type="button" className={styles.trigger} onClick={expand} aria-label={m.a11y.babyHero(progress.week)} />
        )}

        {/* Collapsed content ------------------------------------------------ */}
        <div className={cx(styles.collapsed, expanded && styles.hiddenLayer)} aria-hidden={expanded || undefined}>
          <div className={styles.topRow}>
            <span className={styles.date}>
              <DateText iso={todayIso} style="monthDay" />
            </span>
            <Link href="/more/family" className={styles.avatar} aria-label={member.displayName}>
              <span>{member.initials}</span>
            </Link>
          </div>
          <div className={styles.greeting}>
            <h1 className={styles.greetingTitle} suppressHydrationWarning>
              {greetingForHour(hour ?? 9)}
            </h1>
            <p className={styles.greetingLead}>{m.today.journeyContinues}</p>
            <p className={styles.greetingSub}>{audience === "mother" ? m.today.lifeGrows : m.today.lifeGrowsFamily}</p>
          </div>

          <div className={styles.weekBlock}>
            <span className={cx(styles.heroNumber, "num")}>{fmtInt(progress.week)}</span>
            <span className={styles.weekLabel}>{m.today.weekLabel}</span>
            <span className={styles.ofWeeks}>{m.today.ofWeeks(totalWeeks)}</span>
            <div className={styles.progress} role="progressbar" aria-label={m.a11y.progress(Math.round(progress.ratio * 100))} aria-valuenow={Math.round(progress.ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.progressFill} style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
            </div>
            <span className={styles.trimester}>{(audience === "mother" ? m.today.trimester : m.today.trimesterFamily)[progress.trimester]}</span>
            <span className={styles.dayLine}>
              {m.today.dayOfWeek(progress.dayOfWeek)} · {remaining}
            </span>
          </div>

          <div className={styles.bottomRow}>
            <div className={styles.sizeBlock}>
              {media.approximateSizeComparison && <span className={styles.sizeTitle}>{m.today.sizeLike(media.approximateSizeComparison)}</span>}
              {media.approximateSize && <span className={styles.sizeSub}>{m.today.approxLength(media.approximateSize)}</span>}
            </div>
            <div className={styles.watch}>
              <span className={styles.playRing} aria-hidden="true">
                <Icon name="play" size={20} />
              </span>
              <span className={styles.watchLabel}>{m.today.watchDevelopment}</span>
            </div>
          </div>

          {!hasMedia && <p className={styles.mediaNote}>{m.today.mediaPlaceholder}</p>}
          {hasMedia && !media.medicallyReviewed && (
            <div className={styles.devBadge}>
              <StatusBadge tone="unverified">{m.today.devReviewBadge}</StatusBadge>
            </div>
          )}
        </div>

        {/* Expanded content — minimal by default so the baby stays fully
            visible; week details live in a sheet the arrow toggles. ------ */}
        {expanded && (
          <div className={styles.expandedLayer}>
            <div className={styles.minimalChrome}>
              <IconButton icon="close" label={m.common.close} variant="overMedia" onClick={collapse} ref={closeRef} />
            </div>

            <div className={styles.centerControls}>
              {mediaCtl.hasVideo && mediaCtl.wantsVideo && mediaCtl.state !== "error" && (
                <button type="button" className={styles.playBig} onClick={mediaCtl.toggle} aria-label={mediaCtl.state === "playing" ? m.common.pause : m.common.play} aria-pressed={mediaCtl.state === "playing"}>
                  <Icon name={mediaCtl.state === "playing" ? "pause" : "play"} size={24} />
                </button>
              )}
              {mediaCtl.state === "error" && (
                <IconButton icon="retry" label={m.common.retry} variant="overMedia" onClick={mediaCtl.retry} />
              )}
              {!hasMedia && <p className={styles.mediaNoteCenter}>{m.today.mediaPlaceholder}</p>}
            </div>

            {/* The toggle sits in its own row above the sheet panel, never
                inside it, so it can never overlap the sheet's own content
                (CTA/boundary) once open — only the row's fixed height peeks
                above the panel while closed. */}
            <div ref={sheetWrapRef} className={cx(styles.sheetWrap, detailsOpen && styles.sheetWrapOpen)}>
              <div className={styles.detailsToggleRow}>
                <button
                  ref={toggleRef}
                  type="button"
                  className={styles.detailsToggle}
                  onClick={() => setDetailsOpen((v) => !v)}
                  aria-label={detailsOpen ? m.today.weekDetailsHide : m.today.weekDetailsToggle}
                  aria-expanded={detailsOpen}
                  aria-controls="baby-hero-details"
                >
                  <Icon name="chevronDown" size={20} className={cx(styles.detailsToggleIcon, !detailsOpen && styles.detailsToggleIconClosed)} />
                </button>
              </div>

              <div id="baby-hero-details" className={styles.sheet} inert={!detailsOpen} aria-hidden={!detailsOpen}>
                <div
                  className={styles.handle}
                  aria-hidden="true"
                  onPointerDown={onHandlePointerDown}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={onHandlePointerUp}
                  onPointerCancel={onHandlePointerUp}
                />
                <div className={styles.detailsHead}>
                  <IconButton icon="share" label={m.common.share} variant="overMedia" onClick={share} />
                  <div className={styles.chromeTitle}>
                    <h2 className={styles.chromeWeek}>
                      {m.today.weekLabel} <span className="num">{fmtInt(progress.week)}</span>
                    </h2>
                    <p className={styles.chromeSub}>
                      {babyLabel} · {m.today.dayOfWeek(progress.dayOfWeek)}
                    </p>
                    <div className={styles.stats}>
                      {media.approximateSize && (
                        <span className={styles.stat} title={media.lengthMeasure ? m.today.lengthMeasure[media.lengthMeasure] : undefined}>
                          <Icon name="ruler" size={16} />
                          <span className="num">{media.approximateSize}</span>
                        </span>
                      )}
                      {media.approximateWeight && (
                        <span className={styles.stat}>
                          <Icon name="scale" size={16} />
                          <span className="num">{media.approximateWeight}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <h3 className={styles.sheetTitle}>{m.today.weeklyDevelopment}</h3>
                <p className={styles.sheetSummary}>{media.developmentSummary}</p>
                <ul className={styles.points}>
                  {media.developmentPoints.map((p, i) => (
                    <li key={i} className={styles.point}>
                      <span className={styles.pointIcon} aria-hidden="true">
                        <Icon name={i === 0 ? "sprout" : i === 1 ? "heart" : "wave"} size={20} />
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Button href="/today/week" variant="lightOverMedia" fullWidth>
                  {m.today.weeklyDevelopment}
                </Button>
                <p className={styles.boundary}>{m.common.medicalBoundary}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
