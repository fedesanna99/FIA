# Confronto · Mockup 02 — Percorsi / Path selection

**Mockup target**: `docs/mockups-reference/02_percorsi_path_selection.png`
**Screenshot attuali**: **nessuno** — schermata non implementata.

---

## Stato

🔴 **GAP COMPLETO**. Non esiste nel codice corrente una schermata
equivalente alla galleria Percorsi. Il concetto stesso di "Percorso" come
flusso guidato distinto dallo Studio Pro non è ancora introdotto nella UI.

Il riferimento più vicino nel codice attuale è **TemplateGalleryDialog**
(`frontend/src/components/dialogs/TemplateGalleryDialog.tsx`) — galleria
di 9 modelli precaricati. Ma sono **modelli statici** (telai esempio,
shell didattici), non Percorsi (workflow step-by-step).

---

## Cosa mostra il mockup target

- Heading `Choose a path` + sottotitolo `Percorsi guidati per arrivare a
  un workflow strutturale, ma con punti di intervento built-in. Ogni
  passo è certificato da Studio Pro e ha note di fallback`
- Breadcrumb `← Back to Percorsi` in alto
- **Grid di route cards** (6 cards visibili nel mockup):
  - `Verifica telaio 2D` (active, recommended, green ribbon)
  - `Beam check` (default)
  - `Import IFC/DXF` (default)
  - `Model diagnostics` (default)
  - `Compare alternatives` (default)
  - + altre soon/locked nei mockup futuri
- Ogni card ha:
  - Icona tonale colorata (verde / blu / arancio / purple in funzione del tipo)
  - Titolo card
  - 2-3 righe descrizione
  - Pill "Start path" verde
- Sidebar destra con: Credits, "Persona in leva" panel (Workflow guidato
  / Suggerimenti intelligenti / Tieni tutto sotto controllo), AI Copilot
  card BETA, Tips card "What is Percorsi?" + "Prefer all controls from
  the start? Open Studio Pro"
- LeftRail con stesse sezioni di Home (workspace categories).
- 3 chip in basso `Step-by-step · Algorithmic guidance · Always in
  control` — i tre claim del prodotto.

---

## Componenti / pattern del mockup attualmente disponibili nel codice

- `CardGrid` pattern → riusabile da TemplateGalleryDialog.
- `PanelHub` pattern (PanelHubNav) → già in uso per Make/Solve/Verify
  hub interno, potrebbe estendersi.
- Icona tonale → già supportata via `lucide-react` + `tone-{info|success|warn|coral|purple}` token.
- Credits card → già esiste in Dashboard come `QuotaCard`.

---

## Componenti / pattern MANCANTI

- Concetto `Path` / `Percorso` come entità dello store + router pattern
  (ora c'è solo `workspace` "model/analysis/verify/docs").
- Card con stato `recommended` / `soon` / `locked`.
- Stepper / wizard "Start path" che apre un flusso multi-step distinto
  dallo Studio Pro.
- Mission Bar / "Prossimo passo" come pattern UI.

---

## Severity gap

| # | Gap | Severity |
|---|---|---|
| 1 | Concetto "Percorso" assente | **P0** — feature nuova, non refactor |
| 2 | Nessun stato `recommended/soon/locked` per card | P1 |
| 3 | Nessun stepper guidato (wizard 3-step esiste, ma per import non per Percorsi) | P1 |
| 4 | Manca pattern Mission Bar / Prossimo passo | P1 |
| 5 | 3 claim "Step-by-step · Algorithmic guidance · Always in control" non presenti | P2 |

## Stima sforzo

Implementare l'intera schermata + stato store + 1 Percorso end-to-end
(`Verifica telaio 2D`): **~10-15 giorni full-time**. Scope del **Demo
Slice "Verifica telaio 2D"**, non di un refactor.

## Raccomandazione

**Schermata non implementata, gap completo, vedi Product Alignment Sprint
+ Demo Slice**. Il brief stesso dice di non implementare ora i Percorsi
completi. Per Product Alignment Sprint basta:
- Placeholder bottone "Percorsi" su Home (CTA secondaria che apre un
  toast `Percorsi · disponibili da v1.8`)
- Riservare il concetto `Path` nel codice senza implementarlo.
