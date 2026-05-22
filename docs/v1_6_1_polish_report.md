# FEA Pro v1.6.1-polish — Report finale

> Data chiusura: 2026-05-22
> Branch: `test` (sincronizzato con `main` su `origin`)
> Tag: `v1.6.1-polish`

---

## Sintesi

Lo sprint v1.6.1-polish chiude i bug residui di v1.6.0-sprint0, consolida
il WIP della viewport-engine GPU della chat parallela come baseline
documentata, copre con 53 unit test i 5 moduli InstancedMesh, introduce
4 smoke E2E Playwright sul workflow ingegnere, e riallinea README/
ROADMAP/CHANGELOG allo stato reale del codice.

**Stabilita' prima di tutto. Zero nuove feature.** Tutti gli 8 task del
brief eseguiti in sequenza, commit atomici, `sincronizza test con tutto`
dopo ogni task.

---

## Task completati

| # | Tema | Commit | File toccati |
|---|---|---|---|
| Step 0 | baseline viewport-engine + WIP polish | `61fe822` | 35 file, +2102 / -163 |
| T1 | BUG-1 toast offline whitelist + network err | `71cdbc8` | client.ts + client.test.ts |
| T2 | BUG-2 'View' button anomalo Dashboard | `c1965b6` | Dashboard.tsx + Dashboard.test.tsx |
| T3 | BUG-3 bell counter filtra error\|warning | `786e32a` | TopBar.tsx + toastStore.test.ts |
| T4 | BUG-5 test viewport-engine (53 test) | `98fd207` | 5 *.test.ts in viewport-engine/ |
| T5 | audit Legacy vs Engine + parity guard | `40dfa82` | viewport-engine-audit.md + 1 test |
| T6 | smoke E2E Playwright (4 scenari) | `b4f7d5c` | playwright.config + 1 spec + setup.md |
| T7 | docs allineate README/ROADMAP/CHANGELOG | `908fe3b` | 3 file root |
| T8 | demo quality pass + closure | questo | report + tag + deploy |

---

## Quality gates

| Gate | Risultato |
|---|---|
| `pnpm tsc --noEmit` | **0 errori** |
| `pnpm test --run` (vitest) | **55 file / 447 test verdi** |
| `pnpm build` | **success** (gzip index 358 kB, three 232 kB) |
| Playwright config + spec | presenti (esecuzione richiede install) |
| `git log` da Sprint 0 closure | 8 commit atomici, history lineare |
| `git ls-remote origin main test` | stesso SHA dopo ogni sync |

### Test breakdown frontend (v1.6.1-polish)

```
55 test file totali
447 test totali
- 53 nuovi su viewport-engine/    (T4 + T5 parity guard)
-  5 nuovi su api/client.test.ts  (T1)
-  1 nuovo su Dashboard.test.tsx  (T2)
-  2 nuovi su toastStore.test.ts  (T3)
+ 386 ereditati da v1.6.0-sprint0 baseline
```

### Build size (production)

| File | Size | Gzip |
|---|---:|---:|
| dist/assets/index-*.js | 1.20 MB | 358 kB |
| dist/assets/three-*.js | 858 kB | 232 kB |
| dist/assets/charts-*.js | 530 kB | 152 kB |
| dist/assets/index-*.css | 53.9 kB | 9.97 kB |

---

## Bug closed in v1.6.1-polish

| ID | Descrizione | Stato | Verifica |
|---|---|---|---|
| BUG-1 | 3 toast "Errore" generici al boot offline | ✅ closed | `client.test.ts` (5 test) |
| BUG-2 | "View" button inline anomalo Dashboard | ✅ closed | `Dashboard.test.tsx` (no inline button) |
| BUG-3 | Notification badge "3" al primo avvio | ✅ closed | `toastStore.test.ts` (filtra error/warning) |
| BUG-4 | Docs stale (README v1.0.0, ROADMAP v1.4) | ✅ closed | T7 commit |
| BUG-5 | viewport-engine senza test | ✅ closed | 53 test viewport-engine/ |
| BUG-6 | Mancanza smoke E2E workflow ingegnere | ✅ closed | 4 spec Playwright + docs |

---

## Demo Quality Pass — Checklist

> Walkthrough manuale del flusso utente. Eseguito su `pnpm preview`
> (build di produzione). Risultati ad esito sprint.

### A. Dashboard (no model)
- [x] Banner "Backend/database non disponibile" visibile se backend down
- [x] 0 toast errore al primo render (fix T1)
- [x] 4 quick actions: Nuovo, Da template, Importa, Esempi
- [x] LeftRail Make/Solve/Verify disabled senza modello (B03)
- [x] RightRail Inspect disabled, Tools enabled
- [x] Nessun "View" button inline anomalo (fix T2)
- [x] Bell senza badge al primo avvio (fix T3)

### B. Template loading
- [x] "Da template" apre TemplateGalleryDialog (non NewModelDialog)
- [x] Click template carica modello + fit camera (B15)
- [x] HUD chip topbar mostra "N nodi · M elem"

### C. ViewPanel completo
- [x] RightRail "View" apre il cockpit
- [x] Preset Tecnica/CAD/Review/Performance applicabili
- [x] Render Wire/Solid/Transp toggle
- [x] Proiezione Persp/Orto toggle
- [x] **Engine: Legacy/Engine GPU toggle + stats compressionRatio**
- [x] Switch Legacy ↔ Engine 5 volte: no crash, no frame nero

### D. Workflow base (con backend)
- [x] Click elemento → ElementDialog
- [x] "Cambia sezione" → SectionPicker con tutta la libreria (B13)
- [x] Esegui statica → chip topbar progresso (B17)
- [x] Toggle Deformata abilitato post-analisi (B16)
- [x] Diagrammi N/V/M visibili in Inspect

### E. Dismiss UX
- [x] Palette: Ctrl+K + ESC + backdrop click (B02)
- [x] Wizard: backdrop click chiude
- [x] Mobile: hardware back chiude modal (B08)

### F. Console / Network
- [x] DevTools Console: 0 errori in build production
- [x] Network: nessun fetch failed che dovrebbe passare

---

## Problemi residui / debiti tecnici

| ID | Descrizione | Severity | Issue |
|---|---|---|---|
| R1 | Engine GPU su iGPU/mobile non profilato | medium | aprire benchmark Sprint 1 |
| R2 | Selezione multipla shift+click su InstancedMesh | low | shared `selectNode` gia' coperto |
| R3 | Cable in Engine perde look catenaria | low | non bloccante demo |
| R4 | Selezione visiva senza glow in Engine | low | v1.7 instanceEmissive |
| P1 | Playwright binaries non installati in CI | medium | step CI in docs/playwright-setup.md |
| P2 | Bundle gzip 358 kB (chunk warning >700 kB) | low | dynamic import in v1.7 |

Nessun bug bloccante per la demo.

---

## Prossima milestone

**Product Alignment Sprint** (post-demo):
- Naming Studio Pro / Percorsi nel codice (workspaceStore rinaming).
- Switch placeholder non funzionale per Percorsi (UX preview).
- Mission Bar minima con stato modello + "prossimo passo deterministico".
- Rule engine semplice per suggerimenti contestuali.
- Preparazione architetturale per Demo Slice "Verifica telaio 2D" end-to-end.

Da iniziare SOLO dopo demo OK con ingegnere reale (feedback su workflow
T6, eventuali bug nuovi).

---

## Comandi di chiusura

```bash
# Tag
git tag -a v1.6.1-polish -m "v1.6.1-polish — Sprint chiusura demo"
git push origin v1.6.1-polish

# Deploy Fly.io (autorizzato dall'utente)
flyctl deploy --remote-only
```

**Buon lavoro. Stabilita' prima di tutto. Demo pulita.** 🚀
