# FEA Pro · UI Gap Analysis v1.6.1-polish vs Mockup v0.3

> Audit visivo del frontend rispetto agli 8 mockup target del pacchetto
> v0.3 (`FEA_PRO_FULL_EXPORT_v0_3_DOCS_MOCKUPS.zip` →
> `03_mockups_new_pack/`).
> Branch `test`, tag `v1.6.1-polish` (commit `f12a6ad`).
> **Solo analisi, nessuna modifica al codice di produzione.**
> Data audit: 2026-05-22.

---

## Executive summary

La v1.6.1-polish ha **uno Studio Pro funzionalmente solido e visivamente
coerente con se stesso**, ma è **strutturalmente lontano dal prodotto
descritto nei mockup v0.3**. I gap sono di **3 nature distinte**:

1. **Feature mancanti (P0)**: il concetto di **Percorsi**, **GPS
   Strutturale**, **Trust Layer**, **Compute profiles** non esiste nel
   codice. Sono **3 dei 6 differenziatori semantici** dei mockup.
2. **Visivi (P1-P2)**: la palette ha l'asse Studio Pro (blu) ma **manca
   l'asse Percorsi (verde emerald)**. La tipografia non distingue
   display vs body. La sidebar destra è slide-in, mentre il target la
   vuole always-on densa.
3. **Polish (P3)**: tweak hex su accent/success/warn, radius +2, font
   size base 13→14. Distanze minori.

**Raccomandazione**: dato che 4 mockup su 8 (02, 03, 04, 07) sono
schermate completamente nuove, e altri 2 (05, 06) richiedono feature
sostanziali nuove (compute profiles + GPS Strutturale), un **"refresh
visivo"** non risolve il gap. Servono **Product Alignment Sprint** (per
01, 02, 08) seguito da **Demo Slice "Verifica telaio 2D"** (per 03-07).

---

## Mappa dei gap per severity

### 🔴 P0 · Blocking (necessari per "prodotto allineato ai mockup")
1. Manca concetto **Percorsi** come asse del prodotto (mockup 01, 02).
2. Manca **CTA doppia Studio Pro / Percorsi** sulla Home (mockup 01).
3. Manca **token accent secondario** (Percorsi green `#10B981`) — solo 1 accent oggi.
4. Manca **GPS Strutturale / Critical view** rule-engine (mockup 06).
5. Manca **Trust Layer** (hash canonico + sign + verify, mockup 07).
6. Manca **sync modello-Percorso** ("Updated from Percorsi", mockup 08).
7. **4 mockup su 8 = schermate completamente nuove** (02, 03, 04, 07).

### 🟡 P1 · Visible (gap netti ma non bloccanti per uso operativo)
1. **Sidebar destra**: target densa always-on, attuale slide-in con icone (mockup 01, 06, 08).
2. **LeftRail**: target con sezioni categoriali label-uppercase, attuale flat icone (mockup 01, 08).
3. **Compute profile cards** Standard/Pro/Max (mockup 05).
4. **Recent projects** come thumbnail card, non testo (mockup 01).
5. **Contextual help panels** (`Why we ask this`, `Why this matters`) per Percorsi (mockup 03, 04).
6. **Insight panel** post-solve con linguaggio testuale (mockup 06).
7. **Validation summary** pre-run come banner UI (mockup 05).
8. **Tier badge** "Pro" visibile nello shell (mockup 08).
9. **Stepper persistente** per Percorsi (mockup 03, 04).
10. **Critical element card** con UC numerica prominente (mockup 06).

### 🟢 P2 · Polish (rifiniture)
1. Accent attuale `#185FA5` vs target `#1E40AF` (più scuro saturato).
2. Success attuale `#3B6D11` vs target emerald `#10B981`.
3. Warn attuale `#854F0B` vs target orange `#F59E0B`.
4. Purple AI attuale `#534AB7` vs target `#7C3AED`.
5. Radius scale attuale 4/6/10/14 vs target ~6/8/12/16.
6. Font-size base 13px vs target ~14px.
7. Tipografia hero senza weight 600/700 distintivo.
8. Bg-hover warm `#F1EFE8` vs target leggermente più caldo `#F4F2EC`.
9. Tips card mancante in Home.
10. Edit nome modello inline.

### ⚪ P3 · Nice-to-have
1. Ombre lievemente più "lifted" nel target.
2. Differenze cromatiche micro su ink-1/2/3.
3. Spacing tra card target leggermente più ampio.
4. Border color warm vs cool slate.

---

## Schermata per schermata

| # | Mockup | Documento | Stato |
|---|---|---|---|
| 01 | Home / no model | [comparison-01-home-no-model.md](./ui-gap-analysis/comparison-01-home-no-model.md) | 🟡 parziale (manca CTA doppia + sidebar densa) |
| 02 | Path selection | [comparison-02-path-selection.md](./ui-gap-analysis/comparison-02-path-selection.md) | 🔴 schermata mancante |
| 03 | Step Geometry | [comparison-03-geometry-step.md](./ui-gap-analysis/comparison-03-geometry-step.md) | 🔴 schermata mancante |
| 04 | Supports + Loads | [comparison-04-supports-loads.md](./ui-gap-analysis/comparison-04-supports-loads.md) | 🔴 schermata mancante |
| 05 | Model ready / Run | [comparison-05-model-ready-run.md](./ui-gap-analysis/comparison-05-model-ready-run.md) | 🟡 parziale (no compute profiles) |
| 06 | Critical view / GPS | [comparison-06-critical-view-gps.md](./ui-gap-analysis/comparison-06-critical-view-gps.md) | 🟡 parziale (no GPS Strutturale) |
| 07 | Report preview / Trust | [comparison-07-report-preview.md](./ui-gap-analysis/comparison-07-report-preview.md) | 🔴 schermata mancante |
| 08 | Studio Pro | [comparison-08-studio-pro.md](./ui-gap-analysis/comparison-08-studio-pro.md) | 🟡 parziale (sidebar non densa) |

---

## Design tokens

[design-tokens-audit.md](./ui-gap-analysis/design-tokens-audit.md) —
dettaglio completo.

**Sintesi**: l'architettura dei tokens è corretta (4 livelli ink, 5
famiglie semantic, dual theme dark/light, alias R-G-B per Tailwind opacity
modifiers, radius scale, shadow tokens). Le distanze sono **cromatiche
non strutturali**, eccetto un asse mancante:

- ❌ **`--c-accent-percorsi`** (emerald `#10B981`) — gap P0, asse del prodotto.
- ❌ **`--c-critical`** distinto da `--c-danger` — gap P1, mockup 06.
- ❌ **`--c-credits`** distinto da `--c-warn` — gap P2, mockup 05.
- ❌ **`--font-display`** distinto da `--font-body` — gap P2.

Polish cromatico stimato: ~2 settimane di lavoro UX-frontend dedicato in
"Product Alignment Sprint".

---

## Limiti dell'audit

1. **Backend offline durante cattura screenshot**. Risultato:
   `Galleria template` mostra "Nessun template caricato — riavvia il
   backend per il seed degli esempi", quindi gli screenshot
   `desktop-02..09` per scenari "con modello" mostrano in realtà la
   dashboard empty o pannelli vuoti. Non è bug, è conseguenza del brief
   `pnpm dev &` senza backend. Per un audit visivo completo della UI
   post-solve serve un nuovo run con backend up + template seed.
2. **Mockup 06 (Critical view)** osservato solo da mockup, perché il
   percorso post-solve della UI attuale richiede un run completo che
   senza backend non è possibile.
3. **Onboarding tour** non si è triggerato durante l'audit (screenshot
   `*-12-onboarding.png` mostra dashboard empty senza overlay tour).
4. **Avatar dropdown** non si è aperto (testid potenzialmente diverso o
   feature non sempre disponibile in stato non-autenticato).

Niente di tutto questo è "bug bloccante" — sono limiti operativi del
setup audit. Annotati come da brief.

---

## Raccomandazione strategica

### Opzione A — Polish chirurgico (P2-P3)
- **Scope**: solo tweak hex tokens + radius + font-size base + font-display weight, nessuna nuova schermata.
- **Ore stimate**: ~16-24 h.
- **Risultato visivo**: Studio Pro un po' più "rifinito", ma rimane sostanzialmente l'app v1.6.1 attuale. Non risolve nessun P0.
- **Quando ha senso**: se la priorità è "rendere demo-ready visualmente l'esistente", senza introdurre Percorsi.

### Opzione B — Refresh visivo (P1+P2)
- **Scope**: A + sidebar destra densa always-on (mockup 08) + LeftRail sezioni categoriali + Recent projects come thumbnail + tipografia hero distinta.
- **Ore stimate**: ~60-80 h (~2 settimane).
- **Risultato visivo**: Studio Pro shell molto più vicino al mockup 08. **Ma**: Percorsi e GPS Strutturale ancora assenti, quindi P0 1-7 rimangono aperti.
- **Quando ha senso**: se serve "vendere lo Studio Pro" come demo, e Percorsi viene rimandato a uno sprint successivo.

### Opzione C — Product Alignment Sprint completo (P0 + P1 minimali)
- **Scope**: introdurre **naming Studio Pro / Percorsi nel codice** (workspaceStore rinaming) + **CTA doppia su Home** + **placeholder "Percorsi" (non funzionale)** + **Mission Bar minima con stato modello** + **token accent Percorsi green** + sidebar dx densa.
- **Ore stimate**: ~60-100 h (~2-3 settimane).
- **Risultato visivo**: si vedono Percorsi come CTA + asse del prodotto, anche se cliccarli mostra solo "Percorsi · disponibili da v1.8". Studio Pro shell allineato visualmente.
- **Quando ha senso**: se serve **comunicare la visione del prodotto** a stakeholder/investor/ingegneri test, senza implementare ancora il Percorso end-to-end.

### Opzione D — Demo Slice "Verifica telaio 2D" (P0 completo end-to-end)
- **Scope**: implementare **end-to-end** il Percorso "Verifica telaio 2D" attraverso tutti i 5 step + Critical view + Report preview. Backend rule engine criticità. Tutti i 6 mockup (02-07) funzionanti.
- **Ore stimate**: ~200-300 h (~6-10 settimane).
- **Risultato visivo**: il prodotto è "demoabile" come prodotto reale, non come prototipo. Tutti i P0 chiusi.
- **Quando ha senso**: per la **demo killer** all'ingegnere/investor con flusso completo. Da fare DOPO Product Alignment Sprint (per non avere "Percorsi" che funziona ma "Studio Pro" che non sa parlarne).

---

## Decisione consigliata

**Sequenza C → D** (in due sprint distinti):

1. **Sprint 1: Product Alignment** (~2-3 settimane).
   Naming + asse Percorsi come placeholder + tokens secondari + sidebar
   dx densa + LeftRail categoriale. Risultato: un'app che dice "ho
   capito cosa sono". Demoabile alla visione del prodotto.

2. **Sprint 2: Demo Slice "Verifica telaio 2D"** (~6-10 settimane).
   Un Percorso end-to-end completo. Risultato: l'app come prodotto vero
   su un singolo caso d'uso. Demoabile a un ingegnere strutturista per
   verifica reale.

**Motivazione (3 frasi)**:
- L'opzione A è troppo cosmetica e non sposta l'ago dei differenziatori.
- L'opzione B è un investimento medio che non risolve i P0 critici (Percorsi, GPS, Trust).
- C+D in sequenza permette di **separare allineamento di linguaggio
  (rapido)** da **implementazione feature (profondo)**, evitando il
  rischio di "Percorsi che funziona ma Studio Pro che non sa parlarne"
  o viceversa.

**Cosa NON fare**:
- Implementare Percorsi adesso senza naming + design system aggiornato → frizione futura.
- Investire nel refresh visivo (B) senza pianificare la sequenza C+D → spreco.
- Aspettare Demo Slice prima di fare Product Alignment → il messaggio del prodotto rimane confuso.

---

## Cosa NON è stato fatto in questo audit
- Modifiche al codice di produzione (regola zero di questo sprint).
- Test funzionali nuovi (lo sprint v1.6.1 li ha già aggiunti).
- Audit accessibilità (separato, da fare).
- Audit performance (separato, da fare).
- Cattura screenshot **con modello caricato e analisi completata** (richiede backend + seed templates).
- Audit estetica dark theme (catturato solo light).

---

## Allegati

- `docs/ui-gap-analysis/screenshots/` — 42 screenshot v1.6.1-polish (3 viewport × 14 schermate)
- `docs/ui-gap-analysis/comparisons/` — *(vuota: i comparison-NN.md sono nella cartella superiore per linkability)*
- `docs/ui-gap-analysis/comparison-01..08-*.md` — 8 comparazioni dettagliate
- `docs/ui-gap-analysis/00-mockup-inventory.md` — inventario mockup target
- `docs/ui-gap-analysis/design-tokens-audit.md` — confronto tokens
- `docs/mockups-reference/01..08_*.png` — mockup target (copiati dal pacchetto v0.3)
- `frontend/e2e/ui-audit.spec.ts` — spec Playwright per riprodurre l'audit (42 test)

---

## Riproducibilità

```bash
# 1. Mockup reference (richiede il pacchetto v0.3)
unzip FEA_PRO_FULL_EXPORT_v0_3_DOCS_MOCKUPS.zip
cp -r FEA_PRO_FULL_EXPORT_v0_3_DOCS_MOCKUPS/03_mockups_new_pack/0[1-8]*.png docs/mockups-reference/

# 2. Playwright + chromium (una volta)
cd frontend
pnpm add -D @playwright/test
pnpm exec playwright install chromium

# 3. Build + preview server
pnpm build
pnpm exec vite preview --port 5173 --strictPort &

# 4. Run audit (42 screenshot, ~2 min)
pnpm exec playwright test e2e/ui-audit.spec.ts

# 5. Re-render i comparison + UI_GAP_ANALYSIS dopo aggiornamenti UI
# → manuale, non c'è generator (è documento di analisi, non output build)
```
