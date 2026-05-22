# Confronto · Mockup 06 — Critical view / GPS Strutturale

**Mockup target**: `docs/mockups-reference/06_results_critical_view_gps_strutturale.png`
**Screenshot attuali**: `desktop-07-view-panel.png` + post-solve approssimato

---

## Stato

🟡 **PARZIALE**. La view post-solve esiste come ViewPanel cockpit
(v1.6.1) con preset Engineer/CAD/Review/Performance + toggle Deformata.
**Manca completamente il concetto di "Critical view / GPS Strutturale"**
come pannello dedicato che indica all'utente "dove guardare e cosa fare
dopo" via rule-engine algoritmico (algoritmo > AI).

Questa è la **feature killer visiva** del prodotto, espressamente NON
implementare ora secondo la guida mockup pack.

---

## Layout e struttura

### Cosa coincide
- Viewport centrale con modello renderizzato + deformata.
- Legend colormap inferiore (stress / displacement / utilization).
- Toggle bottom: deformata / wireframe / scale slider.
- HUD chip top-left "Updated 5 min ago · Linear Static" (mockup) vs
  attuale `N nodi · M elem · materiale`.

### Cosa diverge nella struttura
- **Heading `Critical view / GPS strutturale`** target con sub-titolo
  "Sketch and drag the result, the analysis is grouped by criticality".
- **Sidebar destra GPS**: card prominente `B1 · 0.88 UC max · critical
  element` con accent rosso. Sotto: `Insight panel` con frasi tipo
  "Element B1 has a UC max of 0.88 in the lower bound governing the load
  case" + `Why this matters` panel sottostante.
- **Sidebar destra Next step**: "Run a deeper non-linear check" pulsante.
- **Sidebar destra "Documents"**: link "Open Studio Pro · Open Verify
  telaio 2D".
- **Indicatore criticità nel viewport**: l'elemento B1 ha un highlight
  rosso/arancio + marker laterale con UC value direttamente in 3D.
- **Top breadcrumb**: `Percorsi · Verifica telaio 2D · Risultati`.

### Cosa è completamente mancante (attuale)
- "Critical view" come modalità del viewport (rule engine che identifica
  elementi critici e li mette in evidenza).
- `Insight panel` testuale che spiega cosa sta succedendo.
- `Why this matters` contextual panel.
- `Next step` pulsante (Bussola Strutturale → suggerisce ciò che fare).
- Sidebar destra densa con card "Critical element" + UC max numerica.
- Highlight 3D selettivo dell'elemento critico nel viewport.

---

## Tipografia
- Target: heading 28px SemiBold "Critical view / GPS strutturale" / attuale: solo PanelBreadcrumb mini.
- Target UC numero: ~40px Bold Tabular ("0.88") prominente in card. Attuale: nessun equivalente.

## Colore
- Target accent critical: rosso saturato `#EF4444` + tinted bg `#FEE2E2`
  per card UC max. Famiglia "critical" distinta da "danger errori".
- Attuale: solo `danger #C62828` per errori HTTP, no famiglia critical
  semantica.

## Densità informativa
| | Target | Attuale |
|---|---|---|
| Indicatori risultato visibili in viewport | 4-5 (label B1 + UC chip + colormap + deformata + grid) | 2-3 (deformata + colormap) |
| Card insight / contextual | 3 (Critical · Insight · Why · Next step) | 0 |
| Suggerimenti azione successiva | 1 prominente (Run non-linear) | 0 |

---

## Severity gap

| # | Gap | Severity |
|---|---|---|
| 1 | "Critical view" / GPS Strutturale non esiste come feature | **P0** — feature killer prodotto futuro |
| 2 | Insight panel rule-engine | **P0** (algoritmo > AI, deve essere algoritmico) |
| 3 | Card "Critical element" con UC max prominente | **P1** |
| 4 | Highlight 3D selettivo elemento critico | P1 |
| 5 | Sidebar destra densa post-solve (insight + next step) | P1 |
| 6 | Token `--c-critical` distinto da danger | P2 (vedi tokens audit) |
| 7 | Mancano i Next step suggeriti | P1 |

## Stima sforzo

- **Rule engine criticità** (backend o frontend?): 5-7 giorni per
  primo iter su un singolo Percorso (telaio 2D)
- **Critical view UI** (card + insight + highlight 3D): 3-4 giorni
- **Integration con risultati esistenti** (`/api/analysis/static/{id}`):
  2 giorni

**Totale stimato**: ~10-13 giorni per la feature killer end-to-end.

## Raccomandazione

**Scope del Demo Slice "Verifica telaio 2D"**. La feature è il vero
differenziatore del prodotto. Implementarla SOLO dopo che il Percorso
end-to-end (mockup 02-07) ha una base. Non come standalone su Studio Pro.
