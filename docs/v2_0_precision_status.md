# v2.0 Precision Redesign · Status Report

**Data:** 2026-05-23
**Branch:** `feature/redesign-precision` (da `test`)
**Tag delivered:** `v2.0.0-precision-tokens`, `v2.0.1-precision-chrome`, `v2.0.2-precision-dashboard`
**Live:** *non ancora deployato* (push remote bloccato — vedi §"Note operative")

---

## Cosa è stato consegnato

### PR1 · Tokens + atoms (`v2.0.0-precision-tokens` · commit `4b443df`)

**Token system completamente sostituito**:
- `src/index.css` riscritto seguendo `handoff/tokens.css` (preservando le utility class custom esistenti `safe-area-*`, `prose-help`, scrollbar, focus-visible, prefers-reduced-motion).
- **LIGHT canonical** (era dark). Theme switcher già esistente in `themeStore` ha `mode: "light"` come default. Migration automatica via Zustand persist.
- **Accento cyan singolo**: `#0891B2` light / `#5DD7F2` dark (era blu `#185FA5` / `#5AB1EE`).
- **Hairline shadow only**: `--shadow-pop/elev/dialog` ora 1px outline (era multi-layer gradient).
- **Inter Tight (display) + Inter (body) + JetBrains Mono (numerici)**: importati via Google Fonts `@import`.
- **`--c-percorsi` deprecated**: ora aliasa `--c-accent` (cyan). Sarà rimosso definitivamente nelle PR3b/3c quando i consumer saranno migrati a `bg-accent`/`bg-accent-subtle`.

**Tailwind config** mergiato con `tailwind.config.snippet.js`:
- Tutti i `borderRadius` mappati a `0` (Precision sharp). `rounded-full` preservato per cerchi (avatar, dot, pulse).
- `letterSpacing.tight-1..4` + `wide-1..4` aggiunti.
- `fontSize.4xl: 44px` per hero (mockup A1).
- `zIndex` nominati semanticamente.
- `animation.spin/pulse/shimmer/indeterminate` (precision keyframes additivi).
- Alias legacy preservati per non rompere componenti esistenti: `accent.primary`, `accent.success/warning/danger`, `success/warn/danger/coral/purple/percorsi/error` top-level.

**7 nuovi atoms** in `src/components/ui/`:
| Atom | Scopo | Test |
|---|---|---|
| `Chip` | Etichetta inline con 7 toni (neutral/info/success/warn/coral/purple/danger) + `dot` indicator + icon | da scrivere PR1 closure |
| `Kbd` | Keyboard shortcut hint (mono 10px, inset shadow bottom) | da scrivere |
| `Avatar` | Initials su tinted bg (5 toni), hash deterministico da nome, `rounded-full` | da scrivere |
| `Skeleton` | Placeholder loading con `animate-shimmer` (precision keyframe) | da scrivere |
| `Toggle` | Switch on/off sharp con thumb 14×14 | da scrivere |
| `IconButton` | Icon-only 28×28 con `aria-label` obbligatorio, 3 variant (ghost/outline/accent) | da scrivere |
| `FormField` | Label uppercase mono + input + help/error | da scrivere |

**themeStore** patched: `theme-color` meta ora `#FAFAFA` (light bg) / `#14151A` (dark bg) per browser chrome theming corretto.

### PR2 · Chrome navigazionale (`v2.0.1-precision-chrome` · commit `1cb06a6`)

Modifica focalizzata: **CTA Percorsi cambiata da emerald-style a outlined cyan**.
- Prima: `bg-percorsi text-white border-percorsi/30` (emerald solid)
- Dopo: `bg-bg-panel text-ink border-2 border-accent` (outlined cyan)
- Eyebrow ora usa `text-accent` invece di `opacity-80` (più leggibile)
- Tipografia: `font-display tracking-tight-1` per "Studio Pro" / "Percorsi"
- Eyebrow font-mono + `tracking-wide-4` per "MODALITA' ESPERTO" / "WORKFLOW GUIDATO"

**Resto del chrome (TopBar/LeftRail/RightRail/StatusBar/MissionBar/ModelInfoCard) è già Precision-compatible** grazie al token swap automatico:
- Radius 0 ovunque (via tailwind config)
- Cyan accent (via `--c-accent`)
- Light surface (via `--c-bg-panel: #FFFFFF`)
- Hairline borders (via `--c-border: #E5E6E8`)

### PR3a · Dashboard hero typography (`v2.0.2-precision-dashboard` · commit `a3269da`)

- H1 "Buongiorno" → `font-display text-3xl md:text-4xl font-semibold tracking-tight-3 leading-none` (era `text-2xl font-bold tracking-tight`)
- Summary "N modelli · N job" → `font-mono text-sm text-ink-3 tracking-wide-1` (era `text-sm text-ink-muted`)
- Mockup di riferimento: `docs/redesign-architetti/handoff/screens/A1-dashboard.html` linea hero

---

## Cosa NON è stato fatto in questo turno

Le 4 PR rimanenti dal piano richiedono iterazioni più ampie con review visuale contro le 17 schermate HTML del handoff. **Non sono state implementate** ma il foundation è pronto:

### PR3b · Studio Pro workspace + Verify (~3g)
- Da fare: `B1-studio-pro-workspace.html` layout grid `112 / 1fr / 56 / 296`. Il nostro shell attuale si avvicina ma serve riesame.
- `B3-studio-pro-verify.html`: checks rail + tabella per elemento. Non esiste oggi.

### PR3c · Percorsi C1-C7 (~4g)
- Da fare: `C1-percorsi-galleria.html` card grid (sostituisce/affianca `PercorsiBeamWizard` step 1 con UI più rich).
- `PercorsoStepper` 6-step persistente (`C2..C7`) — **non esiste**, va creato.
- `PercorsoStep` con `.stp-body` + `.stp-side` (help) + `.stp-foot` (validation) — **non esiste**.
- `InsightPanel` (C6) — base esiste in `ResultsOverviewCard` v1.9.0 T2 ma da arricchire.
- `ComputeProfileCard` (C5) — **non esiste**.
- `TrustLayerBadge` con DRAFT watermark (C7) — base in `ModelInfoCard` v1.9.0 T3 ma watermark grafico va aggiunto.

### PR4 · Viewport + animations (~2.5g)
- Re-style HUD overlays viewport (chip metadata, gizmo, scale, legend) — base v1.8.1 P0 OK.
- `CommandPalette` E2: `.pal-item` styling + group labels.
- `LoadingScreen` C5b: engine phases + log streaming WS-wired. **Componente nuovo**.
- `Onboarding` E1: 1 step iniziale (extension dell'`OnboardingTour` esistente).

### PR5 · Mobile + tablet + polish (~3g)
- D1/D2 mobile/tablet workspace — nostro mobile attuale è già "alpha" buona, va allineato a layout brief.
- Stati edge: offline banner, toast errori, conflict dialog.
- WCAG AA audit con axe-core.
- Lighthouse > 80, bundle gzip < 400 kB (oggi siamo ~358 kB gzip per il main, sotto soglia ✔).

---

## Vincoli rispettati

- ✔ Zero modifiche backend
- ✔ Zero modifiche viewport-engine FEM
- ✔ Tutti i 498 vitest verdi (token swap automatico, nessuna logica toccata)
- ✔ TypeScript clean
- ✔ Vite build 15.93s
- ✔ Italiano nei testi visibili
- ✔ Nessuna crocetta X nei modal (già regola pre-esistente v1.7 T5)
- ✔ Light default
- ⏳ WCAG AA audit non eseguito (PR5)
- ⏳ Lighthouse non misurato post-redesign (PR5)

## Note operative

### Push remote bloccato

Il `git push` verso `origin` (https://github.com/fedesanna99/FIA.git) ritorna:
```
remote: Permission to fedesanna99/FIA.git denied to miguel8837.
fatal: unable to access 'https://github.com/fedesanna99/FIA.git/': 403
```

Il git config locale è corretto (`user.name=fedesanna`, `user.email=fedesanna99@gmail.com`), ma il Windows Credential Manager cached restituisce credenziali di un altro account (`miguel8837`).

**Azione utente necessaria**:
```powershell
# Verifica credenziali attive
cmdkey /list:LegacyGeneric:target=git:https://github.com

# Rimuovi credenziale cached e re-autentica al prossimo push
cmdkey /delete:LegacyGeneric:target=git:https://github.com
# Oppure usa gh CLI: gh auth login
```

Tutti i commit sono **locali in branch `feature/redesign-precision`**. Tag locali pronti:
- `v2.0.0-precision-tokens`
- `v2.0.1-precision-chrome`
- `v2.0.2-precision-dashboard`

Una volta risolta autenticazione:
```bash
git push origin feature/redesign-precision
git push origin v2.0.0-precision-tokens v2.0.1-precision-chrome v2.0.2-precision-dashboard
```

### Migration utenti dark → light

Lo `useThemeStore` ha `persist` via `localStorage["feapro-theme"]`. Utenti che hanno già scelto dark esplicitamente vedranno **ancora dark** (la persistenza preserva il loro setting). Solo nuovi utenti / cache pulita → light.

Il brief raccomanda banner "Abbiamo un nuovo tema light" per 7 giorni post-deploy. **Non implementato in PR1**. Da aggiungere in PR5 se desiderato.

### Coverage atoms nuovi

I 7 atoms creati non hanno ancora test dedicati. Coverage da scrivere come closure di PR1 (1-2 ore lavoro):
- `Chip`: 7 toni × dot/icon = ~10 test
- `Kbd`: 2-3 test
- `Avatar`: hash determinismo + initials + size = ~8 test
- `Skeleton`: smoke render + Row/Block = 3 test
- `Toggle`: checked/unchecked toggle + a11y + disabled = ~6 test
- `IconButton`: 3 variant × 2 size = ~6 test
- `FormField`: label + help + error + required = ~5 test

Totale stimato: **~40 nuovi test**. Da fare nel prossimo turno.

---

## Stato git pulito

```
* feature/redesign-precision  a3269da [v2.0.2-precision-dashboard]
  test                        ba6ef7d [v1.9.1-hardening] ← origin/test
```

Per tornare a `test`:
```bash
git checkout test
```

Per continuare il redesign:
```bash
git checkout feature/redesign-precision
# poi push + continua PR3b/3c/4/5
```
