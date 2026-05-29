/** @type {import('tailwindcss').Config} */
// FEA Pro · Tailwind config · Soft v2.1 (post FETTA E0-fix Commit 2)
//
// Le palette referenziano CSS variables in `src/index.css` (e `styles/tokens.css`).
// Cyan #0891B2 singolo come accent. Soft radius (DEFAULT=md=8px) opt-out via
// `data-radius="sharp"` su <html> (vedi tokens.css). Hairline-only shadow.
//
// IMPORTANTE — perché esistono le --c-* (RGB triplet) accanto alle --bg/--accent ecc.:
// Tailwind colors leggono le --c-* (RGB triplet, intenzionale) per supportare i
// modificatori alpha tipo bg-accent/50, border-border/30, text-ink-muted/70.
// La forma `rgb(var(--c-bg) / <alpha-value>)` richiede il triplet sgrezzo.
// Non sono valori "fossili": sono il "binario alpha" del bridge tokens → tailwind.
//
// Alias legacy preservati (accent.primary, success/warn/danger top-level, percorsi)
// per non rompere i componenti esistenti — saranno rimossi in PR successive man mano
// che i componenti vengono ri-stilati.
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
          info:     "rgb(var(--c-bg-info) / <alpha-value>)",
          success:  "rgb(var(--c-bg-success) / <alpha-value>)",
          warn:     "rgb(var(--c-bg-warn) / <alpha-value>)",
          coral:    "rgb(var(--c-bg-coral) / <alpha-value>)",
          purple:   "rgb(var(--c-bg-purple) / <alpha-value>)",
          danger:   "rgb(var(--c-bg-danger) / <alpha-value>)",
          gray:     "rgb(var(--c-bg-hover) / <alpha-value>)",
          // DEPRECATED v2.0 PR1: alias di accent-subtle (era emerald).
          // Verra' rimosso in PR3a quando le CTA Percorsi useranno bg-accent.
          percorsi: "rgb(var(--c-bg-percorsi) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--c-border) / <alpha-value>)",
          light:   "rgb(var(--c-border-light) / <alpha-value>)",
          strong:  "rgb(var(--c-border-strong) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          1:       "rgb(var(--c-ink) / <alpha-value>)",
          2:       "rgb(var(--c-ink-muted) / <alpha-value>)",
          3:       "rgb(var(--c-ink-dim) / <alpha-value>)",
          4:       "rgb(var(--c-ink-faint) / <alpha-value>)",
          muted:   "rgb(var(--c-ink-muted) / <alpha-value>)",
          dim:     "rgb(var(--c-ink-dim) / <alpha-value>)",
          faint:   "rgb(var(--c-ink-faint) / <alpha-value>)",
          info:    "rgb(var(--c-accent) / <alpha-value>)",
          success: "rgb(var(--c-success) / <alpha-value>)",
          warn:    "rgb(var(--c-warn) / <alpha-value>)",
          coral:   "rgb(var(--c-coral) / <alpha-value>)",
          purple:  "rgb(var(--c-purple) / <alpha-value>)",
          gray:    "rgb(var(--c-ink-dim) / <alpha-value>)",
          // DEPRECATED v2.0 PR1: alias di accent (era emerald).
          percorsi: "rgb(var(--c-accent) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          hover:   "rgb(var(--c-accent-hover) / <alpha-value>)",
          subtle:  "rgb(var(--c-accent-subtle) / <alpha-value>)",
          on:      "#FFFFFF",
          // alias legacy
          primary: "rgb(var(--c-accent) / <alpha-value>)",
          success: "rgb(var(--c-success) / <alpha-value>)",
          warning: "rgb(var(--c-warn) / <alpha-value>)",
          danger:  "rgb(var(--c-danger) / <alpha-value>)",
        },
        coral:    "rgb(var(--c-coral) / <alpha-value>)",
        purple:   "rgb(var(--c-purple) / <alpha-value>)",
        // DEPRECATED v2.0 PR1: percorsi top-level alias di accent.
        percorsi: "rgb(var(--c-accent) / <alpha-value>)",
        success:  "rgb(var(--c-success) / <alpha-value>)",
        warn:     "rgb(var(--c-warn) / <alpha-value>)",
        danger:   "rgb(var(--c-danger) / <alpha-value>)",
        info:     "rgb(var(--c-info) / <alpha-value>)",
        error:    "rgb(var(--c-danger) / <alpha-value>)",
        // FETTA E0-fix Commit 2: rimosso blocco "ghost" Soft v2.1 duplicato
        // (panel/elevated/hover/viewport/active/border-light/border-strong/
        //  ink-*/accent-*/bg-*). Tutti questi nomi sono gia' definiti sopra
        // nel blocco con --c-* (RGB triplet), che e' la fonte canonica con
        // supporto <alpha-value>. Il blocco ghost mappava agli alias
        // --bg-panel/--accent-hover/etc, ma senza alpha — rompeva
        // bg-panel/50, accent-hover/30 ecc. Eliminato per evitare
        // duplicazione + regressione silente.
      },
      fontFamily: {
        // v2.6.1 foundation: Plus Jakarta Sans diventa il display nuovo,
        // Inter Tight resta come fallback (preservato fino a Fase 2).
        sans:    ["Inter", "-apple-system", "BlinkMacSystemFont", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter Tight", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono:    ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        xs:    ["11px", { lineHeight: "15px" }],
        sm:    ["12px", { lineHeight: "16px" }],
        base:  ["13px", { lineHeight: "19px" }],
        md:    ["14px", { lineHeight: "20px" }],
        lg:    ["16px", { lineHeight: "22px" }],
        xl:    ["18px", { lineHeight: "24px" }],
        "2xl": ["22px", { lineHeight: "28px" }],
        "3xl": ["30px", { lineHeight: "34px" }],
        "4xl": ["44px", { lineHeight: "46px" }],
      },
      // FETTA E0-fix Commit 2 · Soft v2.1: il cambio CENTRALE.
      // DEFAULT = var(--r-md) = 8px (era 0 = sharp Precision).
      // Ogni componente con classe "rounded" senza modificatore d'ora in
      // poi e' Soft 8px. I componenti che vogliono restare sharp devono
      // dichiarare `rounded-none` esplicitamente.
      // SHARP MODE opt-in globale: `data-radius="sharp"` su <html> (vedi
      // tokens.css `[data-radius="sharp"]` override delle --r-* a 0).
      borderRadius: {
        none:    "0",
        DEFAULT: "var(--r-md)",
        xs:      "var(--r-xs)",
        sm:      "var(--r-sm)",
        md:      "var(--r-md)",
        lg:      "var(--r-lg)",
        xl:      "var(--r-xl)",
        "2xl":   "var(--r-2xl)",
        "3xl":   "var(--r-3xl)",
        full:    "9999px",
      },
      boxShadow: {
        // Hairline-only — niente multi-layer gradient
        pop:      "var(--shadow-pop)",
        elev:     "var(--shadow-elev)",
        dialog:   "var(--shadow-dialog)",
        // v2.6.1 foundation: Soft v2.1 shadows
        card:     "var(--shadow-card)",
        hover:    "var(--shadow-hover)",
        // Alias legacy
        panel:    "var(--shadow-elev)",
        dropdown: "var(--shadow-pop)",
        none:     "none",
      },
      letterSpacing: {
        "tight-1": "-0.015em",
        "tight-2": "-0.02em",
        "tight-3": "-0.025em",
        "tight-4": "-0.035em",
        "wide-1":  "0.06em",
        "wide-2":  "0.1em",
        "wide-3":  "0.14em",
        "wide-4":  "0.16em",
      },
      transitionDuration: {
        fast: "120ms",
        mid:  "200ms",
        slow: "360ms",
      },
      transitionTimingFunction: {
        standard:   "cubic-bezier(0.2, 0, 0, 1)",
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        accelerate: "cubic-bezier(0.4, 0, 1, 1)",
      },
      // v2.6.3.0 precision-tokens: caret per Input/cmdk con accent cyan
      caretColor: {
        accent: "rgb(var(--c-accent))",
      },
      screens: {
        sm: "768px",
        md: "1024px",
        lg: "1280px",
        xl: "1440px",
      },
      zIndex: {
        viewport: 0,
        panel:    10,
        toolbar:  20,
        dropdown: 30,
        popover:  35,
        dialog:   40,
        toast:    50,
        tooltip:  60,
      },
      keyframes: {
        // Legacy (mantengo per non rompere i componenti che li usano)
        "fade-in":     { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up":    { from: { transform: "translateY(8px)",  opacity: "0" },
                         to:   { transform: "translateY(0)",    opacity: "1" } },
        "slide-down":  { from: { transform: "translateY(-8px)", opacity: "0" },
                         to:   { transform: "translateY(0)",    opacity: "1" } },
        "slide-right": { from: { transform: "translateX(-8px)", opacity: "0" },
                         to:   { transform: "translateX(0)",    opacity: "1" } },
        "slide-left":  { from: { transform: "translateX(8px)",  opacity: "0" },
                         to:   { transform: "translateX(0)",    opacity: "1" } },
        // Precision (additivi)
        "precision-spin":          { to: { transform: "rotate(360deg)" } },
        "precision-pulse":         { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        "precision-shimmer":       { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
        "precision-indeterminate": { "0%": { left: "-40%", right: "100%" }, "60%": { left: "100%", right: "-10%" }, "100%": { left: "100%", right: "-10%" } },
        // PR16 T10 — Precision tick (row-arrival fade) e sweep (SVG stroke)
        "precision-tick":  { from: { opacity: "0", transform: "translateY(2px)" },
                             to:   { opacity: "1", transform: "translateY(0)" } },
        "precision-sweep": { "0%":   { strokeDashoffset: "100", opacity: "0.3" },
                             "40%":  { strokeDashoffset: "0",   opacity: "1" },
                             "60%":  { strokeDashoffset: "0",   opacity: "1" },
                             "100%": { strokeDashoffset: "-100", opacity: "0.3" } },
        // v2.6.3.0 precision-tokens — onboarding spotlight ring
        // (Sprint 5 T2: applicato a [data-tour-target="active"])
        "precision-pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(var(--accent-rgb), 0.4)" },
          "50%":      { boxShadow: "0 0 0 6px rgba(var(--accent-rgb), 0)" },
        },
      },
      animation: {
        "fade-in":     "fade-in 120ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-up":    "slide-up 220ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-down":  "slide-down 220ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-right": "slide-right 220ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-left":  "slide-left 220ms cubic-bezier(0.2, 0, 0, 1)",
        "spin":          "precision-spin 0.8s linear infinite",
        "pulse":         "precision-pulse 1.2s ease-in-out infinite",
        "shimmer":       "precision-shimmer 1.4s linear infinite",
        "indeterminate": "precision-indeterminate 1.6s cubic-bezier(.4,0,.2,1) infinite",
        // PR16 T10
        "tick":          "precision-tick 0.18s ease-out",
        "sweep":         "precision-sweep 2s cubic-bezier(.4,0,.2,1) infinite",
        // v2.6.3.0 precision-tokens
        "precision-pulse-ring": "precision-pulse-ring 1.2s cubic-bezier(.4,0,.2,1) infinite",
      },
    },
  },
  plugins: [],
};
