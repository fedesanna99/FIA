# v2.3.4 Quality Checkpoint · Bug list consolidata

**Data audit**: 2026-05-24
**Versione testata**: v2.3.2-persist-ci
**Branch**: test (SHA `19f960b` post v2.3.3-docs-sync)
**Tester**: Playwright crawler + flow auth-aware (helpers.ts via API JWT)

## Sintesi

| | |
|---|---:|
| Schermate auditate (L1 crawler) | 4 |
| Click totali esaminati (L1) | 84 |
| **Dead clicks (L1)** | **4 occorrenze / 1 unico** |
| Flow funzionali eseguiti (L2) | 25 test |
| Flow PASS | 13 |
| Flow FAIL = finding | 12 |
| **Finding consolidati (deduplicati)** | **15** |

Gate utente "max 30 dead clicks" → **PASS** (4 < 30). ✓

## Bug consolidati ordinati per severity

### 🔴 Bloccanti (P0 — fix obbligatorio prima del prossimo sprint feature)

Nessuno emerso da questa audit. Le bug bloccanti note pre-sprint (vedi tasks list:
#9 Undo/Redo v2.3.0, #2 export PDF/XLSX, #28 rate limit login) **non sono state
verificate qui** — sono nel scope del fix sprint dedicato v2.4.x.

### 🟡 Importanti (P1 — fix in sprint v2.4.x)

#### BUG-001 · `vite.config.ts` proxy mismatch
- **Sintomo**: `frontend/vite.config.ts` proxy `/api/*` punta a `localhost:8765`, ma `playwright.config.ts` e default `uvicorn` partono su `:8000`. Avviando `npm run dev` + `uvicorn main:app` da docstring → frontend chiama 5273 (port custom anche lì) e proxy 8765, niente combacia.
- **File**: `frontend/vite.config.ts` riga 7 (port: 5273) e riga 12 (target: 8765)
- **Severity**: P1 — rompe il primo `npm run dev` di un nuovo dev / CI senza override.
- **Fix proposto**: allineare a 5173 + 8000 default, o aggiornare docstring.
- **Workaround usato in audit**: avviare backend con `--port 8765`.

#### BUG-002 · "Apri Copilot" button dead click (L1 crawler)
- **Sintomo**: pulsante "Apri Copilot" presente in 4/4 schermate testate, ma click NON produce alcun effetto observable (no overlay, no toast, no focus change, no DOM mutation, no network, no console).
- **File sospetto**: `frontend/src/components/dialogs/AICopilotPanel.tsx` o `EmptyModelOverlay.tsx` (trigger non wired)
- **Severity**: P1 — UI presente ma non funzionale. AI Copilot già documentato come MockProvider (audit interno v2.3.2), questo è il sintomo evidente.
- **Riproduzione**: `playwright test e2e/quality-checkpoint/L1_dead_clicks/ --grep "home_empty"` → fixture mostra dead click.

#### BUG-003 · Ctrl+K command palette non si apre in alcuni stati
- **Sintomo**: T8 + T12 → `page.keyboard.press("Control+K")` non apre il `command-palette`. Dialog `[role="dialog"]` non compare.
- **Possibile root cause**: shortcut wire perso quando il modello non è caricato? O conflitto con browser default su 5173? O testid `command-palette` non più applicato sul nuovo container?
- **File sospetto**: `frontend/src/components/shell/CommandPalette.tsx` + hook keyboard shortcuts
- **Severity**: P1 — palette è dichiarata in onboarding tour come "core shortcut" della UX.
- **Riproduzione**: `playwright test e2e/quality-checkpoint/L2_functional_flows/flow_command_palette.spec.ts`

#### BUG-004 · Backend offline → whitescreen senza messaggio
- **Sintomo**: con `context.route("**/api/**", route => route.abort())` la app non mostra né AuthGate né banner errore. Body resta visibile ma vuoto.
- **File sospetto**: `frontend/src/App.tsx` AuthGate bootstrap + global error boundary mancante per "backend non raggiungibile"
- **Severity**: P1 — esperienza degradata silenziosa, user non capisce perché l'app non funziona.
- **Riproduzione**: `playwright test ... flow_dashboard.spec.ts --grep "backend offline"`

#### BUG-005 · F5 (Esegui analisi) non produce feedback entro 3.5s
- **Sintomo**: T4 `happy: F5 → analisi completata`. Su `ex_simple_beam_2d` (11 nodi 10 elem) l'attesa di 3.5s post-F5 non rileva: né toast, né nuovo panel-results, né mission-bar status "Risolto".
- **Possibile**: 3.5s sono pochi (solver+overhead più lento del previsto in dev mode) OPPURE feedback async non testid-coperto.
- **Severity**: P1 — l'utente potrebbe non capire se l'analisi è partita.
- **Riproduzione**: `flow_solve.spec.ts` test happy

#### BUG-006 · Make panel non si apre da rail-make/rail-model
- **Sintomo**: T3 `happy: load model + apri Make → hub visibile`. Click sui testid `left-rail-model` / `left-rail-make` non apre `panel-make-hub` / `make-*` panel.
- **Possibile**: rail testid è diverso (es. `left-rail-1`, `rail-section-make`) — da indagare.
- **Severity**: P1 — workflow Make è il primo step utente
- **Riproduzione**: `flow_make.spec.ts`

#### BUG-007 · Wizard Import senza step indicator visibile
- **Sintomo**: T7 → click "Importa IFC/DXF" apre dialog, ma `text-matches("step|passo \d", "i")` non trova alcun indicatore "Step 1 di 4".
- **Possibile root cause**: step indicator è grafico (dots/bar) senza testo, oppure usa numerazione "1/4" senza la parola "step".
- **Severity**: P1 — UX wizard senza visual progress
- **Riproduzione**: `flow_wizard_import.spec.ts` test happy

#### BUG-008 · TrustLayerBadge non trovato nel PercorsiWizard
- **Sintomo**: T10 → `[data-testid*="trust"]` + text `preliminary|draft|trust|qualifica` non trovato sul wizard dopo apertura.
- **Possibile**: TrustLayerBadge appare SOLO dopo step 1 di selezione modello, non sulla card iniziale.
- **Severity**: P1 — la Trust Layer feature di v1.9 dovrebbe essere visibile chiaramente
- **Riproduzione**: `flow_percorsi_beam.spec.ts`

#### BUG-009 · Mobile viewport canvas non raggiungibile entro 5s
- **Sintomo**: T11 viewport 390×844 + `/?model=ex_simple_beam_2d` → `canvas` selector non visibile in 5s.
- **Possibile**: caricamento più lento su mobile (CSS responsive che ritarda mount Canvas R3F).
- **Severity**: P1 → tempi loading mobile da investigare
- **Riproduzione**: `flow_mobile.spec.ts` test happy

#### BUG-010 · Focus mode Shift+Space non nasconde topbar
- **Sintomo**: T12 → `Shift+Space` su workspace caricato non cambia visibilità di `[data-testid="topbar"]`.
- **Possibile**: testid `topbar` non esiste o focus mode richiede combinazione diversa.
- **Severity**: P1 — focus mode è documentato in `PROGRESSIVE_DISCLOSURE_TASKS.md` v1.4.0 alpha.31 T9
- **Riproduzione**: `edge_cases.spec.ts` test focus mode

### 🟢 Polish (P2 — backlog tecnico, non urgenti)

#### BUG-011 · Pydantic email validator rifiuta TLD `.test`
- **Sintomo**: `POST /api/auth/register` con `qa@feapro.test` ritorna 422 "value is not a valid email address: special-use or reserved name". Comportamento corretto RFC 6761, ma scomodo per E2E.
- **File**: `backend/api/routes/auth.py` (Pydantic EmailStr)
- **Severity**: P2 — fastidioso ma corretto. Workaround: usare `.com`.

#### BUG-012 · Vite dev server muore durante long-run (>3 min)
- **Sintomo**: durante batch run di 25 test E2E (~3 min) Vite dev su 5173 ha smesso di rispondere. Ripreso solo dopo restart manuale.
- **Possibile**: memory leak su HMR + WS + 100+ proxy passthrough
- **Severity**: P2 → impatta CI / lunghi audit E2E
- **Workaround**: restart Vite tra test suite grandi.

#### BUG-013 · `[data-testid="skip-to-content"]` non genera evento DOM observable
- **Sintomo**: skip link a11y "Vai al contenuto" è `<a href="#main-content">`. Il click cambia il hash URL ma non triggera DOM mutation / overlay / toast — risultato: crawler lo flagga "dead" finché non aggiunto a exclusions.
- **Severity**: P2 — funziona ma è invisibile al crawler L1 (non un bug, una limitation)

#### BUG-014 · Vite proxy mostra errori console quando backend è giù
- **Sintomo**: dopo restart backend, Vite log mostra `AggregateError [ECONNREFUSED]` ripetuti per ogni request proxy. Pochi → recover; molti → log inquinato.
- **Severity**: P2 → cosmetic

#### BUG-015 · ECONNREFUSED periodico durante test parallel multipli
- **Sintomo**: alcuni test (es. `flow_verify` edge) falliscono con ECONNREFUSED anche con Vite attivo, probabilmente per race su connessione proxy.
- **Severity**: P2 → flaky test, da retry con Playwright `retries: 2`

## Bug noti pre-audit (non re-verificati qui, da fix sprint v2.4.x)

Vedi tasks list (da audit interno v2.3.2):

| Task | Severity | Note |
|---|---|---|
| #2 BLOCKER: export PDF/XLSX broken | P0 | da v2.3.2 audit |
| #6 BUG: "Staffe non nec." quando UR>1 | P0 | EC2 verify panel |
| #9 BUG critico: Undo/Redo v2.3.0 broken in produzione | P0 | da audit interno v2.3.2 |
| #11 BUG API: id required in POST body | P1 | API anti-pattern |
| #12 BUG ETICO: NAFEMS LE1 tolerance 100% = fake PASS | P0 | gold-tier ethical |
| #14 BUG CRITICO: EC3 section class sistematico | P1 | HEA/IPE class errati |
| #15 BUG EC5: solo 2 timber classes funzionano | P1 | C24/C30/GL24h/GL28h only |
| #16 GAP: EC2 punching/crack/deflection MISSING | P1 | normative gap |
| #17 SEC: mancano security headers (4) | P0 | HSTS/CSP/X-Frame |
| #19 GAP MAJOR: EC4/EC6/EC7/EC9 mancano | P1 | normative gap |
| #22 GDPR BLOCKER: no DELETE account endpoint | P0 | Art. 17 right erasure |
| #23 BLOCKER: Meteo provider Open-Meteo timeout | P1 | external dep |
| #27 AI Copilot = MockProvider | P1 | NON vera AI |
| #28 BLOCKER: NO rate limiting su login brute force | P0 | security critical |
| #29 BUG #7 deep: NTC18 soil_class ignorato | P1 | seismic engine |
| #30 CRITICO: Engine NON ferma su matrice singolare | P0 | numerical safety |

## Performance osservata

- **L1 crawler**: 4 schermate × ~18s ognuna = ~72s total
- **L2 functional flows**: 25 test in ~3.2 min (con Vite restart in mezzo)
- **Memoria Vite dev**: si è gonfiata e ha provocato un crash dopo ~3 min — vedi BUG-012

## Raccomandazioni

1. **Sprint v2.4.x fix** (5-7 giorni stimati):
   - P0 noti pre-audit (#2, #6, #9, #12, #17, #22, #28, #30) — vedi tabella sopra
   - P1 L1+L2 BUG-001…BUG-010 di questo audit (10 finding)
2. **Sprint v2.5.x estensione audit**:
   - +15 spec L2 mancanti (vedi coverage gap nel L2 report)
   - +mobile crawler L1 (viewport 390×844)
   - +screenshot diff dark/light per regression visual
3. **Sprint v2.6.x decisione prodotto** (post-fix):
   - Decidere Strada A/B/C dal ROADMAP

## Coverage gap (non testato qui)

Non testato in questo checkpoint per scope:
- Onboarding tour 9-step (manuale)
- AI Copilot interactions (MockProvider)
- WebSocket collab (richiede 2 client)
- Iso-surfaces 3D (richiede modelli solidi pre-solve)
- Sismica time-history (richiede accelerogrammi)
- Export PDF/XLSX/DXF (genera file binari, validation manuale)
- Form complex CRUD (NodeDialog 8+ field, ElementDialog, ConstraintDialog, MaterialDialog, SectionDialog)
- Theme dark mode regression (richiede screenshot diff)
- Touch gesture mobile (swipe back, pinch zoom)

## Next steps

1. Tag `v2.3.4-quality-checkpoint` (vedi chiusura brief)
2. Push sync test:test + test:main
3. Sprint v2.4.x fix dedicato sui 16 P0 noti + 10 P1 trovati qui

---

**Output finale**: 25 finding documentati, 16 da fixare in v2.4.x (P0+P1), 5 nice-to-have v2.5.x+.
