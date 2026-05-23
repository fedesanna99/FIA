# B2 · MakePanel · Hub re-style guidance

> Il `MakePanel` esiste già in `src/shell/panels/MakePanel.tsx` con hub +
> drill-in. Va **ri-stilato**, NON ricreato. Questa guida documenta i
> dettagli visivi del mockup B2 di handoff Claude Design.

## Pattern hub-card (Geometria / Materiali / Sezioni / Connessioni / Carichi)

Ogni card hub è una composizione di queste classi:

```tsx
<button
  type="button"
  onClick={onOpenDrillIn}
  className="
    relative bg-bg-panel border border-border p-4 pt-5
    flex flex-col items-start gap-2 min-h-[120px] text-left
    hover:border-accent hover:bg-bg-hover transition-colors duration-fast
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
    focus-visible:ring-offset-2 focus-visible:ring-offset-bg
  "
  data-testid={\`make-hub-\${id}\`}
>
  {/* Axis tag in top-left — pattern Dashboard "/ Studio Pro" */}
  <span className="absolute top-0 left-0 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide-2 font-semibold bg-bg text-ink-3">
    / Make · {category}
  </span>

  <Icon className="w-5 h-5 text-accent mt-3" strokeWidth={1.8} aria-hidden="true" />

  <h3 className="font-display text-lg font-semibold tracking-tight-2 text-ink leading-tight mt-1">
    {title}
  </h3>

  <p className="text-md text-ink-2 leading-relaxed">{description}</p>

  {/* Meta — counts + last update */}
  {meta && (
    <div className="mt-auto pt-2 font-mono text-[10px] uppercase tracking-wide-3 text-ink-3">
      {meta}
    </div>
  )}

  {/* Subtle arrow — appare on hover */}
  <ArrowRight
    className="absolute bottom-3 right-3 w-3.5 h-3.5 text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
    strokeWidth={2}
    aria-hidden="true"
  />
</button>
```

## Layout grid

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
  {hubs.map((h) => <MakeHubCard key={h.id} {...h} />)}
</div>
```

A md (1024+): 3 colonne. Sotto: 2 colonne. Mobile (<sm): 1 colonna (rare nel
desktop workspace, ma il MakePanel viene mostrato in `<MobilePanel>`).

## Animazioni

- **Hover**: `transition-colors duration-fast` su `border-color` e `bg`. Non
  scale, non translate (le card sharp non "saltano").
- **Mount panel**: il MakePanel quando si apre slide-in da sinistra con
  `animate-slide-right` (220ms ease-decelerate). È gestito dal
  `WorkspaceLayout` con classe sul `leftPanel` slot.
- **Drill-in (click su una card)**: niente animazione del panel intero,
  ma il `<PanelChrome>` interno fa fade-in del breadcrumb e del nuovo
  contenuto.

## Cosa NON fare

- Niente shadow-md o shadow-lg sulle card — solo hairline borders.
- Niente rounded — radius 0.
- Niente gradient sul background.
- Niente axis-tag con colore diverso fra gli hub (in Precision sono tutti
  cyan accent — la distinzione è data dal numero/categoria, non dal tono).

## Reference

- `screens/B2-studio-pro-make-hub.html` (handoff Claude Design originale)
- `src/components/shell/Dashboard.tsx` — vedi pattern axis-tag e hub card
