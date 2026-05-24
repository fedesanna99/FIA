# L1 · Dead clicks audit

**Data**: 2026-05-24
**Versione testata**: v2.3.2-persist-ci (SHA `19f960b`, post v2.3.3-docs-sync)
**Strumento**: Playwright 1.60.0 chromium (headless)
**Tool path**: `frontend/e2e/quality-checkpoint/L1_dead_clicks/crawler.spec.ts`
**Schermate testate**: 4
**Elementi totali esaminati**: 84
**Dead clicks trovati**: 4 occorrenze / **1 unico**

## Sintesi

| Metrica | Valore |
|---|---:|
| Schermate auditate | 4 |
| Click esaminati totali | 84 |
| ✓ Alive | 76 |
| ✗ Dead | 4 (1 unico) |
| ⚠ Errors (timeout/detached) | 0 |
| ⊘ Skipped (esclusi via lista) | 4 |

**Soglia gate utente**: ≤ 30 dead clicks → **PASS** (4 < 30, continuo con T2). ✓

## Schermate testate

| Screen | URL | Total | Alive | Dead | Skipped |
|---|---|---:|---:|---:|---:|
| `home_empty` | `/` (no model) | 21 | 19 | 1 | 1 |
| `beam_loaded` | `/?model=ex_simple_beam_2d` | 21 | 19 | 1 | 1 |
| `portal_loaded` | `/?model=ex_portal_frame_2d` | 21 | 19 | 1 | 1 |
| `truss3d_loaded` | `/?model=ex_truss_3d` | 21 | 19 | 1 | 1 |

## Definizione operativa di "dead click" applicata

Un click è classificato `dead` se DOPO il click, entro 500ms, **nessuna** di queste osservazioni cambia:
- URL del browser
- Numero di overlay aperti (`[role="dialog"]`, `[role="menu"]`, `[role="listbox"]`, `[role="tooltip"]`, `[data-state="open"]`)
- Numero di toast (`[data-toast]`, `[data-sonner-toast]`, `[role="status"]`)
- Elemento `document.activeElement` (focus change)
- Hash dell'innerHTML di `body` (qualunque DOM mutation)
- Request HTTP fired
- Console error/warning

## Dead clicks (1 unico)

### 1. **"Apri Copilot"** (button:text)

| | |
|---|---|
| **Selettore** | `button:text("Apri Copilot")` |
| **Schermate** | tutte e 4 (home_empty, beam_loaded, portal_loaded, truss3d_loaded) |
| **Evidence** | `no observable effect within 500ms` (nessuna delle 7 osservazioni cambiata) |
| **File sospetto** | `frontend/src/components/dialogs/AICopilotPanel.tsx` o trigger button in `EmptyModelOverlay.tsx` / topbar |
| **Severity** | 🟡 P1 (UI presente ma non funzionale) |

**Ipotesi root-cause**:
- AI Copilot è documentato come MockProvider (vedi audit interno v2.3.2). Il button potrebbe essere wired a un evento `feapro:open-ai-copilot` che nessun handler ascolta su questa pagina.
- Oppure: `useAnalysisStore.openCopilot()` viene chiamato ma `aiCopilotOpen` è già `true` in default state → click no-op.
- Da investigare lato codice: vedi `grep "Apri Copilot" frontend/src/` per individuare il componente.

## Skipped (esclusioni intenzionali)

| Elemento | Motivo |
|---|---|
| `[data-testid="skip-to-content"]` (× 4) | Anchor link `#main-content` — usa focus management, non genera evento DOM/overlay osservabile via il check standard |

## Alive (esempi positivi confermati)

Per ogni schermata 19/21 click sono `alive`. Esempi di osservazioni che hanno confermato l'effetto:

- `[data-testid="topbar-model-menu"]` "Nessun modello" → `overlay:0->1, focus:DIV#->BUTTON#radix-`(Radix Menu aperto)
- `[data-testid="topbar-search"]` → `focus:DIV#->INPUT#` (focus su input)
- `[data-testid="topbar-avatar-menu"]` "QV" → `overlay:0->1` (Radix Menu)
- `[data-testid="left-rail-palette"]` → `overlay:0->1, dom:mutated` (CommandPalette)
- `button[aria-label="Tema: light. Segui sistema"]` → `dom:mutated` (toggle theme classe su `<html>`)
- `[data-testid="home-cta-studio-pro"]` "Apri Studio Pro" → `url:->path/studio` o `dom:mutated`
- `[data-testid="home-cta-percorsi"]` → `overlay:0->1` (PercorsiBeamWizard apre)

## Note metodologiche

- **Auth-aware**: il crawler bypassa la AuthGate iniettando un JWT valido in `localStorage` (`auth-store`) prima di `goto()`. Test user creato via `POST /api/auth/register` con email `qa-v234-<random>@feapro-qa.com` (idempotente).
- **force: true** sui click — per bypassare actionability checks (overlay/cover che renderebbe il click "non-actionable" anche se l'elemento è visibile). Più simile a un utente che clicca senza pensarci.
- **Re-find per iterazione** — i locator NON vengono pre-fetchati (`.all()`) ma re-cercati ad ogni iterazione per evitare staleness dopo re-render.
- **Output JSON**: `frontend/e2e/quality-checkpoint/L1_dead_clicks/fixtures/<screen>_results.json` (4 file, ~9 KB ognuno) per audit offline.

## Findings collaterali (bug trovati durante setup)

### F1 · `vite.config.ts` proxy mismatch (config bug)
- `frontend/vite.config.ts` riga 13 ha `target: "http://localhost:8765"` per `/api/*` proxy.
- Ma `playwright.config.ts` docstring dice "pnpm dev # porta 5173" e `backend/main.py` di default ascolta `:8000`.
- Risultato: avviando backend su `8000` (come fa il docstring), il frontend dev non riesce a chiamare API e Vite proxy ritorna 500.
- Workaround: avviare backend su `8765` (come fa questo crawler).
- Inoltre `server.port` nel vite.config è `5273` (non 5173). Doppio mismatch.
- Severity: 🟡 P1 (rompe il primo `pnpm dev` di un nuovo dev).

### F2 · Pydantic email validator rifiuta `.test` TLD (auth API)
- `POST /api/auth/register` con email `qa@feapro.test` ritorna 422:
  `"value is not a valid email address: The part after the @-sign is a special-use or reserved name"`.
- Comportamento corretto per RFC 6761 (TLD `.test` riservato), ma blocca E2E con dominio test convenzionale.
- Workaround: usare `.com` (es. `feapro-qa.com`).
- Severity: 🟢 P2 (corretto, ma fastidioso).

## Coverage gap

Non testato in questo crawler L1:
- Stati post-Solve (con `staticResults`/`modalResults` presenti) — apre nuove UI sezioni
- Stati con panel Make/Verify/Inspect aperti — espande UI
- Mobile viewport (390×844) — UI completamente diversa, tabbar invece di rail
- Drill-in `?` help sheet
- Onboarding tour 9-step
- Dialog di template gallery (clic interno alla galleria)
- Wizard 6-step Percorsi (drill-in)
- Compare panel A/B
- Snapshot rename inline

**Stima**: ~+8 schermate aggiuntive per coverage decente. **Da fare in v2.5.x quando il framework crawler è già provato**.

## Esecuzione

```bash
cd frontend
./node_modules/.bin/playwright test e2e/quality-checkpoint/L1_dead_clicks/crawler.spec.ts --reporter=list
```

Pre-requisiti:
- Backend live su `http://localhost:8765` (`FEA_NO_PERSIST=1 python -m uvicorn main:app --port 8765 --host 127.0.0.1` da `backend/`)
- Frontend Vite dev su `http://localhost:5173` (`npm run dev -- --port 5173` da `frontend/`)
