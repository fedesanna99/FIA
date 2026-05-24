# FEA Pro · Implementation Guide · Precision v1.9

> Mapping completo dal design Precision al codebase React/TypeScript esistente.
> Questa è la fonte di verità tecnica per Claude Code.

---

## 1 · Setup iniziale

### 1.1 Branch e PR strategy
```bash
git checkout test
git pull
git checkout -b feature/redesign-precision
```

Sviluppa in 5 PR ordinate. Non mergiare la successiva prima di aver
testato visivamente la precedente contro `screens/`.

### 1.2 File da sostituire

| File esistente | Sostituire con | Note |
|---|---|---|
| `src/index.css` (o equivalente) | Contenuto di `handoff/tokens.css` | Cambia anche il bg di default |
| `tailwind.config.js` | Merge con `handoff/tailwind.config.snippet.js` | NON sovrascrivere — fai merge `theme.extend` |
| eventuale `theme.ts` con palette | Tutti i riferimenti a `--c-bg` etc. restano validi (stesso schema RGB triple) | Solo i valori cambiano |

### 1.3 Font

I font Google sono già importati in `tokens.css` (`@import url(...)`).
Se preferisci self-host, scarica Inter / Inter Tight / JetBrains Mono dal
sito di Google Fonts (tutti OFL) e modifica l'@import in @font-face locale.

Performance: aggiungi nel `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

---

## 2 · Mapping token → CSS variables → Tailwind classes

Tutti i token in `tokens.css` sono `--c-*` (RGB triple) + alias `--<name>`.
Tailwind li espone via `theme.extend.colors` (vedi snippet).

### 2.1 Surfaces

| Token CSS | Tailwind | Light hex | Dark hex |
|---|---|---|---|
| `--bg` | `bg-bg` | `#FAFAFA` | `#0B0C0E` |
| `--bg-panel` | `bg-bg-panel` | `#FFFFFF` | `#14151A` |
| `--bg-elevated` | `bg-bg-elevated` | `#FFFFFF` | `#1C1E24` |
| `--bg-hover` | `bg-bg-hover` | `#F4F5F7` | `#1C1E24` |
| `--bg-viewport` | `bg-bg-viewport` | `#F4F5F7` | `#08090B` |
| `--bg-active` | `bg-bg-active` | `#E6F1FB` | `#1A3A5F` |

### 2.2 Ink (testo)

| Token | Tailwind | Light hex | Dark hex | Uso |
|---|---|---|---|---|
| `--ink` | `text-ink` | `#15161A` | `#ECEDF0` | Titoli, testo primario |
| `--ink-2` | `text-ink-2` | `#4A4F57` | `#9CA1AB` | Body secondario, label |
| `--ink-3` | `text-ink-3` | `#7B808A` | `#6B7280` | Hints, placeholder, eyebrow |
| `--ink-4` | `text-ink-4` | `#B0B5BD` | `#4B5260` | Disabled, micro-label |

### 2.3 Accento e semantici

| Token | Tailwind | Light hex | Dark hex |
|---|---|---|---|
| `--accent` | `text-accent` / `bg-accent` | `#0891B2` | `#5DD7F2` |
| `--accent-hover` | `bg-accent-hover` | `#0E7490` | `#88E2F5` |
| `--accent-subtle` | `bg-accent-subtle` | `#ECFEFF` | `#0E2A33` |
| `--success` | `text-success` | `#65A30D` | `#84CC16` |
| `--warn` | `text-warn` | `#B45309` | `#F59E0B` |
| `--danger` | `text-danger` | `#DC2626` | `#F87171` |

**IMPORTANTE**: `accent-on` (testo su accent) è sempre `#FFFFFF` in light,
ma in dark è `#0B0C0E`. In CSS è già gestito via `tokens.css`; in Tailwind
usa `text-white` per light e wrap manuale per dark se serve.

### 2.4 Borders

| Token | Tailwind |
|---|---|
| `--border` | `border-default` (es. `border border-default`) |
| `--border-light` | `border-light` |
| `--border-strong` | `border-strong` |

### 2.5 Tipografia

| Tailwind class | Usato per |
|---|---|
| `font-sans` | Body (Inter) |
| `font-display` | h1, h2, h3, hub-title, page heading (Inter Tight) |
| `font-mono` | Numeri, codice, label tecniche, kbd (JetBrains Mono) |
| `text-base` | Body 13px / 19px lh — baseline UI |
| `text-md` | 14px — testi leggermente più importanti |
| `text-lg` | 16px |
| `text-2xl` | 22px — h2 |
| `text-3xl` | 30px — h1 |
| `text-4xl` | 44px — hero su Dashboard A1 |
| `tracking-tight-2` | `-0.02em` — display headings |
| `tracking-wide-4` | `0.16em` — eyebrow uppercase |

### 2.6 Spacing (4px grid)

| Tailwind | px |
|---|---|
| `p-1` | 4 |
| `p-2` | 8 |
| `p-3` | 12 |
| `p-4` | 16 |
| `p-6` | 24 |
| `p-8` | 32 |

### 2.7 Geometria

- **Tutti i radius sono 0** (sharp). `rounded`, `rounded-md`, `rounded-lg` → 0.
- `rounded-full` resta `9999px` solo per cerchi puri (avatar, dot, pulse).
- **Shadow**: solo `shadow-pop` (1px), `shadow-elev` (1px), `shadow-dialog` (1px).
  Mai usare le shadow default di Tailwind (`shadow-md`, `shadow-xl` ecc).

---

## 3 · Mapping componenti React

> Riferimento: i nomi dei file React assumono la struttura del codebase
> attuale (`src/components/...`). Adatta se la struttura reale differisce.

### 3.1 Atoms

| Componente React | File HTML di riferimento | Classi precision.css | Note |
|---|---|---|---|
| `Button` | qualsiasi screen (vedi `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-run`) | `.btn` + variant | 5 variant + 3 size (`btn-sm`, default, `btn-lg`) + `btn-icon` |
| `IconButton` | TopBar di qualsiasi screen | `.topbar-icon-btn` o `.btn-icon` | 28×28 |
| `Input` | A2 form, C2-C4 form fields | `.input` | `+.numeric` per font-mono |
| `FormField` | C2, C3 | `.field` + `.field-label` + `.field-help` | label uppercase mono |
| `Chip` | viewport HUDs | `.chip` + dot variants | `.chip-dot--success`, `--warn`, `--danger` |
| `Badge` | DRAFT, PRO, BETA | `.badge`, `.badge--ghost`, `.badge--warn`, `.badge--draft` | |
| `Toggle` | C6 view toggles | `.toggle` con stato `.on` | |
| `Kbd` | qualsiasi shortcut | `.kbd` | |
| `Spinner` | C5b | `.spin`, `.spin-lg` | new |
| `Skeleton` | dashboard loading | `.shimmer` | new |
| `Avatar` | TopBar | `.topbar-avatar` | iniziali su tinted bg |

### 3.2 Molecules

| Componente | Riferimento | Classi |
|---|---|---|
| `MetricCard` | A1 credits, C6 UC | `.widget` + `.credits-bar` etc. |
| `Checklist` | A1 Get started, C7 sezioni report | `.checklist`, `.checklist-item` |
| `ListItem` | E2 palette | `.pal-item` |
| `EmptyState` | A2 quando vuota | da costruire da `.qact` + `.section-head` |
| `Tooltip` | hover su rail-items | non disegnato — pattern base "dark panel above" |
| `Toast` | non disegnato — vedi sezione 5 |

### 3.3 Organisms

| Componente | File di riferimento | Note implementative |
|---|---|---|
| `TopBar` | ogni screen | 9-col grid · search center · 28px buttons |
| `LeftRail` | A1, B1, B2, B3 | 112px wide · categorie con `.leftrail-section` |
| `RightRail` | B1, B2, E2 | 56px wide · solo icone, no label |
| `StatusBar` | tutti | 28px height · mono 10px · `flex` |
| `MissionBar` | B1, ws-mission | accent icon left · status chip right |
| `ModelInfoCard` | B1 | `.mic` + `.mic-uc` + `.mic-rows` dl |
| `HubCard` | A1 hubs | `.hub`, `.hub--studio`, `.hub--percorsi` |
| `PanelHub` | B2 (slide-in Make) | `.b2-overlay` · slide-in da sinistra |
| `PercorsoStepper` | C2-C7 | `.stp-bar.stp-6` (6-step) · `is-done`, `is-current`, `is-todo` |
| `PercorsoStep` | C2-C5 | `.stp-body` grid + `.stp-side` help + `.stp-foot` validation |
| `InsightPanel` | C6 | `.ins-card` con border-left danger |
| `ComputeProfileCard` | C5 | `.cp`, `.cp.is-selected` |
| `TrustLayerBadge` | C7 | warning banner + DRAFT watermark SVG/CSS |
| `CommandPalette` | E2 | `.pal`, `.pal-item`, group labels |
| `Viewport3D` | B1, C6 | wireframe SVG → da sostituire con Three.js esistente — mantieni `.vp-grid`, `.vp-gizmo`, `.vp-scale`, `.vp-legend` overlay |
| `LoadingScreen` | C5b | engine fasi + log streaming · vedi sezione 6 |
| `Onboarding` | E1 | overlay con spotlight + tour card |

### 3.4 Templates

| Layout | Riferimento | CSS Grid |
|---|---|---|
| `AppShell` | A1, A2 | `.app` grid 112px / 1fr · 52px / 1fr / 28px |
| `WorkspaceShell` | B1, B2, B3 | `.app-workspace` grid 112 / 1fr / 56 / 296 |
| `ModalLayout` | E2, dialog | `.dialog-overlay` + `.dialog` |

---

## 4 · Suddivisione in PR

### PR 1 · Tokens & atoms · 2.5 giorni

**Scope**
- Sostituisci `src/index.css` con `tokens.css`
- Mergia `tailwind.config.snippet.js` in `tailwind.config.js`
- Rifai 8 atoms: `Button`, `IconButton`, `Input`, `FormField`, `Chip`,
  `Badge`, `Toggle`, `Kbd`
- Aggiungi 3 atoms nuovi: `Spinner`, `Skeleton`, `Avatar`
- Aggiungi keyframes Precision (`spin`, `pulse`, `shimmer`, `indeterminate`)

**Test**
- Storybook (se presente) → aggiorna stati
- Visual diff: confronta con sezione "Atoms" in `screens/A1-dashboard.html` e B1

**Deliverable di PR**
- Commit message: "feat(ds): token system + atoms (Precision v1.9)"
- README breve di cosa è cambiato

### PR 2 · Chrome navigazionale · 3 giorni

**Scope**
- `TopBar`, `LeftRail`, `RightRail`, `StatusBar`, `MissionBar`, `ModelInfoCard`
- Layout `AppShell` e `WorkspaceShell`
- Theme switcher (light/dark) wired a `data-theme` su `<html>`, persistito in localStorage

**Test**
- Verifica responsive: layout regge tra 1280 e 1920 px

### PR 3 · Schermate principali · 5 giorni

**Scope** (in quest'ordine):
1. **A1 Dashboard** — hero hubs, quick actions, recenti, side rail con Credits/Tips
2. **A2 Modelli** — tabella con sort/filter
3. **B1 Studio Pro workspace** — workspace assemblato con viewport SVG (Three.js viene in PR4)
4. **B3 Verify** — checks rail + tabella per elemento
5. **C1 Galleria Percorsi** — card grid
6. **C2-C5 Percorso steps** — stepper persistente, form per step
7. **C6 Critical View** — viewport + insight panel
8. **C7 Report** — PDF preview + Trust Layer

**Test**
- Visual diff per ogni schermata
- vitest snapshot da aggiornare
- E2E happy path: A1 → C1 → C2 → ... → C7

### PR 4 · Viewport 3D + animazioni · 3 giorni

**Scope**
- Wire Three.js esistente nel `.vp` container · mantieni HUD overlays come SVG/HTML
- `CommandPalette` E2 con fuzzy search wired (può usare `cmdk` se già presente)
- `LoadingScreen` C5b · vedi sezione 6
- `Onboarding` E1 (1 step, gli altri 7 da pianificare in sprint successivo)
- Tutte le micro-animazioni (rail-item hover, panel slide-in, ⌘K entrance)

### PR 5 · Mobile/tablet + polish · 3.5 giorni

**Scope**
- Breakpoints: `md:` tablet (768-1024), `<md` mobile
- D1 Mobile workspace · bottom tabbar
- D2 Tablet workspace · LeftRail compatta 56px
- Stati edge non ancora disegnati: offline banner, toast errori, conflict dialog, sync indicator (in StatusBar)
- WCAG AA audit (axe-core)
- Lighthouse > 80 (main chunk gzip < 400 kB)

**Totale: ~17 giorni-uomo · ~3.5 settimane di un engineer full-time**

---

## 5 · Componenti NON disegnati ma necessari

Alcuni pattern non hanno un mockup dedicato. Usa questi pattern derivati:

### 5.1 Toast notification

```html
<div class="fixed bottom-6 right-6 z-toast bg-bg-elevated border border-light shadow-pop p-3 max-w-sm">
  <div class="flex gap-2 items-start">
    <span class="chip-dot chip-dot--success mt-1"></span>
    <div>
      <div class="text-base font-medium">Salvataggio riuscito</div>
      <div class="font-mono text-xs text-ink-3 mt-1">v3 · 30s fa</div>
    </div>
  </div>
</div>
```

### 5.2 Offline banner (in StatusBar)

```html
<span class="text-warn font-mono text-xs">
  <span class="chip-dot chip-dot--warn"></span> Offline — modifiche salvate localmente
</span>
```

### 5.3 Tooltip

```html
<div class="absolute bg-ink text-bg px-2 py-1 font-mono text-xs whitespace-nowrap z-tooltip">
  Aggiungi nodo · N
</div>
```

### 5.4 Dropdown menu

Stesso pattern di `.pal` ma più piccolo (220-280px), aperto inline al posto di centrato.

---

## 6 · Loading screen C5b — implementazione tecnica

`screens/C5b-percorso-running.html` ha l'animazione vanilla JS.
Per integrarla in React:

```tsx
function LoadingScreen({ solverState }: { solverState: SolverPhase }) {
  // solverState arriva dal WebSocket reale del backend
  const phases = ['validation', 'discretization', 'assembly', 'factorization', 'solve', 'postprocess'];
  const phaseIdx = phases.indexOf(solverState.phase);
  // ... render usando le classi .phase, .progress, .term del precision.css
}
```

**Importante**: il log stream non è decorativo — collega allo stdout reale
del solver via WebSocket. È un differenziatore tecnico onesto, fa parte
del valore di prodotto "Algoritmo > AI".

---

## 7 · Considerazioni accessibilità

- **Focus ring**: ogni button/input ha `:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px }`
- **Contrast**: light theme verificato WCAG AA · dark theme ink-3 su bg-panel = 4.6:1 (passa AA per testo normale)
- **Keyboard nav**: ⌘K palette è già keyboard-first · LeftRail va naviga con Tab + frecce
- **prefers-reduced-motion**: tutte le animazioni in `precision.css` (`spin`, `pulse`, `shimmer`) vanno wrappate in `@media (prefers-reduced-motion: reduce) { animation: none !important }` — da aggiungere a `precision.css` se non già fatto

---

## 8 · Performance

| Metrica | Target | Note |
|---|---|---|
| Main chunk gzip | < 400 kB | Vite tree-shake è già aggressivo |
| FCP | < 1.5s | Critical CSS inlinato per Dashboard A1 |
| LCP | < 2.5s | LCP element è il `h1` del hero — preload font Inter Tight |
| CLS | < 0.05 | Reserve space per font swap |
| Lighthouse perf | > 80 | viewport 3D Three.js è il rischio principale — lazy load |

Lazy-load Three.js solo quando l'utente apre Studio Pro workspace.
Dashboard A1 e C1 galleria non lo caricano.
