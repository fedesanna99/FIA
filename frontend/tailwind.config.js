/** @type {import('tailwindcss').Config} */
// Le palette ora referenziano CSS variables definite in `src/index.css`,
// così il theme store può swappare dark/light via attributo `data-theme`.
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
        success: "rgb(var(--c-success) / <alpha-value>)",
        warn:    "rgb(var(--c-warn) / <alpha-value>)",
        danger:  "rgb(var(--c-danger) / <alpha-value>)",
        info:    "rgb(var(--c-info) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
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
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        panel: "0 6px 24px -8px rgba(0,0,0,.55)",
        dropdown: "0 8px 32px -6px rgba(0,0,0,.65)",
        dialog: "0 24px 64px -12px rgba(0,0,0,.75)",
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
