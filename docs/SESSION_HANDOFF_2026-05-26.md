# Session handoff · 2026-05-26 · design rebuild Fasi 1-2.5

**Status finale**: tutte le fasi pianificate per la sessione sono **CHIUSE** con quality gate verde e deploy live in produzione.

---

## 0 · Cosa è stato consegnato (recap sessione)

| Fase | Tag | Release Fly | Quality gate | Stato |
|------|-----|-------------|--------------|-------|
| Foundation | `v2.6.1-foundation` | (no deploy) | tsc 0 · vitest 672/672 · build 1273 kB | ✅ |
| Shell rebuild | `v2.6.2-shell` | v86 | tsc 0 · vitest 687/687 · build 1297 kB | ✅ |
| Shell polish | `v2.6.2.1-shell-polish` | v87 | tsc 0 · vitest 695/695 · build 1300 kB | ✅ |
| Mobile quickfix | `v2.6.2.2-mobile-hud-quickfix` | v88 | tsc 0 · vitest 695/695 · build ~1300 kB | ✅ |

**HEAD finale**: `b276421` su `design-rebuild/v2.6` · `test = main = HEAD` ✅

**Deploy live**: https://fea-pro.fly.dev/ release **v88** · health HTTP 200 · image `01KSJ760QJK8YVTX4AV65XQ9XP`

**Verifica live browser eseguita** oggi (2026-05-26):
- Desktop 1568px: nuova Shell completa renderizzata correttamente (TopBar v2.6 + slug TP2 + Rail 5 ws + 6 HUD floating + RightPanel 380 + StatusBar 28 + ⌘K palette)
- Mobile 430×932 via DevTools emulator: fix M1/M2/M3 confermati (chip 1+2 full-width 417px stack verticale, chip 3+4 `w=0 h=0` hidden, MobileTabbar leggibile)

---

## 1 · Cosa funziona in produzione adesso

### Desktop (≥768px)

Quando l'utente ha un modello attivo + non è in focus mode, viene servito il codepath `useNewShell` con:

- **Design Soft v2.1**: Plus Jakarta Sans display + Inter body + JetBrains Mono numeric, cyan singular accent #0891B2, hairline borders + shadow soft, radius 4-20px (no più sharp 0)
- **Layout grid** 48px/1fr/28px × 56px/1fr/380px (TopBar/Mid/StatusBar × Rail/Viewport/Panel)
- **ShellTopBar**: brand + slug semantico + save chip verde + trust badge giallo + ⌘K + Run verde gradient + undo/redo/notif/avatar
- **ShellRail**: 5 workspace (Modello/Analisi/Risultati/Verifiche/I/O) + 3 secondary (Auto-detect/Docs/Settings) con tooltip kbd
- **ShellViewport**: wrapper Canvas R3F + 6 HUD floating (Legend TL, Controls TR, Selection TC, Gizmo BR, Ruler BL, Zoom BC). Chip ViewportHud legacy rimossi (F1 polish)
- **ShellPanel**: header + Radix Tabs + body scroll + workspace content passthrough (Make/Solve/Verify/Inspect/Tools esistenti)
- **ShellStatusBar**: connection + units + snap + solver + zoom + counters live + version
- **ShellCommandPalette**: cmdk + Radix Dialog, legge `paletteItems.ts` registry (~140 voci) via hook condiviso `usePaletteDispatch` (17 action kinds gestiti)

### Mobile (<768px)

Quando `isMobile = true`, il codepath nuova Shell non si attiva (by design Fase 2). Si usa il **chrome legacy** (TopBar + MissionBar + MobileTabbar + MobilePanel + MobileMoreMenu) **con i fix CSS responsive applicati ai 2 componenti rotti**:

- **ViewportHud** (M1+M2): `flex-col sm:flex-row` su <sm, chip 1+2 full-width + truncate, chip 3 (preset) + chip 4 (Engine) `hidden sm:flex`
- **ViewportCanvasTabs** (M3): `overflow-x-auto` + `text-[10px] sm:text-[11px]` + counters `hidden sm:flex`

### Pipeline UX v2.5.0 preservata

- `lib/preconditions.ts` (16 features, DEC-A4) ✅
- `FeatureButton` wrapper (Run-static + 4 toggle View) ✅
- `toastApiError` con mapping IT 11 error kinds ✅
- `ScaleIndicator` dinamico via `viewportCameraStore.metersPerScreenHeight` (8 break) ✅
- `EmptyState` propose-action pattern ✅
- Undo/redo via `useModelHistory` ✅
- Quickexport DI module (PDF/XLSX) ✅
- Auth gate obbligatorio al boot ✅

### Backend

Zero modifiche dal v2.5.0-paolo-ready:
- pytest 1677 collected (baseline 1669 + 8 nuovi dalle fasi UX)
- 9 modelli demo (`ex_simple_beam_2d`, `ex_portal_frame_2d`, ecc.)
- `/api/health` HTTP 200, `{"status":"ok","version":"1.0.0"}`
- Fly.io single-machine `d8d2949c042208`, region `fra`, image 387 MB

---

## 2 · Cosa NON è stato fatto (debt aperto)

### Tier 1 — Pre-Paolo (rischio basso, valore alto)

| Item | Stima | Motivazione |
|------|-------|-------------|
| Sessione Paolo (validation utente reale) | 30-60 min | Tutto il lavoro Fase 1+2+2.5 ha come obiettivo questo |
| Smoke E2E mobile webkit reale | 15 min | Oggi solo chromium emulato (393×852); installare webkit Playwright + run smoke |

### Tier 2 — Post-Paolo high-impact (rischio medio, valore alto)

| Item | Stima | Cosa |
|------|-------|------|
| **Fase 3 desktop · Workspace content refactor** | 3-4h | Sostituire i workspace content interni (Make/Solve/Verify/Inspect/Tools) con design Soft v2.1: metric tiles, UR-strip (EC3), inspector card, snap-row, display-list, slider (vedi mockup `Nuovo Guscio.html` § content panel) |
| **Strada A · Mobile rebuild dentro nuova Shell** | 3-4h | Rimuovere `!isMobile` da `useNewShell` condition, adattare ShellTopBar/ShellRail/ShellPanel/ShellStatusBar per layout ≤md responsive, integrare MobileTabbar come "expanded bottom nav" della nuova Shell. Sostituire MobileTabbar/MobilePanel/MobileMoreMenu legacy |

### Tier 3 — Tech debt cleanup (rischio basso, valore manutentivo)

| Item | Stima | Cosa |
|------|-------|------|
| **DEC-A1 workspace store cleanup** | 1-2h | Rimuovere bridge legacy `workspace`/`activeTab` in `workspaceStore.ts` (promesso alpha.27, ancora pending). Single source of truth `currentLeftPanel`/`currentRightPanel` |
| **Migration legacy CommandPalette → usePaletteDispatch** | 1-2h | Eliminare dispatcher duplicato in `components/shell/CommandPalette.tsx`. Mantenere un solo source of truth (hook condiviso v2.6.2.1) |
| **Migration `Button` → `Button2`** | 2-3h | 50+ callsite da migrare (atomico). Rimuovere `Button` Precision dopo. Permette di rimuovere anche `border-radius: 0` legacy |
| **Rimozione Inter Tight font** | 15 min | Dopo migration display callsite. Riduce 1 risorsa Google Fonts caricata inutilmente |
| **30 caller Categoria B error handling** | 2h | Migrazione a `toastApiError()` (oggi alcuni catch ancora con `toast("error", e.message)` raw) |
| **MakePanel hub→azioni refactor** | 1h | Da `v2.5.9` debt aperto, mai chiuso |

### Tier 4 — Nice-to-have (rischio variabile, valore feature)

| Item | Stima | Cosa |
|------|-------|------|
| **Dark mode UI toggle** | 30 min | `useTheme()` già wired in App.tsx, manca solo il toggle in Avatar menu della ShellTopBar |
| **Avatar menu reale** | 1h | Oggi `[FS]` placeholder. Implementare dropdown con account, theme toggle, logout, billing |
| **TrustBadge logic reale** | 2h | Oggi statico "Preliminary". Mapping preliminary/draft/validated → HelpSheet completa |
| **GizmoHelper drei in `.vp-gizmo`** | 30 min | Oggi placeholder SVG nuovo. Spostare il GizmoHelper R3F drei in bottom-right (richiede modifica `Viewport3D.tsx`) |
| **Voci dinamiche `goto-node`/`goto-element`** nella nuova palette | 1h | Oggi solo nel legacy via `useNavigationCommands`. Estendere `usePaletteDispatch` |
| **Touch gestures viewport mobile** | 2h | Pinch zoom 2-finger, two-finger pan, tap-and-hold per inspector |
| **Mobile landscape orientation** | 1h | Oggi 393×852 portrait OK; landscape 852×393 mai testato |

---

## 3 · Decisioni architetturali tracciate

| ID | Decisione | Stato |
|----|-----------|-------|
| **DEC-A1** | Cleanup workspace legacy (workspaceStore bridge) | ⏳ Pending — Tier 3 cleanup |
| **DEC-A4** | Preconditions registry centrale + FeatureButton | ✅ Implementato (v2.5.6 + v2.5.7) |
| (implicito) | `useNewShell` desktop-only by design | ⏳ Convergenza mobile = Strada A |

---

## 4 · Conoscenze utili per il prossimo brief

### Files key del design system (Soft v2.1)

- `frontend/src/styles/tokens.css` (220 righe) — CSS variables: surface 5 livelli, ink 4 livelli, border 3 strengths, accent cyan + 5 stati semantici, radius 4-20px, motion 120/200/360ms, fonts, type scale, spacing, z-index
- `frontend/src/styles/shell.css` (996 righe) — adattamento da `nuovo-guscio.css` mockup, classes `.shell-*`, `.tb-*`, `.rail-*`, `.vp-*`, `.sp-*`, `.sb-*`, `.cmd-*`
- `frontend/src/shell/` — 14 componenti shell nuovi (Shell + 6 sub + 6 HUD + types)

### Files key della pipeline UX preservata

- `frontend/src/lib/preconditions.ts` (229 righe) — 16 FeatureId con preconditions IT
- `frontend/src/lib/usePaletteDispatch.ts` (310 righe) — hook dispatcher condiviso (17 action kinds)
- `frontend/src/lib/paletteItems.ts` (421 righe) — registry 144 voci raggruppate per section
- `frontend/src/lib/apiErrors.ts` (201 righe) — `toastApiError()` + 11 mappings IT

### Stores Zustand attivi (24)

`analysisStore`, `authStore`, `billingStore`, `climateStore`, `commentsStore`, `historyStore`, `jobsStore`, `leftRailStore`, `measurementsStore`, `modelStore`, `notificationsStore`, `panelHeaderStore`, `resultsStore`, `rightRailStore`, `selectionStore`, `snapshotStore`, `themeStore`, `toastStore`, `uiStore`, `viewportCameraStore`, `wizardStore`, `workspaceStore`

### Mockup reference

- `design-handoff/ui_kits/webapp_desktop/Nuovo Guscio.html` — scheletro HTML
- `design-handoff/ui_kits/webapp_desktop/nuovo-guscio.css` (992 righe) — stili completi
- `design-handoff/ui_kits/webapp_desktop/nuovo-guscio-{shell,panel,overlays,app,icons}.jsx` — riferimenti JSX

(Tutta la cartella `design-handoff/` è gitignored — vive solo nel worktree)

---

## 5 · Output snapshot per chat PM

Generati in questa sessione e disponibili per il PM (untracked, da incollare):
- `docs/CONTEXT_SNAPSHOT_FOR_PM.md` (662 righe) — snapshot tecnico mirato post v2.6.2.1
- `docs/SESSION_HANDOFF_2026-05-26.md` (questo file) — recap closure sessione

Reports formal committed:
- `docs/v2.6.1-foundation_report.md`
- `docs/v2.6.2-shell-blueprint.md`
- `docs/v2.6.2-shell_report.md`
- `docs/v2.6.2-shell-smoke.md`
- `docs/v2.6.2-shell-deploy_report.md`
- `docs/v2.6.2-shell-smoke_report.md`
- `docs/v2.6.2.1-polish-investigation.md`
- `docs/v2.6.2.1-shell-polish_report.md`
- `docs/v2.6.2.2-mobile-hud-quickfix_report.md`

---

## 6 · Decisione attesa da Federico

Per il prossimo sprint Claude Code, scegliere uno tra:

### Opzione A — Sessione Paolo (Tier 1)
Test di accettazione utente reale sulla produzione v88. Federico siede con Paolo, fa il flow Telaio portale → analisi → Verifiche EC3 → export PDF e annota friction reali. Sprint successivo = backlog post-Paolo.

**Stima**: 30-60 min Federico (no Claude Code)
**Esito**: lista finding ranked per impatto

### Opzione B — Fase 3 desktop · Workspace content refactor (Tier 2)
Sostituire il content interno dei workspace (oggi MakePanel/SolvePanel/VerifyPanel/InspectPanel/ToolsPanel passthrough) con i componenti Soft v2.1 dal mockup:
- Metric tiles (`δ_max`, `σ_max`, `f₁`)
- UR-strip per element con bar fill colored
- Inspector card per nodo/elemento selezionato
- Snap-row per snapshot comparison
- Display-list per layer toggle
- Slider per deformation scale

**Stima**: 3-4h Claude Code
**Tag finale**: `v2.6.3-workspace-content`

### Opzione C — Strada A · Mobile rebuild (Tier 2)
Rimuovere `!isMobile` dal `useNewShell`, adattare la nuova Shell per layout responsive mobile, sostituire MobileTabbar/MobilePanel/MobileMoreMenu legacy con varianti Soft v2.1.

**Stima**: 3-4h Claude Code
**Tag finale**: `v2.6.3-mobile-shell`

### Opzione D — Tier 3 tech debt cleanup
Sprint dedicato (qualunque combinazione):
- DEC-A1 workspace store cleanup (1-2h)
- Migration legacy CommandPalette (1-2h)
- Migration Button → Button2 (2-3h)
- Rimozione Inter Tight (15 min)

**Stima**: 1-7h Claude Code a seconda della selezione
**Tag finale**: `v2.6.3-cleanup-{focus}`

---

## STOP — Attendo brief da Federico

Tutto pushato e taggato. Stato produzione verificato live. Pronto per il prossimo brief.
