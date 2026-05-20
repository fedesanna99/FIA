/**
 * Design tokens FEA Pro v2 — fonte di verità per colori, spaziature, font, animazioni.
 *
 * Vengono esposti:
 *  - come oggetto TS importabile (tipato, autocomplete)
 *  - come CSS variables in `index.css` (per Tailwind `theme.extend` + utility classes runtime)
 *
 * Modifiche qui devono essere riflesse in `tailwind.config.js` e `index.css`.
 */

export const tokens = {
  color: {
    /** Sfondo app */
    bg: "#0F1115",
    /** Pannelli laterali / top bar */
    bgPanel: "#171A21",
    /** Dialog, dropdown, popover */
    bgElevated: "#1F232C",
    /** Hover / interazione */
    bgHover: "#222732",
    /** Viewport 3D (più scuro per contrasto col modello) */
    bgViewport: "#0A0C10",

    border: "#262B36",
    borderLight: "#363D4A",
    borderStrong: "#4B5568",

    ink: "#E6E8EE",
    inkMuted: "#9AA0AB",
    inkDim: "#5F6675",

    accent: "#3DA9FC",
    accentHover: "#5BBAFF",
    accentSubtle: "#1D3A5C",

    success: "#22C55E",
    warn: "#F59E0B",
    danger: "#EF4444",
    info: "#06B6D4",

    /** Palette charts (8 colori distinguibili) */
    chart: [
      "#3DA9FC", // blu
      "#A78BFA", // viola
      "#22C55E", // verde
      "#F59E0B", // ambra
      "#EF4444", // rosso
      "#06B6D4", // ciano
      "#EC4899", // rosa
      "#84CC16", // lime
    ],
  },

  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    full: "9999px",
  },

  space: {
    /** Spaziature standard (tailwind compatibile) */
    px: "1px",
    "0.5": "2px",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
  },

  font: {
    ui: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },

  fontSize: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "22px",
    "3xl": "28px",
  },

  shadow: {
    panel: "0 6px 24px -8px rgba(0,0,0,.55)",
    dropdown: "0 8px 32px -6px rgba(0,0,0,.65)",
    dialog: "0 24px 64px -12px rgba(0,0,0,.75)",
  },

  duration: {
    fast: "120ms",
    mid: "220ms",
    slow: "360ms",
  },

  ease: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
  },

  zIndex: {
    viewport: 0,
    panel: 10,
    toolbar: 20,
    dropdown: 30,
    popover: 35,
    dialog: 40,
    toast: 50,
    tooltip: 60,
  },

  /** Breakpoints responsive (vedi UI_REDESIGN_SPEC §4) */
  breakpoint: {
    sm: "768px",
    md: "1024px",
    lg: "1280px",
    xl: "1440px",
  },
} as const;

export type Tokens = typeof tokens;
