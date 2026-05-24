// tailwind.config.snippet.js
// ───────────────────────────────────────────────────────────────────────
// Estensione del tema Tailwind per FEA Pro · direzione Precision · v1.9.
// MERGIA questo nel tuo tailwind.config.js esistente — NON lo sostituire.
// I valori puntano alle CSS variables in tokens.css (vedi `handoff/tokens.css`).
//
// Esempio uso nel JSX:
//   <div className="bg-panel border border-default text-ink-2 font-mono">
//   <button className="bg-accent text-accent-on hover:bg-accent-hover">
//   <h1 className="font-display text-3xl tracking-tight-2">
//
// Tutti i radius sono mappati a 0 — il design è sharp. La sola eccezione
// è `rounded-full` (cerchi puri: avatar, dot, pulse).
//
// La chiave `withOpacity()` consente classi tipo `text-ink/60` per usare
// il triplo RGB definito in tokens.css.
// ───────────────────────────────────────────────────────────────────────

function rgbVar(name) {
  // returns rgb(var(--c-bg) / <alpha-value>) for Tailwind opacity support
  return ({ opacityValue }) => {
    if (opacityValue === undefined) return `rgb(var(${name}))`;
    return `rgb(var(${name}) / ${opacityValue})`;
  };
}

module.exports = {
  // append to your existing config under `theme.extend`
  theme: {
    extend: {
      colors: {
        bg:            rgbVar('--c-bg'),
        'bg-panel':    rgbVar('--c-bg-panel'),
        'bg-elevated': rgbVar('--c-bg-elevated'),
        'bg-hover':    rgbVar('--c-bg-hover'),
        'bg-viewport': rgbVar('--c-bg-viewport'),
        'bg-active':   rgbVar('--c-bg-active'),

        border: {
          DEFAULT: rgbVar('--c-border'),
          light:   rgbVar('--c-border-light'),
          strong:  rgbVar('--c-border-strong'),
        },

        ink: {
          DEFAULT: rgbVar('--c-ink'),
          1:       rgbVar('--c-ink'),
          2:       rgbVar('--c-ink-muted'),
          3:       rgbVar('--c-ink-dim'),
          4:       rgbVar('--c-ink-faint'),
        },

        accent: {
          DEFAULT: rgbVar('--c-accent'),
          hover:   rgbVar('--c-accent-hover'),
          subtle:  rgbVar('--c-accent-subtle'),
          on:      '#FFFFFF', // testo su sfondo accent (light); in dark cambia → vedi note
        },

        success: rgbVar('--c-success'),
        warn:    rgbVar('--c-warn'),
        coral:   rgbVar('--c-coral'),
        purple:  rgbVar('--c-purple'),
        danger:  rgbVar('--c-danger'),
        info:    rgbVar('--c-info'),

        'bg-success': rgbVar('--c-bg-success'),
        'bg-warn':    rgbVar('--c-bg-warn'),
        'bg-coral':   rgbVar('--c-bg-coral'),
        'bg-purple':  rgbVar('--c-bg-purple'),
        'bg-danger':  rgbVar('--c-bg-danger'),
      },

      // Sharp: tutti i radius azzerati. `rounded-full` resta per cerchi.
      borderRadius: {
        none:   '0',
        sm:     '0',
        DEFAULT: '0',
        md:     '0',
        lg:     '0',
        xl:     '0',
        '2xl':  '0',
        '3xl':  '0',
        full:   '9999px',
      },

      // Hairline-only philosophy — niente shadow gradient
      boxShadow: {
        pop:    '0 0 0 1px rgba(0,0,0,.06)',
        elev:   '0 0 0 1px rgba(0,0,0,.05)',
        dialog: '0 0 0 1px rgba(0,0,0,.08)',
        // Dark theme variants — applica via [data-theme="dark"] in CSS, NON qui.
        none:   'none',
      },

      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter Tight', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        xs:    ['11px', '15px'],
        sm:    ['12px', '16px'],
        base:  ['13px', '19px'],   // body baseline
        md:    ['14px', '20px'],
        lg:    ['16px', '22px'],
        xl:    ['18px', '24px'],
        '2xl': ['22px', '28px'],
        '3xl': ['30px', '34px'],
        '4xl': ['44px', '46px'],
      },

      letterSpacing: {
        'tight-1': '-0.015em',
        'tight-2': '-0.02em',
        'tight-3': '-0.025em',
        'tight-4': '-0.035em',
        'wide-1':  '0.06em',
        'wide-2':  '0.1em',
        'wide-3':  '0.14em',
        'wide-4':  '0.16em',
      },

      spacing: {
        'px':   '1px',
        '0.5':  '2px',
        1:      '4px',
        2:      '8px',
        3:      '12px',
        4:      '16px',
        5:      '20px',
        6:      '24px',
        8:      '32px',
        10:     '40px',
        12:     '48px',
        16:     '64px',
      },

      transitionDuration: {
        fast: '120ms',
        mid:  '200ms',
        slow: '360ms',
      },

      transitionTimingFunction: {
        standard:   'cubic-bezier(0.2, 0, 0, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
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

      animation: {
        spin:           'precision-spin 0.8s linear infinite',
        pulse:          'precision-pulse 1.2s ease-in-out infinite',
        shimmer:        'precision-shimmer 1.4s linear infinite',
        indeterminate:  'precision-indeterminate 1.6s cubic-bezier(.4,0,.2,1) infinite',
      },

      keyframes: {
        'precision-spin':          { to: { transform: 'rotate(360deg)' } },
        'precision-pulse':         {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'precision-shimmer':       {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'precision-indeterminate': {
          '0%':   { left: '-40%', right: '100%' },
          '60%':  { left: '100%', right: '-10%' },
          '100%': { left: '100%', right: '-10%' },
        },
      },
    },
  },

  // Plugin notes:
  // - Mantieni @tailwindcss/forms se già presente
  // - NON aggiungere @tailwindcss/typography (non usato in UI dense)
  plugins: [],
};
