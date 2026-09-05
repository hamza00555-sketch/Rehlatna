import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { cx } from "@/lib/cx";
import styles from "./MediaFrame.module.css";

interface Props {
  src?: string;
  alt: string;
  focalPoint?: { x: number; y: number };
  ratio?: "portrait" | "hero" | "card" | "square";
  radius?: "card" | "hero" | "none";
  /** Shown when no src exists: a restrained neutral tone, never a fake illustration. */
  placeholderLabel?: string;
  overlay?: ReactNode;
  className?: string;
}

/** Image container honouring focal point and crop; neutral placeholder when the asset is missing. */
export function MediaFrame({ src, alt, focalPoint = { x: 0.5, y: 0.5 }, ratio = "card", radius = "card", placeholderLabel, overlay, className }: Props) {
  const style = { "--fx": `${focalPoint.x * 100}%`, "--fy": `${focalPoint.y * 100}%` } as CSSProperties;
  return (
    <figure className={cx(styles.frame, styles[`ratio_${ratio}`], styles[`radius_${radius}`], className)} style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={styles.img} loading="lazy" decoding="async" />
      ) : (
        <div className={styles.placeholder} role="img" aria-label={alt}>
          <Icon name="image" size={24} />
          {placeholderLabel && <span className={styles.placeholderLabel}>{placeholderLabel}</span>}
        </div>
      )}
      {overlay && <div className={styles.overlay}>{overlay}</div>}
    </figure>
  );
}
