# v1.8.1 Polish Sprint · Report finale

**Data chiusura:** 2026-05-22
**Branch:** `test`
**Tag:** `v1.8.1-polish`
**Live:** https://fea-pro.fly.dev/

---

## Scopo

Hotfix + rifiniture incrementali sopra `v1.8.0-product-alignment`. Nessun
refactor architetturale, nessuna modifica backend, nessun cambio al
viewport 3D engine. Solo polish UI/UX per chiudere i gap residui rispetto
ai mockup v0.3.

## Task chiusi

### P0 · Mojibake `ViewportHud`
- **Bug:** chip metadata mostrava `Â·` (cp1252 reinterpretato) invece
  di `·` (U+00B7) e `â€"` invece di `—` (U+2014).
- **Causa:** file `.tsx` salvato in cp1252 con byte UTF-8 raw.
- **Fix:** riscritto `ViewportHud.tsx` in UTF-8 reale via `Write` tool.
- **Commit:** `63da64e fix(hud): mojibake U+00B7 e U+2014 in ViewportHud chip (P0 bug visivo)`

### P1 · Sidebar destra densa (mockup 08)
- Aggiunte due card sopra `ModelInfoCard`:
  - **`AnalysisSummaryCard`** — solve time, DOF approx, status,
    link "Apri Inspect →" (apre right rail Inspect).
  - **`ResultsOverviewCard`** — Max u (mm), Max σ (MPa) in grid 2-cols
    + bottone "Genera report PDF →" (dispatch `feapro:open-export-pdf`).
- Entrambe auto-nascoste finché `staticResults === null`.
- **Commit:** `0fd8b83 feat(shell): sidebar destra densa · AnalysisSummary + ResultsOverview (v1.8.1 P1)`

### P2 · Tier badge dinamico (TopBar)
- Sostituito il badge hardcoded "Pro" con `<TopBarTierBadge />`
  che legge la quota corrente via `useQuery({ queryKey: ["billing-quota", userId] })`.
- 4 stili tonali per tier:
  - `free` → bg-hover / ink-dim (grigio)
  - `starter` → bg-info / ink-info (azzurro)
  - `pro` → bg-percorsi / ink-percorsi (emerald)
  - `enterprise` → bg-purple / ink-purple (viola)
- Fallback `free` quando l'API fallisce o quota non disponibile.
- **Commit:** `2e419e5 feat(topbar): tier badge wire a billing API via React Query (v1.8.1 P2)`

### P3 · `MissionBar` rule engine (regression guard)
- Verifica: i test `MissionBar.test.tsx` esistono già da v1.8 T3
  (8 test sul rule engine puro + rendering). Nessuna azione richiesta.

### P4 · Visualizzazione finale stato app
- Creato `.codex-temp/final-state.spec.ts` Playwright spec che cattura
  prod (https://fea-pro.fly.dev/) in 2 viewport:
  - **Mobile:** iPhone 14 Pro 390×844, deviceScaleFactor 2
  - **Desktop:** 1440×900
- `capture.config.ts` patchato per leggere `E2E_BASE_URL` env var
  invece di hardcoded localhost.
- Test: **2 passed (11.5s)**, 2 screenshot generati.

---

## Architettura UI finale (v1.8.1)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TopBar  [F] FEA Pro [free|pro|...] v1.4 │ 📁 Nessun modello │ ▶ Esegui │
│                                       Cerca…  ✨ AI  Accedi          │
├────┬───────────────────────────────────────────────────┬─────────────────┤
│ L  │ MissionBar  · [✔ Risolto] / [• Da completare] · hint dinamico    │
│ e  │                                                  │ Right Sidebar │
│ f  ├──────────────────────────────────────────────────┤  (densa, ≥md) │
│ t  │                                                  │ ┌─────────────┐│
│    │              Viewport 3D (R3F)                   │ │ ModelInfo  ││
│ R  │  ┌──────────────────────────────┐                │ │            ││
│ a  │  │ EmptyModelOverlay            │                │ ├─────────────┤│
│ i  │  │ 📦 Modello vuoto             │                │ │ Analysis    ││
│ l  │  │ [Apri Make] [Template]       │                │ │ Summary     ││
│    │  └──────────────────────────────┘                │ ├─────────────┤│
│ FA │                                                  │ │ Results     ││
│ SI │  ViewportHud (chip metadata)                     │ │ Overview    ││
│ 🔨 │  · nodes · elements · 2D/3D · units              │ └─────────────┘│
│ 📐 │                                                  │ 👁 ▦ 🔨        │
│ ✔  │                                                  │ (Inspect tools)│
│ CMD│                                                  │                │
│ 🔍 │                                                  │                │
│    │                                                  │                │
│ UI │                                                  │                │
│ ☀  │                                                  │                │
│ ?  │                                                  │                │
├────┴─────────────────────────────────────────────────────────────────┘
│  ● Nessun modello                            ● Online  ? · v1.4    │
└────────────────────────────────────────────────────────────────────────┘

Mobile (≤md):
┌─────────────────────────────────┐
│ [F] 📁 Nessun ▶ 🔍 →           │
├─────────────────────────────────┤
│ Buongiorno                      │
│ 9 modelli · 0 job in corso      │
│ ┌─────────────────────────────┐ │
│ │ CREDITI FREE   2 / 50       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ MODALITÀ ESPERTO            │ │
│ │ Studio Pro (CTA blu)        │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ WORKFLOW GUIDATO            │ │
│ │ Percorsi (CTA emerald)      │ │
│ └─────────────────────────────┘ │
│ + Nuovo  📚 Da template         │
│ 📥 Importa 🧪 Esempi             │
├─────────────────────────────────┤
│ 🧊 Mod  🔨 Mak ⚡ Sol  📊 Ris  ⋯ │
└─────────────────────────────────┘
```

---

## Stato finale visualizzato (live https://fea-pro.fly.dev/)

### Desktop (1440×900)
- Hero CTA doppia: **Studio Pro** (blu) + **Percorsi** (emerald).
- 4 azioni rapide allineate: Nuovo modello / Da template / Importa file / Esempi.
- 2 colonne sotto: Job in corso (vuoto) + Modelli recenti con 9 esempi
  didattici listati.
- TopBar: tier badge "Free" (dinamico da API), ricerca centrale Ctrl+K,
  bottoni AI + Accedi.
- LeftRail: sezioni `FASI` (Make/Solve/Verify/CMD/🔍) + `UI` (theme/?).
- RightSidebar collassata (sezioni Inspect 👁 ▦ 🔨 always-on).
- Footer: badge `● Online` + version `v1.4`.

### Mobile (iPhone 14 Pro 390×844)
- Layout single-column con padding generoso.
- CTA Studio Pro / Percorsi impilate verticalmente.
- 4 azioni rapide in grid 2×2.
- TopBar compatta: avatar + selector modello + ▶ Esegui + ricerca + login.
- Bottom tab bar: Modello (attivo) / Make / Solve / Risultati / Altro.

---

## Metriche di chiusura

| Voce | Stato |
|---|---|
| Test unitari (vitest) | 460 passed |
| Test E2E (playwright smoke) | 4 passed |
| Test E2E (final-state capture) | 2 passed |
| Mobile panel full-width | ✔ |
| Make panel duplicazione | ✔ risolta |
| Mojibake ViewportHud | ✔ risolto |
| EmptyModelOverlay | ✔ visibile su 0 nodi/0 elementi |
| Tier badge dinamico | ✔ wire a `/api/billing/quota` |
| Sidebar destra densa | ✔ 3 card always-on |
| Deploy Fly.io | ✔ LIVE (cold-start 22.2s, HTTP 200) |

---

## Cosa NON è stato fatto (scope esplicito)

- ❌ Backend modifiche (rispettato vincolo)
- ❌ Viewport 3D rendering modifiche (rispettato vincolo)
- ❌ Refactor architetturali store/router/types (rispettato vincolo)
- ❌ Percorsi feature complete (resta placeholder dialog)
- ❌ GPS Strutturale (non scope v1.8.x, slittato a v1.9 Demo Slice)
- ❌ Trust Layer (non scope v1.8.x)

## Prossimo sprint candidato (v1.9 Demo Slice GPS Strutturale)

Vedi `docs/UI_GAP_ANALYSIS.md` §4 per backlog dettagliato:
1. Percorsi → wizard reale (almeno 1 percorso end-to-end)
2. GPS Strutturale → UC/criticità card su `ResultsOverviewCard`
3. Trust Layer → indicator per modelli importati/AI-generated
4. Report PDF builder → modal export con preview
