/** @type {import('tailwindcss').Config} */
// Le palette referenziano CSS variables definite in `src/index.css`,
// così il theme store può swappare dark/light via attributo `data-theme`.
// Aggiornato per Sprint 4 / Asse G (alpha.16): aggiunti tint semantici
// info/success/warn/coral/purple come da mockup v1.3.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT:  "rgb(var(--c-bg) / <alpha-value>)",
          panel:    "rgb(var(--c-bg-panel) / <alpha-value>)",
          elevated: "rgb(var(--c-bg-elevated) / <alpha-value>)",
          hover:    "rgb(var(--c-bg-hover) / <alpha-value>)",
          viewport: "rgb(var(--c-bg-viewport) / <alpha-value>)",
          active:   "rgb(var(--c-bg-active) / <alpha-value>)",
          // Semantic background tints (mockup v1.3)
          info:     "rgb(var(--c-bg-info) / <alpha-value>)",
          success:  "rgb(var(--c-bg-success) / <alpha-value>)",
          warn:     "rgb(var(--c-bg-warn) / <alpha-value>)",
          coral:    "rgb(var(--c-bg-coral) / <alpha-value>)",
          purple:   "rgb(var(--c-bg-purple) / <alpha-value>)",
          // v1.7 T1: 6° tono "gray" per hub-card neutre (alias di
          // bg-hover, semantica "non-categorizzato"). Allinea
          // mockup_reference.html.
          gray:     "rgb(var(--c-bg-hover) / <alpha-value>)",
          // v1.8 step 0: 2° asse semantico "Percorsi" emerald.
          percorsi: "rgb(var(--c-bg-percorsi) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--c-border) / <alpha-value>)",
          light:   "rgb(var(--c-border-light) / <alpha-value>)",
          strong:  "rgb(var(--c-border-strong) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          muted:   "rgb(var(--c-ink-muted) / <alpha-value>)",
          dim:     "rgb(var(--c-ink-dim) / <alpha-value>)",
          faint:   "rgb(var(--c-ink-faint) / <alpha-value>)",
          // Semantic ink (mockup v1.3) — testo info/success/warn/coral/purple
          info:    "rgb(var(--c-accent) / <alpha-value>)",
          success: "rgb(var(--c-success) / <alpha-value>)",
          warn:    "rgb(var(--c-warn) / <alpha-value>)",
          coral:   "rgb(var(--c-coral) / <alpha-value>)",
          purple:  "rgb(var(--c-purple) / <alpha-value>)",
          // v1.7 T1: 6° tono "gray" (alias di ink-dim, hub-card neutre).
          gray:    "rgb(var(--c-ink-dim) / <alpha-value>)",
          // v1.8 step 0: 2° asse semantico "Percorsi" emerald (light: #059669,
          // dark: #34D399). Da UI Gap Analysis: serve come token sistematico
          // per CTA Percorsi su Home + libreria route cards future.
          percorsi: "rgb(var(--c-percorsi) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          hover:   "rgb(var(--c-accent-hover) / <alpha-value>)",
          subtle:  "rgb(var(--c-accent-subtle) / <alpha-value>)",
          // alias legacy
          primary: "rgb(var(--c-accent) / <alpha-value>)",
          success: "rgb(var(--c-success) / <alpha-value>)",
          warning: "rgb(var(--c-warn) / <alpha-value>)",
          danger:  "rgb(var(--c-danger) / <alpha-value>)",
        },
        coral:   "rgb(var(--c-coral) / <alpha-value>)",
        purple:  "rgb(var(--c-purple) / <alpha-value>)",
        // v1.8 step 0: top-level alias per `text-percorsi`, `border-percorsi`, ecc.
        percorsi: "rgb(var(--c-percorsi) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        warn:    "rgb(var(--c-warn) / <alpha-value>)",
        danger:  "rgb(var(--c-danger) / <alpha-value>)",
        info:    "rgb(var(--c-info) / <alpha-value>)",
        // Errore: alias per Tailwind text-error usato in alcuni component legacy
        error:   "rgb(var(--c-danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans", "-apple-system", "BlinkMacSystemFont", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        display: ["Inter", "-apple-system", "sans-serif"],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "16px" }],
        sm: ["12px", { lineHeight: "16px" }],
        base: ["13px", { lineHeight: "18px" }],
        md: ["14px", { lineHeight: "20px" }],
        lg: ["16px", { lineHeight: "22px" }],
        xl: ["18px", { lineHeight: "26px" }],
        "2xl": ["22px", { lineHeight: "30px" }],
        "3xl": ["28px", { lineHeight: "36px" }],
      },
      borderRadius: {
        // Allineata al mockup v1.3 (--r-sm 4 / md 6 / lg 10 / xl 14)
        sm: "4px",
        md: "6px",
        lg: "10px",
        xl: "14px",
        // Legacy: mantenute alias precedenti per non rompere componenti che
        // usano `rounded-2xl` (20px). Tailwind genera comunque "2xl" di default.
      },
      boxShadow: {
        // Allineati al mockup (--shadow-pop / --shadow-elev / --shadow-dialog)
        // Le ombre seguono il theme (light = soffuse, dark = piu' marcate).
        pop:      "var(--shadow-pop)",
        elev:     "var(--shadow-elev)",
        dialog:   "var(--shadow-dialog)",
        // Legacy alias (componenti pre-Sprint 4):
        panel:    "var(--shadow-elev)",
        dropdown: "var(--shadow-pop)",
      },
      transitionDuration: {
        fast: "120ms",
        mid: "220ms",
        slow: "360ms",
      },
      screens: {
        sm: "768px",
        md: "1024px",
        lg: "1280px",
        xl: "1440px",
      },
      keyframes: {
        "fade-in":     { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up":    { from: { transform: "translateY(8px)", opacity: "0" },
                         to:   { transform: "translateY(0)",   opacity: "1" } },
        "slide-down":  { from: { transform: "translateY(-8px)", opacity: "0" },
                         to:   { transform: "translateY(0)",    opacity: "1" } },
        "slide-right": { from: { transform: "translateX(-8px)", opacity: "0" },
                         to:   { transform: "translateX(0)",    opacity: "1" } },
        "slide-left":  { from: { transform: "translateX(8px)", opacity: "0" },
                         to:   { transform: "translateX(0)",   opacity: "1" } },
      },
      animation: {
        "fade-in":     "fade-in 120ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-up":    "slide-up 220ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-down":  "slide-down 220ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-right": "slide-right 220ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-left":  "slide-left 220ms cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [],
};
