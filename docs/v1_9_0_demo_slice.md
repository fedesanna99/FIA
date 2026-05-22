# v1.9.0 Demo Slice GPS Strutturale · Report

**Data chiusura:** 2026-05-23
**Branch:** `test`
**Tag:** `v1.9.0-demo-slice`
**Live:** https://fea-pro.fly.dev/

---

## Scopo

Prima feature reale post-polish. Sostituisce 4 placeholder con
implementazioni funzionanti dal mockup v0.3 (Percorsi + GPS + Trust
Layer + Report PDF). Nessun backend modificato — tutto frontend.

## Task chiusi

### T1 · PercorsiBeamWizard (sostituisce PercorsiPlaceholderDialog)
- File nuovo: `frontend/src/components/dialogs/PercorsiBeamWizard.tsx`
  (199 righe).
- 3 step:
  1. **Scegli percorso** — 3 card pre-set: Trave bi-appoggiata UC1,
     Telaio portale 2D, Reticolo 3D griglia. Ogni card mostra icona,
     titolo, descrizione, hover lift + focus ring percorsi.
  2. **Riepilogo configurazione** — preview parametri (geometria,
     carichi, atteso) + nota didattica NTC 2018 §4.2.
  3. **Conferma & carica** — banner success + bottone "Carica modello
     e analizza →" che chiama `onLoadTemplate(templateId)`.
- Wire in `App.tsx`: rimosso vecchio listener `PercorsiPlaceholderDialog`,
  sostituito con `setActiveId(templateId)` al confirm.
- File rimosso: `PercorsiPlaceholderDialog.tsx`.

### T2 · GPS Strutturale UC/criticità card
- `ResultsOverviewCard.tsx` esteso con sezione "Stato verifiche":
  - 3 check tonali: **S275 UC**, **EC3 UC**, **NTC UC**
  - Ratio = σ_max / fyd (235 / 261 / 275 MPa)
  - Badge tonale: 🟢 OK (<0.7) · 🟡 Attenzione (0.7-1.0) · 🔴 Critico (≥1.0)
  - Title tooltip esplicito su ogni riga (`fy = 275 MPa S275 γM0=1.05`...)
  - Footer: `Hint visivo · non sostituisce verifica formale`
- Si compone con il `Max σ` tonale (v1.8.3 T4) ora come "indicatore
  sintetico" + dettaglio normativo sotto.

### T3 · Trust Layer indicator (ModelInfoCard)
- `ModelInfoCard.tsx` arricchito con badge top-right.
- Inferenza deterministica dal `model.id`:
  - 🟢 **Utente** — id default
  - 🔵 **Template** — id inizia con `ex_`
  - 🟡 **Importato** — id inizia con `imp_` / `dxf_` / `ifc_`
  - 🟣 **AI-gen** — id inizia con `ai_`
- Title tooltip esplica origine + raccomandazione.
- testid `trust-badge-{origin}` per E2E.

### T4 · ReportExportDialog (PDF builder modal)
- File nuovo: `frontend/src/components/dialogs/ReportExportDialog.tsx`
  (157 righe).
- Wrap sopra utility esistente `generateReport` (jsPDF) in
  `utils/reportPdf.ts`.
- Checklist 5 sezioni toggleable:
  - Cover · Modello · Risultati · Criticità GPS · Conclusioni
- Counter dinamico "N sezioni attive" + nome file output preview.
- Bottone download disabled se `staticResults === null` + hint italic.
- Listener `feapro:open-export-pdf` in App.tsx (era event-only senza
  receiver) → ora apre il modal.
- Notify success persistente nel bell badge al download.

---

## Metriche chiusura

| Voce | Stato |
|---|---|
| TypeScript noEmit | ✔ no errors |
| Vitest | **465 passed** (invariato) |
| Test Files | 58 passed |
| Vincoli scope | rispettati (no backend, no viewport 3D, no refactor) |
| Files nuovi | 2 (PercorsiBeamWizard.tsx, ReportExportDialog.tsx) |
| Files modificati | 3 (App.tsx, ModelInfoCard.tsx, ResultsOverviewCard.tsx) |
| Files rimossi | 1 (PercorsiPlaceholderDialog.tsx) |

## User journey end-to-end (nuovo)

```
Home → CTA "Percorsi" → Wizard step 1 (scegli)
                     → Wizard step 2 (riepilogo)
                     → Wizard step 3 (conferma) → setActiveId(ex_*)

Viewport mostra modello caricato → user preme ▶ Esegui (F5)
                                → analysisStore.isRunning=true
                                → Sidebar destra: skeleton (v1.8.2 T3)
                                → notify("Analisi statica completata")

Sidebar destra popolata:
  ┌ ModelInfoCard
  │   "Trave bi-appoggiata"  [🔵 Template]   ← v1.9.0 T3
  │   2 nodi · 1 elemento · 2 vincoli · 1 carico
  │   2D · SI
  ├ AnalysisSummaryCard
  │   Solve time: 23 ms
  │   DOF: 12
  │   Status: ✔ OK
  └ ResultsOverviewCard
      Max u: 12.4 mm  ·  Max σ: 89.2 MPa  (tonale verde)
      Stato verifiche:                              ← v1.9.0 T2
        S275 · UC  0.32   [🟢 OK]
        EC3 · UC   0.38   [🟢 OK]
        NTC · UC   0.34   [🟢 OK]
      Hint visivo · non sostituisce verifica formale
      → Genera report PDF                            ← v1.9.0 T4
```

## Prossimo

`v1.10.0 — Tech debt closure` (jobsStore reale + History wiring + bundle
split aggressivo) oppure consolidare il Demo Slice con E2E Playwright
test su tutto il flow end-to-end.
