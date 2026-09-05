import type { SVGProps } from "react";

/**
 * Product icon set — drawn for this product on a 24px grid: ≈1.6px stroke,
 * round caps/joins, softened-square geometry, selective active fill.
 * No third-party icon library ships. Directional icons are semantic
 * (`back`/`forward`) and resolved for RTL here, never blindly mirrored.
 */

export type IconName =
  | "today"
  | "journey"
  | "preparation"
  | "more"
  | "calendar"
  | "clock"
  | "stethoscope"
  | "hospital"
  | "shield"
  | "plus"
  | "close"
  | "share"
  | "back"
  | "forward"
  | "chevronDown"
  | "play"
  | "pause"
  | "retry"
  | "check"
  | "car"
  | "bell"
  | "sliders"
  | "lock"
  | "eye"
  | "camera"
  | "heart"
  | "pin"
  | "phone"
  | "edit"
  | "trash"
  | "info"
  | "alert"
  | "sun"
  | "moon"
  | "user"
  | "users"
  | "wallet"
  | "sprout"
  | "external"
  | "bottle"
  | "bed"
  | "shirt"
  | "bag"
  | "offline"
  | "video"
  | "image"
  | "expand"
  | "minus"
  | "ruler"
  | "scale"
  | "wave";

type Path = { d: string; fill?: boolean } | { circle: [number, number, number]; fill?: boolean };

const ICONS: Record<IconName, { outline: Path[]; filled?: Path[] }> = {
  today: {
    outline: [
      { d: "M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" },
      { d: "M9.5 20.5v-6h5v6" },
    ],
    filled: [
      { d: "M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z", fill: true },
      { d: "M9.5 20.5v-6h5v6" },
    ],
  },
  journey: {
    outline: [
      { circle: [6, 17.5, 1.8] },
      { circle: [12, 11.5, 1.8] },
      { circle: [18, 5.5, 1.8] },
      { d: "M7.4 16.1l3.2-3.2M13.4 10.1l3.2-3.2" },
    ],
    filled: [
      { circle: [6, 17.5, 1.8], fill: true },
      { circle: [12, 11.5, 1.8], fill: true },
      { circle: [18, 5.5, 1.8], fill: true },
      { d: "M7.4 16.1l3.2-3.2M13.4 10.1l3.2-3.2" },
    ],
  },
  preparation: {
    outline: [
      { d: "M6.9 8.5h10.2a1 1 0 0 1 1 .9l.9 10a1.5 1.5 0 0 1-1.5 1.6H6.5A1.5 1.5 0 0 1 5 19.4l.9-10a1 1 0 0 1 1-.9z" },
      { d: "M9 8.5V7a3 3 0 0 1 6 0v1.5" },
    ],
    filled: [
      { d: "M6.9 8.5h10.2a1 1 0 0 1 1 .9l.9 10a1.5 1.5 0 0 1-1.5 1.6H6.5A1.5 1.5 0 0 1 5 19.4l.9-10a1 1 0 0 1 1-.9z", fill: true },
      { d: "M9 8.5V7a3 3 0 0 1 6 0v1.5" },
    ],
  },
  more: {
    outline: [{ circle: [6, 12, 1.7] }, { circle: [12, 12, 1.7] }, { circle: [18, 12, 1.7] }],
    filled: [
      { circle: [6, 12, 1.7], fill: true },
      { circle: [12, 12, 1.7], fill: true },
      { circle: [18, 12, 1.7], fill: true },
    ],
  },
  calendar: {
    outline: [
      { d: "M4.5 6.5h15A1.5 1.5 0 0 1 21 8v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V8a1.5 1.5 0 0 1 1.5-1.5z" },
      { d: "M3 10.5h18M8 4v4M16 4v4" },
    ],
  },
  clock: { outline: [{ circle: [12, 12, 8.5] }, { d: "M12 7.5V12l3 2" }] },
  stethoscope: {
    outline: [
      { d: "M7 4v5.5a4.5 4.5 0 0 0 9 0V4" },
      { d: "M11.5 14v2.5a4 4 0 0 0 8 0V15" },
      { circle: [19.5, 13, 1.6] },
    ],
  },
  hospital: {
    outline: [
      { d: "M5 20.5V6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v14M3.5 20.5h17" },
      { d: "M12 9v5M9.5 11.5h5" },
    ],
  },
  shield: { outline: [{ d: "M12 3.5l7 2.8v5.2c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6.3z" }] },
  plus: { outline: [{ d: "M12 5v14M5 12h14" }] },
  minus: { outline: [{ d: "M5 12h14" }] },
  close: { outline: [{ d: "M6.5 6.5l11 11M17.5 6.5l-11 11" }] },
  share: {
    outline: [
      { d: "M12 14V4M8.5 7.5 12 4l3.5 3.5" },
      { d: "M6 11.5v7A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5v-7" },
    ],
  },
  // RTL: "back" points to the inline start (right), "forward" to the inline end (left).
  back: { outline: [{ d: "M9.5 6l6 6-6 6" }] },
  forward: { outline: [{ d: "M14.5 6l-6 6 6 6" }] },
  chevronDown: { outline: [{ d: "M6 9.5l6 6 6-6" }] },
  play: {
    outline: [{ d: "M8.5 6.2v11.6c0 .8.9 1.3 1.6.9l9-5.8c.6-.4.6-1.3 0-1.7l-9-5.8c-.7-.5-1.6 0-1.6.8z", fill: true }],
  },
  pause: { outline: [{ d: "M7 6.5h2.6v11H7zM14.4 6.5H17v11h-2.6z", fill: true }] },
  retry: { outline: [{ d: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3" }, { d: "M19.5 4.5v4h-4" }] },
  check: { outline: [{ d: "M5.5 12.5l4 4 9-9" }] },
  car: {
    outline: [
      { d: "M5 16.5h14M6 16.5V13l1.8-4.2A1.5 1.5 0 0 1 9.2 8h5.6a1.5 1.5 0 0 1 1.4.8L18 13v3.5" },
      { circle: [8, 18.5, 1.5] },
      { circle: [16, 18.5, 1.5] },
    ],
  },
  bell: {
    outline: [{ d: "M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z" }, { d: "M10 20.5a2 2 0 0 0 4 0" }],
  },
  sliders: {
    outline: [{ d: "M5 8h14M5 16h14" }, { circle: [9, 8, 2] }, { circle: [15, 16, 2] }],
  },
  lock: {
    outline: [
      { d: "M6 11h12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 6 11z" },
      { d: "M8.5 11V8a3.5 3.5 0 0 1 7 0v3" },
    ],
  },
  eye: { outline: [{ d: "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" }, { circle: [12, 12, 2.5] }] },
  camera: {
    outline: [
      { d: "M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" },
      { circle: [12, 12.5, 3] },
    ],
  },
  heart: { outline: [{ d: "M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.6 12 20 12 20z" }] },
  pin: { outline: [{ d: "M12 21s6-5.3 6-10.5a6 6 0 0 0-12 0C6 15.7 12 21 12 21z" }, { circle: [12, 10.5, 2] }] },
  phone: {
    outline: [{ d: "M6.5 4h3l1.5 4-2 1.5a9 9 0 0 0 5.5 5.5L16 13l4 1.5v3A1.5 1.5 0 0 1 18.5 19 14.5 14.5 0 0 1 5 5.5 1.5 1.5 0 0 1 6.5 4z" }],
  },
  edit: { outline: [{ d: "M4.5 19.5l4-.8L19 8.3a1.5 1.5 0 0 0 0-2.1l-1.2-1.2a1.5 1.5 0 0 0-2.1 0L5.3 15.5z" }] },
  trash: {
    outline: [{ d: "M5 7h14M9.5 7V5h5v2M7 7l.8 12a1.5 1.5 0 0 0 1.5 1.5h5.4a1.5 1.5 0 0 0 1.5-1.5L17 7" }],
  },
  info: { outline: [{ circle: [12, 12, 8.5] }, { d: "M12 11v5M12 8h.01" }] },
  alert: { outline: [{ circle: [12, 12, 8.5] }, { d: "M12 8v5M12 16h.01" }] },
  sun: {
    outline: [
      { circle: [12, 12, 4] },
      { d: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" },
    ],
  },
  moon: { outline: [{ d: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" }] },
  user: { outline: [{ circle: [12, 8.5, 3.5] }, { d: "M5 20a7 7 0 0 1 14 0" }] },
  users: {
    outline: [
      { circle: [9, 8.5, 3.2] },
      { d: "M3 20a6 6 0 0 1 12 0" },
      { d: "M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17 14.2a6 6 0 0 1 4 5.8" },
    ],
  },
  wallet: {
    outline: [
      { d: "M3.5 8A1.5 1.5 0 0 1 5 6.5h13A1.5 1.5 0 0 1 19.5 8v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" },
      { d: "M19.5 11H15a2 2 0 0 0 0 4h4.5" },
    ],
  },
  sprout: {
    outline: [
      { d: "M12 21v-8" },
      { d: "M12 13c0-4 3-7 7-7 0 4-3 7-7 7z" },
      { d: "M12 13c0-3-2.5-5.5-5.5-5.5 0 3 2.5 5.5 5.5 5.5z" },
    ],
  },
  external: { outline: [{ d: "M7 17 17 7M8 7h9v9" }] },
  bottle: {
    outline: [
      { d: "M9.5 3.5h5v3h-5z" },
      { d: "M8 6.5h8l1 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9z" },
    ],
  },
  bed: {
    outline: [
      { d: "M3.5 18.5v-8A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v8M3.5 15h17" },
      { d: "M6.5 9V6.5A1.5 1.5 0 0 1 8 5h8a1.5 1.5 0 0 1 1.5 1.5V9" },
    ],
  },
  shirt: { outline: [{ d: "M8 4.5 5 7l2 3 1.5-.8V19.5h7V9.2L17 10l2-3-3-2.5a2.5 2.5 0 0 1-5 0z" }] },
  bag: {
    outline: [
      { d: "M4 9.5A1.5 1.5 0 0 1 5.5 8h13A1.5 1.5 0 0 1 20 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" },
      { d: "M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8M4 13h16" },
    ],
  },
  offline: {
    outline: [
      { d: "M2.5 8.5a15 15 0 0 1 8-3.8M13.5 4.7a15 15 0 0 1 8 3.8M5.5 12a10 10 0 0 1 5-2.7M13.5 9.3a10 10 0 0 1 5 2.7M8.5 15.5a5 5 0 0 1 7 0M12 19h.01" },
      { d: "M4 4l16 16" },
    ],
  },
  video: {
    outline: [
      { d: "M4 7.5A1.5 1.5 0 0 1 5.5 6h9A1.5 1.5 0 0 1 16 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 16.5z" },
      { d: "M16 10l4-2v8l-4-2" },
    ],
  },
  image: {
    outline: [
      { d: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" },
      { circle: [9, 10, 1.8] },
      { d: "M20 15l-4.5-4.5L8 18" },
    ],
  },
  expand: {
    outline: [
      { d: "M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" },
    ],
  },
  ruler: {
    outline: [
      { d: "M4.5 16.5 16.5 4.5a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1L7.5 19.5a1.5 1.5 0 0 1-2.1 0l-.9-.9a1.5 1.5 0 0 1 0-2.1z" },
      { d: "M8 13l1.5 1.5M11 10l1.5 1.5M14 7l1.5 1.5" },
    ],
  },
  scale: {
    outline: [
      { d: "M12 4v3" },
      { d: "M6.5 7h11a1 1 0 0 1 1 .9l1 11a1.5 1.5 0 0 1-1.5 1.6h-12A1.5 1.5 0 0 1 4.5 18.9l1-11a1 1 0 0 1 1-.9z" },
      { d: "M9 12a3 3 0 0 0 6 0" },
    ],
  },
  wave: {
    outline: [{ d: "M3 12c2 0 2-3 4.5-3s2.5 3 4.5 3 2.5-3 4.5-3S19 12 21 12" }, { d: "M3 17c2 0 2-3 4.5-3s2.5 3 4.5 3 2.5-3 4.5-3S19 17 21 17" }],
  },
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** 20 = optical size inside a 44px target; 24 = navigation and larger contexts. */
  size?: 20 | 24 | 16 | 32;
  /** Selective active fill for navigation and toggles. */
  filled?: boolean;
  /** Provide when the icon is not decorative. */
  label?: string;
}

export function Icon({ name, size = 20, filled = false, label, ...rest }: IconProps) {
  const def = ICONS[name];
  const paths = filled && def.filled ? def.filled : def.outline;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      {paths.map((p, i) =>
        "circle" in p ? (
          <circle key={i} cx={p.circle[0]} cy={p.circle[1]} r={p.circle[2]} fill={p.fill ? "currentColor" : "none"} />
        ) : (
          <path key={i} d={p.d} fill={p.fill ? "currentColor" : "none"} stroke={p.fill ? "none" : undefined} />
        ),
      )}
    </svg>
  );
}
