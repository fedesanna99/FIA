# E1 / E2 · Animations spec · Onboarding + Command Palette

> Specifiche dettagliate delle animazioni per i 2 overlay più ricchi.
> Tutte le animation classes referenziate sono già in `tailwind.config.js`.

## E1 · OnboardingTour

### Spotlight overlay

L'overlay di onboarding ha 3 layer impilati:

```
z-tooltip   · Tour card (la card che spiega lo step)
z-dialog    · Backdrop dim (rgba 0,0,0,0.45) con clip-path / SVG cut-out
z-popover   · Spotlight rectangle (il "buco" che lascia vedere il target)
```

### Backdrop animation

```tsx
<div
  className="
    fixed inset-0 z-dialog
    bg-black/45 animate-fade-in
    transition-opacity duration-mid
  "
  aria-hidden="true"
  onClick={onSkip}  // click backdrop = skip tour
/>
```

- Mount: `animate-fade-in` (120ms).
- Unmount: `transition-opacity` su `opacity-0` (200ms).

### Spotlight (CSS clip-path approach)

```tsx
const rect = targetRef.current.getBoundingClientRect();
const padding = 8;

<div
  className="fixed inset-0 z-dialog pointer-events-none bg-black/45 transition-all duration-mid ease-standard"
  style={{
    clipPath: \`polygon(
      0% 0%, 0% 100%,
      \${rect.left - padding}px 100%,
      \${rect.left - padding}px \${rect.top - padding}px,
      \${rect.right + padding}px \${rect.top - padding}px,
      \${rect.right + padding}px \${rect.bottom + padding}px,
      \${rect.left - padding}px \${rect.bottom + padding}px,
      \${rect.left - padding}px 100%,
      100% 100%, 100% 0%
    )\`
  }}
/>
```

Quando l'utente avanza al prossimo step, il clip-path `transition` per 200ms
con ease-standard. Sembra che la "luce" scorra dal target precedente al
nuovo target — riconoscibile, non disorientante.

### Tour card

```tsx
<div
  className="
    fixed z-tooltip bg-bg-panel border border-border shadow-dialog
    p-4 w-80 animate-slide-up
    transition-all duration-mid ease-standard
  "
  style={{ top: cardTop, left: cardLeft }}
  role="dialog"
  aria-label={\`Tour step \${currentStep} di \${totalSteps}\`}
>
  ...
</div>
```

- Mount: `animate-slide-up` (220ms).
- Riposizionamento (next step): `transition-all` su `top` e `left` per 200ms.

### Highlight pulse del target

Quando lo step diventa attivo, applica una classe al target stesso:

```tsx
<button data-tour-target={isCurrentStep ? "active" : undefined}>...</button>

// CSS:
[data-tour-target="active"] {
  outline: 2px solid theme(colors.accent.DEFAULT);
  outline-offset: 2px;
  animation: precision-pulse 1.2s ease-in-out infinite;
}
```

Il pulse smette quando l'utente avanza (state cambia, classe rimossa).

## E2 · CommandPalette

### Open/close animation

La palette apre dall'alto della viewport, leggermente sotto la TopBar:

```tsx
<div
  className="
    fixed inset-0 z-dialog bg-black/30 animate-fade-in
  "
  onClick={onClose}
  aria-hidden="true"
/>

<div
  role="dialog"
  aria-modal="true"
  aria-label="Command palette"
  className="
    fixed top-[15vh] left-1/2 -translate-x-1/2
    w-full max-w-2xl z-dialog
    bg-bg-elevated border border-border shadow-dialog
    animate-slide-down
  "
>
  ...
</div>
```

- **Open**: `animate-slide-down` 220ms (entra dall'alto) + backdrop fade-in
  120ms simultaneo.
- **Close**: `animate-slide-up` reverse 200ms — gestiscilo con `useEffect`
  + setState `closing` che lascia montato per 200ms prima di unmount.

### Search input typeahead

L'input ha `autoFocus` e mostra il cursor lampeggiante con la classe
`caret-accent` (Tailwind utility). Quando l'utente digita, le sezioni
si aggiornano con `animate-fade-in` ma SOLO se la query cambia gruppo,
altrimenti niente animation (evita jitter).

### Item highlight

```tsx
<button
  className={cn(
    "w-full text-left px-3 py-2 flex items-center gap-3",
    "transition-colors duration-fast",
    isSelected
      ? "bg-accent-subtle text-ink border-l-2 border-l-accent"
      : "hover:bg-bg-hover border-l-2 border-l-transparent",
  )}
>
  <Icon className="w-4 h-4 text-ink-2" />
  <span className="flex-1 truncate">{item.label}</span>
  <Kbd>{item.shortcut}</Kbd>
</button>
```

Il `border-l-2` cambia colore ma non spessore → no layout shift. Il
`hover` e `isSelected` sono mutuamente esclusivi (manage in JS, non solo CSS).

### Empty state

Quando 0 risultati per la query corrente:

```tsx
{filtered.length === 0 && (
  <div className="px-3 py-8 text-center text-base text-ink-3 animate-fade-in">
    Nessun comando per <span className="font-mono text-ink-2">"{query}"</span>.
    <br />
    <span className="font-mono text-[10px] uppercase tracking-wide-2 mt-2 inline-block">
      Prova con: "esegui", "ispeziona", "report", "tema"
    </span>
  </div>
)}
```

### Footer hint

In basso alla palette, hint sui controlli da tastiera:

```tsx
<footer className="border-t border-border bg-bg px-3 py-2 flex items-center gap-3 text-[10px] font-mono text-ink-3">
  <span><Kbd>↑↓</Kbd> naviga</span>
  <span><Kbd>↵</Kbd> seleziona</span>
  <span><Kbd>esc</Kbd> chiudi</span>
  <span className="ml-auto">{filtered.length} / {total} comandi</span>
</footer>
```

## Performance notes

- Tutte le animation usano `transform` + `opacity` (compositor-only, no layout
  thrash).
- `prefers-reduced-motion` rispettato globalmente da Tailwind `motion-safe:`
  e `motion-reduce:` — wrappa le animation classes in `motion-safe:animate-...`
  se l'utente ha ridotto motion.
- Il backdrop fade-in NON usa `backdrop-blur` su mobile (degrada performance).
  Solo `bg-black/30`. Su desktop puoi aggiungere `backdrop-blur-sm`.

## Reference

- `screens/E1-onboarding.html` (Claude Design originale · 8 step pattern)
- `screens/E2-command-palette.html` (Claude Design originale · 7 risultati)
- `src/components/shell/OnboardingTour.tsx` (esistente, da arricchire con queste animazioni)
- `src/components/shell/CommandPalette.tsx` (esistente)
