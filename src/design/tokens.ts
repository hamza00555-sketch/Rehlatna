/**
 * Design tokens — SINGLE SOURCE OF TRUTH.
 *
 * Every value is canonical, copied verbatim from docs/design-system.md.
 * Never invent a colour, size, spacing step, radius or shadow that is not
 * defined there. `scripts/generate-tokens.mjs` emits src/app/tokens.css from
 * this file; components reference `var(--…)` only — raw values live here and
 * nowhere else.
 */

export const color = {
  // light
  canvas: "#FCF2EA",
  surface: "#FFF8F2",
  surfaceRaised: "#FFFCF8",
  surfaceTint: "#F4E8DE",
  surfaceWarm: "#F2E1D6",
  ink: "#352B2B",
  muted: "#675B58",
  faint: "#9A8D89",
  line: "#E1D7D0",
  lineStrong: "#C7B8B2",
  primary: "#17243B",
  onPrimary: "#FFF8F2",
  accentWarm: "#D87D78",
  accentWarmSoft: "#F3D4CB",
  accentRose: "#C86482",
  accentRoseSoft: "#F1DDE5",
  accentBlue: "#597DB7",
  accentBlueSoft: "#DEE7F5",
  accentSage: "#6F9A84",
  accentSageSoft: "#E1ECE5",
  accentTeal: "#2F7F77",
  success: "#2F6F51",
  warning: "#805124",
  danger: "#AE5353",
  focus: "#597DB7",
  // dark
  darkCanvas: "#080B14",
  darkSurface: "#12131C",
  darkRaised: "#1B1D26",
  darkTint: "#2E2933",
  darkInk: "#F8F0ED",
  darkMuted: "#B5A8AB",
  darkLine: "#343542",
  darkScrim: "rgba(8,11,20,0.72)",
} as const;

/**
 * Component-state values that appear in the approved component CSS but are
 * not top-level colour tokens (scrims, tints, soft borders). Kept here so no
 * component ever carries a raw value.
 */
export const composite = {
  // Bottom navigation
  navLightBg: "rgba(255,248,242,0.94)",
  navDarkBg: "rgba(8,11,20,0.90)",
  navPressedBg: "rgba(216,125,120,0.10)",
  navBlur: "blur(18px)",
  // Buttons
  primaryPressed: "#0E182A",
  onMediaButtonBorder: "rgba(255,248,242,0.65)",
  iconButtonBg: "rgba(255,248,242,0.88)",
  iconButtonOverMediaBg: "rgba(8,11,20,0.38)",
  iconButtonOverMediaBorder: "rgba(248,240,237,0.72)",
  iconButtonBlur: "blur(12px)",
  // Media scrims and loading gradients
  heroScrim: "linear-gradient(180deg,rgba(47,33,36,0.02),rgba(47,33,36,0.76))",
  heroScrimPressed: "linear-gradient(180deg,rgba(47,33,36,0.08),rgba(47,33,36,0.82))",
  heroLoading: "linear-gradient(135deg,#F3D4CB,#A76861)",
  /** Sustained no-asset state: dark warm material so light ink stays legible everywhere. */
  heroNeutral: "linear-gradient(160deg,#6B4E55 0%,#3A2A2E 58%,#2F2124 100%)",
  onboardingScrim:
    "linear-gradient(180deg,rgba(47,33,36,0.18) 0%,rgba(47,33,36,0.06) 45%,rgba(24,17,16,0.78) 100%)",
  onboardingLoading: "linear-gradient(135deg,#715A65,#2F2124)",
  storyScrim: "linear-gradient(180deg,rgba(8,11,20,0.03),rgba(8,11,20,0.78))",
  storyLoading: "linear-gradient(180deg,#D19083,#2F2124)",
  mediaBase: "#2F2124",
  topBarOverMedia: "linear-gradient(180deg,rgba(8,11,20,0.64),rgba(8,11,20,0))",
  expandedPausedScrim: "linear-gradient(rgba(8,11,20,0.24),rgba(8,11,20,0.64))",
  postpartumScrim: "linear-gradient(180deg,rgba(8,11,20,0.08),rgba(8,11,20,0.88))",
  postpartumNeutral: "linear-gradient(145deg,#49373C,#080B14)",
  shimmerLight: "linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)",
  shimmerDark: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)",
  // Sheets
  sheetLightBg: "rgba(255,248,242,0.96)",
  sheetDarkBg: "rgba(18,19,28,0.94)",
  // Journey
  timelineDarkBg: "rgba(8,11,20,0.38)",
  timelineDarkLine: "rgba(216,125,120,0.58)",
  timelineBlur: "blur(10px)",
  // Semantic soft surfaces
  attentionBg: "#F5E7D7",
  attentionBorder: "#E4C9AF",
  attentionProgress: "#A96E39",
  ownedBorder: "#D8E4DC",
  neededBorder: "#E6CDBA",
  completedBorder: "#D2E0D7",
  neededBadgeBorder: "#EABCB6",
  neededBadgeText: "#8C403D",
  // Gender choice (dark surfaces)
  boySelectedBg: "rgba(89,125,183,0.18)",
  boySelectedText: "#AFC5E7",
  girlSelectedBg: "rgba(200,100,130,0.18)",
  girlSelectedText: "#E9AFC0",
  genderDisabledBorder: "#252733",
  genderDisabledText: "#736B70",
  babyCardBorder: "rgba(200,100,130,0.16)",
  // Medical and postpartum rows
  medicalRowBg: "rgba(89,125,183,0.12)",
  medicalRowBorder: "rgba(89,125,183,0.32)",
  medicalPressedBorder: "rgba(89,125,183,0.26)",
  postpartumCompletedBg: "rgba(62,139,104,0.12)",
  postpartumCompletedBorder: "rgba(62,139,104,0.32)",
  postpartumCompletedText: "#A8D2BA",
  postpartumPressedBorder: "#494653",
  // Inputs
  inputFocusRing: "rgba(89,125,183,0.20)",
} as const;

export const fontFamily = {
  ui: "'IBM Plex Sans Arabic', 'SF Arabic', system-ui, sans-serif",
  numeric: "'Inter', 'SF Pro Display', 'IBM Plex Sans Arabic', system-ui, sans-serif",
} as const;

export const fontSize = {
  caption: "11px",
  label: "12px",
  bodySmall: "14px",
  body: "16px",
  titleSmall: "20px",
  pageTitle: "24px",
  display: "48px",
  heroNumber: "64px",
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
} as const;

export const lineHeight = {
  compact: "1.15",
  heading: "1.3",
  body: "1.6",
} as const;

export const letterSpacing = {
  normal: "0",
  tight: "-0.02em",
} as const;

export const spacing = {
  "2xs": "4px",
  xs: "8px",
  sm: "12px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
} as const;

/**
 * From the approved grid rule: "Mobile screens use a four-column grid, 20px
 * page gutters, 12px grid gaps and 24px section rhythm."
 */
export const layout = {
  gutter: "20px",
  gridGap: "12px",
  sectionRhythm: "24px",
  columns: "4",
  maxWidth: "520px",
  topBarHeight: "76px",
  bottomNavHeight: "82px",
} as const;

export const radius = {
  small: "10px",
  control: "14px",
  card: "20px",
  hero: "28px",
  round: "999px",
} as const;

export const shadow = {
  flat: "none",
  raised: "0 8px 24px rgba(70,45,49,0.08)",
  floating: "0 16px 44px rgba(40,25,30,0.14)",
  darkRaised: "0 16px 40px rgba(0,0,0,0.30)",
} as const;

export const border = {
  hairline: "1px solid rgba(53,43,43,0.08)",
  strong: "1px solid #C7B8B2",
  dark: "1px solid #343542",
  focus: "2px solid #597DB7",
} as const;

export const motion = {
  reducedOpacityMs: "120ms",
  ease: "cubic-bezier(0.32, 0.72, 0.24, 1)",
  fast: "160ms",
  base: "260ms",
  slow: "420ms",
} as const;

/**
 * Component dimensions taken verbatim from the approved component CSS
 * (min-heights, paddings, control sizes). Not a spacing scale — a record of
 * what the spec says each component measures.
 */
export const component = {
  buttonMinHeight: "52px",
  buttonPaddingY: "14px",
  buttonPaddingX: "24px",
  iconButtonSize: "44px",
  iconOptical: "20px",
  iconLarge: "24px",
  chipMinHeight: "34px",
  chipPaddingY: "8px",
  chipPaddingX: "14px",
  badgePaddingY: "6px",
  badgePaddingX: "10px",
  controlMinHeight: "50px",
  controlPaddingY: "12px",
  controlPaddingX: "16px",
  rowMinHeight: "52px",
  rowPaddingY: "10px",
  rowPaddingX: "12px",
  providerRowMinHeight: "64px",
  personCardMinHeight: "72px",
  choiceCardMinHeight: "88px",
  mediaCardMinHeight: "164px",
  heroMinHeight: "430px",
  postpartumHeroMinHeight: "360px",
  emptyStateMinHeight: "360px",
  progressHeight: "8px",
  ringSize: "56px",
  nodeSize: "12px",
  nodeCurrentSize: "16px",
  panelPadding: "20px",
  targetMin: "44px",
  navItemMinWidth: "64px",
  navItemMinHeight: "48px",
} as const;

export const tokens = {
  color,
  composite,
  component,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  spacing,
  layout,
  radius,
  shadow,
  border,
  motion,
} as const;

export type ColorToken = keyof typeof color;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type FontSizeToken = keyof typeof fontSize;
