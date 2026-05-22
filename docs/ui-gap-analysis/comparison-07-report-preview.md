# Confronto · Mockup 07 — Report Preview / Trust Layer

**Mockup target**: `docs/mockups-reference/07_report_preview_trust_layer.png`
**Screenshot attuali**: **nessuno** — schermata non implementata.

---

## Stato

🔴 **GAP COMPLETO** per la "report preview" come schermata in-app.

Esiste lato codice:
- `frontend/src/shell/panels/tools/ExportView.tsx` — export rapido (PDF
  client-side via jsPDF / html2canvas).
- `frontend/src/components/panels/ExportServerPanel.tsx` — export server
  (PDF reportlab, XLSX, DXF, IFC4).

Ma **non esiste un'anteprima del report dentro la UI**: l'utente clicca
"Esporta PDF" e ottiene un download, senza vedere prima cosa contiene.

---

## Cosa mostra il mockup target

- Header "Report preview" con metadata (Verifica telaio 2D · 2026-05-22 · v1.6.1)
- **Anteprima pagina report** centrale (a4 portrait, sfondo bianco con
  layout grafico del report):
  - Titolo "Verifica telaio portale 2D"
  - Sezioni: Modello / Input / Carichi / Risultati / Critical elements
  - Tabella risultati con UC per elemento
  - Plot deformata embedded
  - Footer con autore / firma / hash blockchain (Trust Layer)
- **Sidebar destra**:
  - `Trust Layer · Verified` badge verde
  - Box "What is Trust Layer?" con bullet list:
    - Hash canonical input
    - Hash canonical output
    - Verifica indipendente
    - Audit log immutabile
  - Action: `Sign report (BETA)`, `Copy hash`, `Download PDF`
- **Footer**: paginazione "1 di 4" del report + zoom in/out.

---

## Componenti disponibili

- Export PDF backend `/api/export/pdf/{id}` (reportlab) → esiste.
- Hash canonico → menzionato in BACKLOG ma non implementato.
- Trust Layer → solo concetto in roadmap, no implementazione.

## Componenti MANCANTI

- **Anteprima PDF inline** (canvas o iframe del PDF blob) → non esiste.
- **Trust Layer UI** (hash + verify + sign): nessun componente.
- **Sezione "What is Trust Layer?"**: educational panel non esiste.

## Severity gap

| # | Gap | Severity |
|---|---|---|
| 1 | Anteprima report in-app | **P1** (UX critica per "trust") |
| 2 | Trust Layer come feature backend + UI | **P0** — differenziatore prodotto |
| 3 | Sign / Hash / Verify actions | P1 |
| 4 | Educational panel Trust Layer | P2 |

## Stima sforzo

- Anteprima PDF inline (riusando jsPDF blob o backend stream): **2 giorni**
- Trust Layer end-to-end (backend hash canonico + UI badge): **5-8 giorni**

## Raccomandazione

**Schermata non implementata, gap completo**. Scope post-Demo Slice (è
una feature trasversale che richiede lavoro backend serio sul hash
canonico e audit log).

Per la demo iniziale: basta il PDF download attuale, senza preview e
senza Trust Layer.
