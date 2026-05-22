# Confronto · Mockup 04 — Percorso / Supports and Loads

**Mockup target**: `docs/mockups-reference/04_percorso_supports_and_loads.png`
**Screenshot attuali**: **nessuno** — schermata non implementata.

---

## Stato

🔴 **GAP COMPLETO**. Step Vincoli+Carichi di un Percorso guidato. Non esiste.

Riferimenti parziali nel codice attuale:
- `LoadDialog.tsx` e `ConstraintDialog.tsx` — dialog modali per
  aggiungere/editare un carico o vincolo singolo.
- Make panel → Vincoli + Carichi → form di aggiunta.

Entrambi sono strumenti di Studio Pro, non step guidati.

---

## Cosa mostra il mockup target

- Stepper persistente con Step 2 di 5 attivo (Vincoli + Carichi).
- **Sezione "Vincoli"** sopra: 4 card grandi tonali (Incastro / Cerniera /
  Carrello / Personalizzato), ciascuna con icona simbolica + descrizione
  breve + claim "Quando usarlo".
- **Sezione "Carichi"** sotto: input form (tipo, valore, posizione)
  semplificato + toggle "Includi peso proprio" + preview 2D del modello
  con i carichi che appaiono live.
- Pannello dx `Why these supports matter` con spiegazione contestuale
  dei vincoli — segue la regola UX `Spiegare al momento giusto, non
  spiegare tutto sempre`.
- Banner `Per controlli avanzati: Open Studio Pro` come escape hatch
  verso Studio Pro per modifiche fini.
- Footer azioni: "← Indietro · Salva bozza · Validate model · Prossimo passo →".

---

## Componenti disponibili

- `LoadDialog` / `ConstraintDialog` esistono → la logica c'è.
- Validation report endpoint `/api/validation/report` esiste (NAFEMS) → si
  può riusare per "Validate model".
- Toggle `Includi peso proprio` (gravity) esiste come parametro nello
  store analisi.

## Componenti MANCANTI

- Card tonali grandi per "scegliere il vincolo" come step educativo →
  pattern non esiste. Il flow attuale è "scegli il nodo, poi nel form
  scegli il tipo".
- `Why these supports matter` contextual panel → idem mockup 03.
- "Validate model" pre-run come gate → backend ha `/api/validation/report`
  ma UI di sintesi pre-run non c'è.
- Banner "Open Studio Pro" come escape hatch.

## Severity gap

| # | Gap | Severity |
|---|---|---|
| 1 | Step Vincoli+Carichi in Percorso non esiste | **P0** — feature nuova |
| 2 | Card tonali "scegli il vincolo" educative | P1 |
| 3 | Contextual help panel `Why ...` | P1 |
| 4 | "Validate model" gate pre-run con sintesi UI | P1 |
| 5 | Banner escape hatch verso Studio Pro | P2 |

## Stima sforzo

End-to-end (cards vincoli, form carichi, validate-summary, contextual
panel): **~3-4 giorni**.

## Raccomandazione

**Schermata non implementata, gap completo. Scope del Demo Slice
"Verifica telaio 2D"**.
