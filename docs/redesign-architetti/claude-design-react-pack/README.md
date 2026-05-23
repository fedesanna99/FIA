# FEA Pro · React Pack · Precision v2.0

> 6 organisms TSX + 3 docs ready to drop into the existing codebase.
> Generated da Claude Design su prompt reverse-direction di Claude Code.

## Struttura

```
react-pack/
├── shell/                           ← drop in src/components/shell/
│   ├── ModelsTable.tsx              ← A2 · tabella modelli con sort/filter
│   ├── WorkspaceLayout.tsx          ← B1 · grid wrapper full workspace
│   ├── ChecksRail.tsx               ← B3 · rail laterale verifiche
│   ├── ChecksDetailTable.tsx        ← B3 · tabella per-element del check selezionato
│   ├── PercorsoStep.tsx             ← C2-C7 · template wrapper con PercorsoStepper esistente
│   ├── InsightPanel.tsx             ← C6 + general · card insight border-left tonale
│   └── TrustLayerBadge.tsx          ← C7 · banner / inline / watermark
└── docs/
    ├── b2-make-hub.md               ← guidance ri-stile MakePanel
    ├── d1-d2-responsive.md          ← breakpoint + mobile/tablet specs
    └── e1-e2-animations.md          ← Onboarding + Command Palette motion specs
```

## Convenzioni rispettate

- ✅ Atoms da `../ui` barrel (Chip, Avatar, Button, Input, EmptyState, Spinner)
- ✅ `cn()` da `../ui/cn` per className merge
- ✅ Lucide named imports (no `* as Lucide`)
- ✅ `data-testid` kebab-case (`models-row-{id}`, `check-row-B1`)
- ✅ ARIA labels su buttons, `aria-current` sugli step
- ✅ Tabular-nums via `font-mono` + Tailwind `tabular-nums` per i numeri tecnici
- ✅ TypeScript strict (interface Props locale + readonly su array)
- ✅ Tailwind classes Precision (`bg-bg-panel`, `text-ink-2`, `font-display`,
  `tracking-tight-2`, `shadow-pop`, `border-border`, `z-dialog`)
- ✅ NO shadcn paths, NO `shadow-md`, NO `rounded-lg` legacy
- ✅ Animazioni via classi esistenti (`animate-fade-in`, `animate-slide-up`,
  `animate-slide-down`, `animate-slide-right`, `animate-pulse`,
  `transition-colors duration-fast/mid`)

## Cosa NON ho generato

- **Non ho toccato** `PercorsoStepper.tsx`, `LoadingScreen.tsx`, `Dashboard.tsx`,
  `TopBar.tsx`, `LeftRail.tsx`, `RightRail.tsx`, `MissionBar.tsx`,
  `ModelInfoCard.tsx`, `StatusBar.tsx`, `CommandPalette.tsx`,
  `OnboardingTour.tsx`. Esistono già e vanno ri-stilati on-the-fly (per
  CommandPalette e OnboardingTour vedi i due docs `e1-e2-animations.md`).
- **Non ho creato nuovi atoms**. Tutti i wrapper visivi (chip, avatar, kbd,
  etc.) vengono dagli atoms già in `src/components/ui/`.

## Integrazione

1. Copia il contenuto di `shell/` in `src/components/shell/`.
2. Importa nei consumer:

   ```tsx
   import { ModelsTable, type ModelTableRow } from "./shell/ModelsTable";
   import { WorkspaceLayout } from "./shell/WorkspaceLayout";
   import { ChecksRail, type CheckItem } from "./shell/ChecksRail";
   import { ChecksDetailTable, type CheckRow } from "./shell/ChecksDetailTable";
   import { PercorsoStep } from "./shell/PercorsoStep";
   import { InsightPanel } from "./shell/InsightPanel";
   import { TrustLayerBadge } from "./shell/TrustLayerBadge";
   ```

3. Verifica i test vitest su almeno `ModelsTable` (sort/filter) e
   `PercorsoStep` (validation state).

4. Per i 3 markdown docs: leggili prima di toccare MakePanel /
   CommandPalette / OnboardingTour.

## Animazioni · panoramica

| Componente | Mount | Hover | State change |
|---|---|---|---|
| ModelsTable | nessuna | row `bg-hover` 120ms | sort: re-render istantaneo |
| WorkspaceLayout | nessuna | — | leftPanel `slide-right` 220ms |
| ChecksRail | `fade-in` 120ms | item `bg-hover` 120ms | active border slide-right |
| ChecksDetailTable | `fade-in` 120ms al cambio check | row `bg-hover` | critical row `pulse` 2s al mount |
| PercorsoStep | `fade-in` 120ms al cambio step | — | validation chip `transition-colors` |
| InsightPanel | `slide-up` 220ms | action link underline | items stagger `fade-in` 60ms each |
| TrustLayerBadge banner | `slide-down` 220ms | — | — |
| TrustLayerBadge watermark | `fade-in` lento | — | — |

Tutte rispettano `prefers-reduced-motion` — wrappa in `motion-safe:` dove
necessario nel consumer.

## Domande?

Se trovi:
- un atom mancante che mi aspettavo esistesse → controlla `src/components/ui/index.ts`
- una prop incompatibile con il tuo store reale → adatta il tipo e fammi sapere
- un'animazione che senti pesante → rimuovila localmente, non bloccare la PR

— Claude Design
