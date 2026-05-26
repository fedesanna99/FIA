/**
 * FEA Pro · Design Tokens — CONSOLIDATED (v2.1)
 *
 * Direzione: Soft · Light default · Cyan singular accent.
 *
 * Questo file è il MIRROR TypeScript di src/tokens.css. Usalo per:
 *   - tailwind.config.ts (extend.colors / extend.spacing / extend.borderRadius)
 *   - typing di componenti che accettano token come prop ('accent' | 'success' | …)
 *   - generazione automatica documentazione (es. Storybook controls)
 *
 * NON usare questi valori inline nei componenti React: importa CSS variables
 * (es. `color: var(--accent)`) — manterrai il tema reattivo automaticamente.
 */

export const tokens = {
  // ── Colors · Light (canonical) ──────────────────────────────────────
  light: {
    bg:           "#FAFAFA",
    bgPanel:      "#FFFFFF",
    bgElevated:   "#FFFFFF",
    bgHover:      "#F4F5F7",
    bgViewport:   "#F4F5F7",
    bgActive:     "#E6F1FB",

    border:       "#E5E6E8",
    borderLight:  "#D4D6DA",
    borderStrong: "#A8ACB3",

    ink:          "#15161A",
    inkMuted:     "#4A4F57",
    inkDim:       "#7B808A",
    inkFaint:     "#B0B5BD",

    accent:        "#0891B2",
    accentHover:   "#0E7490",
    accentActive:  "#155E75",
    accentSubtle:  "#ECFEFF",

    success: "#65A30D",
    warn:    "#B45309",
    coral:   "#C2410C",
    purple:  "#534AB7",
    danger:  "#DC2626",
    info:    "#0891B2",

    bgSuccess: "#EAF3DE",
    bgWarn:    "#FAEEDA",
    bgCoral:   "#FAECE7",
    bgPurple:  "#EEEDFE",
    bgInfo:    "#E6F1FB",
    bgDanger:  "#FEE8E8",
  },

  // ── Colors · Dark (opt-in) ──────────────────────────────────────────
  dark: {
    bg:           "#0E1014",
    bgPanel:      "#16191F",
    bgElevated:   "#1D2128",
    bgHover:      "#1D2128",
    bgViewport:   "#08090C",
    bgActive:     "#15314A",

    border:       "#262B33",
    borderLight:  "#2F3640",
    borderStrong: "#3D4754",

    ink:          "#F2F4F7",
    inkMuted:     "#B5BAC2",
    inkDim:       "#80868F",
    inkFaint:     "#555C66",

    accent:        "#6EDDF5",
    accentHover:   "#88E2F5",
    accentActive:  "#5DD7F2",
    accentSubtle:  "rgba(110,221,245,0.12)",

    success: "#8FD14F",
    warn:    "#FBBF24",
    coral:   "#FB923C",
    purple:  "#B19BFB",
    danger:  "#F87171",
    info:    "#6EDDF5",
  },

  // ── Radii · Soft default, Sharp opt-in ──────────────────────────────
  radius: {
    none: 0,
    xs:   4,
    sm:   6,
    md:   8,
    lg:   10,
    xl:   12,
    "2xl": 16,
    "3xl": 20,
    full: 9999,
  },

  // ── Motion ──────────────────────────────────────────────────────────
  motion: {
    fast: 120,
    mid:  200,
    slow: 360,
    easeStandard:   "cubic-bezier(0.2, 0, 0, 1)",
    easeDecelerate: "cubic-bezier(0, 0, 0.2, 1)",
    easeAccelerate: "cubic-bezier(0.4, 0, 1, 1)",
  },

  // ── Fonts ───────────────────────────────────────────────────────────
  font: {
    sans:    '"Inter", -apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, sans-serif',
    display: '"Plus Jakarta Sans", "Inter Tight", "Inter", -apple-system, sans-serif',
    mono:    '"JetBrains Mono", ui-monospace, monospace',
  },

  // ── Type scale ──────────────────────────────────────────────────────
  fontSize: {
    xs:   [11, 15],
    sm:   [12, 16],
    base: [13, 19],
    md:   [14, 20],
    lg:   [16, 22],
    xl:   [18, 24],
    "2xl": [22, 28],
    "3xl": [30, 34],
    "4xl": [44, 46],
    "5xl": [56, 58],
  } as const,

  // ── Spacing (4px scale, Tailwind parity) ────────────────────────────
  spacing: {
    0: 0,   1: 4,   2: 8,   3: 12,
    4: 16,  5: 20,  6: 24,  8: 32,
    10: 40, 12: 48, 16: 64, 20: 80,
  },

  // ── Z-index ─────────────────────────────────────────────────────────
  zIndex: {
    viewport: 0,
    panel:    10,
    toolbar:  20,
    dropdown: 30,
    popover:  35,
    dialog:   40,
    toast:    50,
    tooltip:  60,
    loader:   70,
  },
} as const;

export type Tokens = typeof tokens;
export type SemanticColor =
  | "accent" | "success" | "warn" | "coral" | "purple" | "danger" | "info";

/* ──────────────────────────────────────────────────────────────────────
 * USAGE (in components):
 *
 * import { tokens } from "@/tokens";
 *
 * <div style={{ background: "var(--bg-panel)", padding: tokens.spacing[4] }} />
 *
 * Tailwind users can map:
 *   extend.colors.accent = "var(--accent)"  // resolves dynamically
 * ──────────────────────────────────────────────────────────────────── */
