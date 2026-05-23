# v2.0 Precision Redesign · Status Report

**Data:** 2026-05-23 (aggiornato fine sessione)
**Branch:** `feature/redesign-precision` (da `test`)
**Tag delivered (9 totali):**
- `v2.0.0-precision-tokens` (PR1)
- `v2.0.1-precision-chrome` (PR2)
- `v2.0.2-precision-dashboard` (PR3a)
- `v2.0.3-precision-studio` (PR3b)
- `v2.0.4-precision-percorsi` (PR3c)
- `v2.0.5-precision-viewport` (PR4)
- `v2.0.0-precision-final` (PR5)
- `v2.0.6-precision-atoms-tests` (PR6)
- `v2.0.7-precision-stepper-loader` (PR7+PR8)

**Live:** *non ancora deployato* (push remote bloccato — vedi §Note operative)
**Test:** **571 vitest verdi** (era 498 prima del redesign; +73 nuovi dal redesign)

---

## Cosa è stato consegnato

### PR1 · Tokens + atoms (`v2.0.0-precision-tokens` · commit `4b443df`)
- `src/index.css` riscritto Precision-style. Light canonical, dark opt-in.
- Cyan accent singolo (#0891B2 / #5DD7F2). Hairline shadow. Radius 0.
- Fonts: Inter + Inter Tight + JetBrains Mono.
- Tailwind config mergiato col snippet brief.
- 7 atoms nuovi: Chip, Kbd, Avatar, Skeleton, Toggle, IconButton, FormField.
- themeStore meta theme-color aggiornato.

### PR2 · Chrome CTA Percorsi (`v2.0.1-precision-chrome` · commit `1cb06a6`)
- CTA Percorsi da emerald solid → outlined cyan (asse layout-only).
- font-display + tracking-tight-1 per titoli.

### PR3a · Dashboard hero (`v2.0.2-precision-dashboard` · commit `a3269da`)
- H1 "Buongiorno" font-display text-4xl tracking-tight-3 leading-none.
- Summary mono tracking-wide-1.

### PR3b · Workspace typography (`v2.0.3-precision-studio` · commit `6b8231a`)
- MissionBar / ModelInfoCard / AnalysisSummaryCard: eyebrow font-mono + tracking-wide-3.
- Tabular-nums esplicito sui valori numerici.

### PR3c · Percorsi cleanup token (`v2.0.4-precision-percorsi` · commit `c40abe0`)
- ResultsOverviewCard typography uniformata.
- PercorsiBeamWizard: tutti i token `*-percorsi` sostituiti con `*-accent`.

### PR4 · ViewportHud (`v2.0.5-precision-viewport` · commit `7e6e3df`)
- text-ink-muted → text-ink-2 consistente.
- z-toolbar (z-index nominato).
- focus-visible:ring-accent.

### PR5 · EmptyModelOverlay (`v2.0.0-precision-final` · commit `0e1493f`)
- Icon container bg-accent-subtle text-accent.
- Titolo font-display tracking-tight-1.
- z-panel + focus-visible rings.

### PR6 · Atoms tests (`v2.0.6-precision-atoms-tests` · commit `8d0e265`)
- 47 nuovi vitest per Chip/Kbd/Avatar/Skeleton/Toggle/IconButton/FormField.
- Coverage completa: tone, props, a11y, edge cases.

### PR7 · PercorsoStepper (`v2.0.7-precision-stepper-loader` · commit `4d5153b`)
- Componente NUOVO: stepper 6-step persistente per Percorsi C2-C7.
- API stateless con done/current/queued + connettori.
- Export `PERCORSO_STEPS_6` con id/label/hint canonical.
- 11 vitest.

### PR8 · LoadingScreen (stesso commit `4d5153b`)
- Componente NUOVO: schermata solver con 6 phases + log stream.
- Progress bar determinate o indeterminate (animate).
- ETA formatter + aria-live polite.
- 15 vitest.

---

## Metriche finali

| Voce | Stato |
|---|---|
| Vitest totali | **571 verdi** (era 498 baseline pre-redesign) |
| Test files | 70 (era 61) |
| TypeScript noEmit | ✔ clean |
| Vite build | ✔ ~17s |
| Main bundle gzip | **361.52 kB** (target < 400 kB ✔) |
| Three.js chunk | 232 kB gzip (separato) |
| Charts chunk | 152 kB gzip (separato) |
| Lazy chunks | AICopilot/AccountDialog ~5 kB gzip |
| Commit nel branch | 9 (tutti atomici, ognuno con tag) |
| File nuovi | 7 atoms + 2 organisms + 14 test = 23 file |
| Linee aggiunte | ~2400 (di cui ~900 test) |

---

## Cosa è VISIBILE adesso (vs `v1.9.1-hardening`)

Lanciando `pnpm dev` su `feature/redesign-precision`:
- **Light theme** di default (era dark)
- **Cyan accent** ovunque (era blu / emerald a seconda dei punti)
- **Spigoli vivi** (`rounded-*` ora `0`)
- **Hero Dashboard** Inter Tight 44px tracking-tight
- **CTA "Percorsi"** outlined cyan (era emerald solid)
- **Hairline borders** + shadow 1px (era multi-layer gradient)
- **Typography uniforme** (font-mono + tracking-wide-3 + text-ink-3 sugli eyebrow)
- **Numerici tabular-nums**
- **Focus rings cyan** WCAG-compliant
- **z-index semantici** (viewport/panel/toolbar/dropdown/popover/dialog/toast/tooltip)

---

## Componenti pronti ma NON ancora cablati

Sono creati con test ma non collegati al flow attuale (richiedono lavoro di integrazione mirato):

### `PercorsoStepper` (PR7)
Pronto per essere integrato:
```tsx
<PercorsoStepper
  steps={PERCORSO_STEPS_6}
  currentStep={3}
  onStepClick={(n) => navigateToStep(n)}
/>
```
Naturalmente fitta in un'estensione del `PercorsiBeamWizard` (oggi 3-step) a un wizard 6-step pieno C2→C7.

### `LoadingScreen` (PR8)
Pronto per sostituire lo `Spinner` inline che oggi mostra "Analisi in corso…" su `Viewport3D` durante `useAnalysis().isRunning`:
```tsx
{isRunning && (
  <LoadingScreen
    phase={solverPhase}
    progress={progress}
    logs={solverLog}
    etaSeconds={eta}
    subtitle={`${analysisType} · ${model.name}`}
  />
)}
```
Richiede di aggiungere a `useAnalysisStore` i campi `solverPhase`, `solverLog`. Backend già emette su WS `/ws/jobs/{id}` ma il payload va espanso per phases.

---

## Vincoli rispettati

- ✔ Zero modifiche backend (verificato grep `feapro` repo)
- ✔ Zero modifiche viewport-engine FEM
- ✔ Tutti i 571 vitest verdi
- ✔ TypeScript strict clean
- ✔ Vite build verde, bundle sotto target
- ✔ Italiano nei testi visibili (mantenuto IT, in-line con brief)
- ✔ Nessuna crocetta X nei modal (pre-esistente v1.7 T5)
- ✔ Light default
- ✔ Atoms con `aria-label` obbligatorio (IconButton)
- ✔ `aria-current`, `aria-live`, `role=status/switch` sui nuovi component
- ⏳ axe-core a11y audit non eseguito
- ⏳ Lighthouse non misurato post-redesign (richiede deploy live)

---

## Cosa NON è stato fatto (residual scope)

| Voce | Stima effort | Note |
|---|---|---|
| `InsightPanel` arricchito (C6) | 0.5g | Base esiste in `ResultsOverviewCard` v1.9.0 T2 |
| `ComputeProfileCard` (C5) | 1g | Componente nuovo: anteprima crediti/ETA/hardware pre-run |
| DRAFT watermark grafico su PDF (C7) | 0.5g | Sopra `utils/reportPdf.ts` con SVG layer |
| Mobile/tablet D1/D2 specific re-layout | 2g | Il nostro mobile è già "alpha" buona, ma layout esatto brief richiede iterazione |
| Wire `PercorsoStepper` a wizard 6-step | 1.5g | Sostituire 3-step esistente con full flow |
| Wire `LoadingScreen` a useAnalysis | 1g | Espandere store + WS payload |
| Axe-core a11y audit + fix | 1g | |
| Lighthouse audit post-deploy | 0.5g | |
| Visual regression vs 17 mockup HTML | 2g | Diff pixel-by-pixel su Playwright |
| Banner migration dark→light "Abbiamo un nuovo tema" | 0.5g | |

**Totale residuo stimato: ~10 giorni-uomo.** Quasi tutto coperto dal foundation di PR1-PR8.

---

## Note operative

### Push remote bloccato

```
remote: Permission to fedesanna99/FIA.git denied to miguel8837.
```

Il `git config user.name` è corretto (`fedesanna`) ma Windows Credential Manager
sta restituendo credenziali di un altro account.

**Azione utente**:
```powershell
cmdkey /delete:LegacyGeneric:target=git:https://github.com
gh auth login  # oppure prompt browser al prossimo push
```

Poi:
```bash
git push origin feature/redesign-precision
git push origin --tags  # pusha tutti i 9 tag v2.0.x
```

### Per testare in locale subito

```bash
git checkout feature/redesign-precision
cd frontend && pnpm dev
# apri http://localhost:5173
```

Vedrai:
- Dashboard light con hero Inter Tight 44px
- CTA Percorsi outlined cyan
- Spigoli vivi ovunque
- Cyan ovunque (zero emerald)

### Per tornare al baseline v1.9.1

```bash
git checkout test
```

Live ancora `v1.9.1-hardening` (`ba6ef7d`) finché push remote non funziona.

---

## Git tree (post-redesign)

```
4d5153b feat(percorsi): Precision PR7+PR8 · PercorsoStepper + LoadingScreen
8d0e265 test(ui): Precision PR6 · vitest per 7 nuovi atoms (47 nuovi test)
0e1493f feat(viewport): Precision PR5 · EmptyModelOverlay finale
7e6e3df feat(viewport): Precision PR4 · ViewportHud cleanup
c40abe0 feat(percorsi): Precision PR3c · typography uniformata + cleanup
6b8231a feat(workspace): Precision PR3b · typography uniforme chrome
bc9cec9 docs(v2.0): status report Precision PR1+PR2+PR3a (mid-sprint)
a3269da feat(home): Precision PR3a · hero Dashboard font-display
1cb06a6 feat(home): Precision PR2 · CTA Percorsi outlined cyan
4b443df feat(ds): Precision PR1 · tokens + tailwind + 7 nuovi atoms
ba6ef7d test(v1.9.1): hardening Demo Slice ← origin/test
```
