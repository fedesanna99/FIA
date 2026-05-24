# S0 · Codebase mapping reale vs nomi attesi dal bundle

**Data**: 2026-05-24
**Sprint**: `v2.5.0-redesign-precision` · Sprint 0 setup
**Branch**: `feature/redesign-precision` (creato in S0.4 da `test` SHA `bd958de`)

> Riferimento "fonte di verità" per i find-and-replace dei sprint successivi.
> Tutti i path sono relativi a `frontend/src/` se non specificato.

---

## 1 · Atoms ui/ (S1 target)

Tutti gli atom previsti dal bundle ESISTONO già. S1 li ridisegna, non li crea.

| Atom previsto dal bundle | File reale nel repo | Note |
|---|---|---|
| `Button.tsx` | `components/ui/Button.tsx` | ✓ presente |
| `IconButton.tsx` | `components/ui/IconButton.tsx` | ✓ presente |
| `Input.tsx` | `components/ui/Input.tsx` | ✓ presente |
| `FormField.tsx` | `components/ui/FormField.tsx` | ✓ presente |
| `Chip.tsx` | `components/ui/Chip.tsx` | ✓ presente |
| `Badge.tsx` | `components/ui/Badge.tsx` | ✓ presente |
| `Toggle.tsx` | `components/ui/Toggle.tsx` | ✓ presente |
| `Kbd.tsx` | `components/ui/Kbd.tsx` | ✓ presente |
| `Spinner.tsx` | `components/ui/Spinner.tsx` | ✓ presente (era "nuovo" nel brief, in realtà già esiste) |
| `Skeleton.tsx` | `components/ui/Skeleton.tsx` | ✓ presente (idem) |
| `Avatar.tsx` | `components/ui/Avatar.tsx` | ✓ presente (idem) |

**Atom aggiuntivi presenti nel repo** (non menzionati dal brief, da preservare):
- `Card.tsx`, `Dialog.tsx`, `DropdownMenu.tsx`, `EmptyState.tsx`, `Tabs.tsx`, `TipBubble.tsx`, `Tooltip.tsx`, `cn.ts`

**Conclusione S1**: solo ridisegno (no creazione nuovi atoms). I 3 "atoms nuovi" del brief (Spinner, Skeleton, Avatar) sono in realtà ridisegno anche loro.

**Barrel**: `components/ui/index.ts` presente.

---

## 2 · CSS centrale + Tailwind

| File previsto bundle | File reale | Azione S1 |
|---|---|---|
| `tokens.css` (handoff) | `frontend/src/index.css` | Sostituisci contenuto con `precision.css` |
| `colors_and_type.css` | `frontend/src/colors_and_type.css` NON esiste come standalone — i tokens sono già in `index.css` | nessuna |
| `tailwind.config.snippet.js` | `frontend/tailwind.config.js` | Merge `theme.extend` |

Il CSS attuale è `frontend/src/index.css` (singolo file). Lì vivono già i `--c-*` triples (RGB) come previsto dal brief — **lo schema è compatibile**, solo i valori cambiano.

---

## 3 · Shell components (S2 target)

| Component bundle | File reale | Note |
|---|---|---|
| `TopBar` | `components/shell/TopBar.tsx` + `components/shell/topbar/{AvatarMenu, AICopilotButton, CollabAvatars, GlobalSearch, ModelMenu}.tsx` | `topbar/` è subfolder dentro `shell/`, non `components/topbar/` |
| `LeftRail` | `components/shell/LeftRail.tsx` + test | ✓ |
| `RightRail` | `components/shell/RightRail.tsx` + test + `RightSlidePanel.tsx` | ✓ |
| `StatusBar` | `components/layout/StatusBar.tsx` + `components/layout/statusbar/{CreditsBadge, WSStatus}.tsx` | path `layout/` non `shell/` |
| `MissionBar` | `components/shell/MissionBar.tsx` + test | ✓ |
| `ModelInfoCard` | `components/shell/ModelInfoCard.tsx` + test | ✓ |
| `AppShell` / `WorkspaceShell` | `components/shell/WorkspaceLayout.tsx` + `WorkspaceHeader.tsx` | bundle parla di "AppShell" generico, il repo usa `WorkspaceLayout` |
| `MobileTabbar` | `components/shell/MobileTabbar.tsx` (riferito da `App.tsx:621`) | ✓ già implementata (visibile in screenshot bug Federico) |

**Sidebar legacy**: `components/layout/Sidebar.tsx` esiste — verificare se ancora usata o legacy da rimuovere/refactorare.

---

## 4 · BUG-V1..V4 — punti di intervento confermati

### BUG-V1 (mobile "Nuovo modello" duplicato)

Stringa "Nuovo modello" appare in **9 punti**:
- `App.tsx:412` (commento Ctrl+N)
- `components/dialogs/NewModelDialog.tsx:20,38` (dialog di creazione — corretto, è il dialog)
- `components/shell/Dashboard.tsx:236` (card su dashboard)
- `components/shell/ModelliBrowser.tsx:147` (browser modelli)
- `components/shell/ModelsTable.tsx:109` (riga tabella)
- `components/shell/topbar/ModelMenu.tsx:101` (dropdown nel topbar — la **prima** occorrenza visibile)
- `components/shell/TopBar.tsx:336` (toast success)

La **pill duplicata** sotto il dropdown è probabilmente in `TopBar.tsx` o `WorkspaceHeader.tsx`. Da verificare in S2 con DOM inspection mobile.

### BUG-V2 (Run button cropped mobile)

`TopBar.tsx` ospita il Run button verde. Verificare `h-14`/`h-16` mobile-only e padding del container.

### BUG-V3 (riga `12 nodi · 2 elem · — CHECKS troncato`)

Pattern "nodi · elem" o "12 nodi" cercato — 18 file matchano. La riga specifica della screenshot è probabilmente in `TopBar.tsx` o `WorkspaceHeader.tsx` (sotto la riga del dropdown modello).

### BUG-V4 (vista 3D senza indicazione modalità)

- `components/viewport/ViewportHud.tsx:44`: `cameraLabel = projection === "orthographic" ? "Orto" : "Persp"` — qui c'è la stringa criptica
- `components/viewport/Viewport3D.tsx`: store `projection` + `viewportMode` da `useAnalysisStore`
- `components/panels/ViewportControls.tsx`: pulsante projection toggle
- `shell/panels/ViewPanel.tsx`: pannello view
- **Manca**: label esplicita "Vista: Iso/Front/Top/Custom" sopra il gizmo. Da aggiungere in S2.

Da verificare anche `cameraView` se esiste (probabilmente no — al momento c'è solo `projection` ortho/persp, non il vero "view direction").

---

## 5 · NodeDialog/ElementDialog → da migrare a RightPanel (S5)

- `components/dialogs/NodeDialog.tsx` (modal attuale, da deprecare in S5)
- `components/dialogs/ElementDialog.tsx` (idem)
- `components/panels/SelectionInspector.tsx` (può essere il pre-cursore del nuovo NodeDetail/ElementDetail in RightPanel)

`store/selectionStore.ts` **esiste già** (il brief assumeva forse no — verificato).

---

## 6 · Viewport (S6 target)

26 file in `components/viewport/`. I rilevanti:
- `Viewport3D.tsx` (root R3F canvas)
- `ViewportHud.tsx` (HUD overlay con `projection`, `cameraLabel`, etc.)
- `DeformedShape.tsx`, `DynamicAnimation.tsx`, `DynamicTimelineHUD.tsx`
- `ElementRenderer.tsx`, `EngineElementRenderer.tsx`, `BCRenderer.tsx`
- `ColorLegend.tsx`
- `ClickPlane.tsx`, `EmptyModelOverlay.tsx`, `DropZone.tsx`

---

## 7 · Stores (S5/S6 target)

`store/selectionStore.ts` esiste già.

Altri rilevanti: `analysisStore` (projection/viewportMode), `themeStore`, `panelHeaderStore`, `rightRailStore`, `leftRailStore`, `modelStore`, `resultsStore`.

---

## 8 · Shadcn/ui

**Non presente** nel codebase (`grep -rn "@/components/ui\|shadcn"` → 0 risultati). Nessuna libreria UI esterna da gestire. Dialog/DropdownMenu sono atom custom.

---

## 9 · Componenti da mappare con cura in S3-S5

| Bundle | Reale |
|---|---|
| `ModelsTable.tsx` (react-pack) | `components/shell/ModelsTable.tsx` (già esiste) |
| `ChecksRail.tsx` + `ChecksDetailTable.tsx` (react-pack) | `components/shell/ChecksRail.tsx`, `ChecksDetailTable.tsx` (già esistono) |
| `InsightPanel.tsx` (react-pack) | `components/shell/InsightPanel.tsx` (già esiste) |
| `PercorsoStep.tsx` (react-pack) | `components/shell/PercorsoStep.tsx` (già esiste) |
| `PercorsoStepper.tsx` (react-pack) | `components/shell/PercorsoStepper.tsx` + test (già esiste) |
| `TrustLayerBadge.tsx` (react-pack) | da cercare — probabilmente nuovo |
| `CommandPalette.tsx` | `components/shell/CommandPalette.tsx` + test (già esiste) |

Gran parte delle "primitive di shell" del bundle sono GIÀ nel codebase. Sprint 3-S4 sono ridisegno + cablaggio dati, non creazione ex novo.

---

## 10 · Decisioni applicate (default brief)

| Decisione | Scelta applicata |
|---|---|
| D1 | (b) — confluito in S2 |
| D2 | (b+) — Claude Code disegna S5 con wireframe ASCII validato prima |
| D3 | (b) — feature branch + PR per sprint |
| D4 | (c) — light canonical, banner auto-migrate dark utenti esistenti |
| D5 | (a) per S0-S2 back-to-back, (b) flex da S3 |

---

## 11 · Adattamenti path bundle

Il bundle ZIP è in `C:\Users\fedes\Downloads\FEA Pro Design System (5).zip` (o (4), identici). Il brief assumeva `attachments/FEAPRO_HANDOFF.zip`. Path effettivo da usare in S0.5:

```bash
cp "C:/Users/fedes/Downloads/FEA Pro Design System (5).zip" docs/redesign-precision/FEAPRO_HANDOFF.zip
unzip docs/redesign-precision/FEAPRO_HANDOFF.zip -d docs/redesign-precision/handoff
```

Anche i file singoli forniti direttamente da Federico in `C:\Users\fedes\Downloads\`:
- `precision.css` → handoff/precision.css (già letto, contenuto chiaro)
- `colors_and_type.css` → handoff/colors_and_type.css (è il file storico del repo, riferimento per migrazione)
- `tweaks-panel.jsx` → NON va integrato (resta in handoff/ come riferimento prototyping)

---

## 12 · Versione corrente

- Branch: `test`
- HEAD: `bd958de` (post `v2.4.x-followup-fixes`)
- Frontend `frontend/src/lib/version.ts`:
  - `APP_VERSION = "v2.3"` (outdated, da aggiornare in **S2 sotto Policy C**)
  - `APP_TAG = "v2.3.2-persist-ci"` (outdated, da aggiornare in **S2 sotto Policy C**)
- Baseline: pytest 1675/2 · tsc 0 · vitest 584/584 ✓

**Convenzione versioning storica del repo** (verificata su 10 commit `git log -- version.ts`):
- `APP_VERSION` = short `major.minor` (es. `"v2.3"`)
- `APP_TAG` = full release tag (es. `"v2.3.2-persist-ci"`)
- Pattern: bump ad ogni alpha/release/PR significativo

**S2 update (Federico instruction, Policy C)**:
- `APP_VERSION = "v2.5"`
- `APP_TAG = "v2.5.0-pr2-chrome"`

Va inserito nel commit S2 (chrome navigazionale) e documentato nel report S2 sezione "Modifiche UI extra-scope (Policy C)".

---

## 13 · Working directory

Lavoro nel **worktree** `crazy-hodgkin-86772d` (non nel main repo). Il branch `feature/redesign-precision` verrà creato qui, pushato su `origin`, visibile dal main repo.

`backend/data/` è gitignored, già migrato a v2.4.6 con `owner_id` null. Niente da fare per setup.
