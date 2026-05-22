# Confronto · Mockup 03 — Percorso Verifica telaio 2D / Step Geometry

**Mockup target**: `docs/mockups-reference/03_percorso_telaio_2d_step_geometry.png`
**Screenshot attuali**: **nessuno** — schermata non implementata.

---

## Stato

🔴 **GAP COMPLETO**. Step Geometria di un Percorso guidato. Non esiste.

Lo screenshot più vicino del codice attuale è `desktop-04-make-geometria.png`
(Make panel → Geometria drill-in), ma:
- Make panel è un **pannello laterale di Studio Pro** (RightRail-style slide-in).
- Non è uno **step in un flusso guidato** con stepper, draft saved, prossimo passo.
- Non c'è preview 2D dedicato al passo (il viewport è quello globale).

---

## Cosa mostra il mockup target

- TopBar mostra breadcrumb `Percorsi · Verifica telaio 2D · Step 1 di 5 — Geometria`.
- **Stepper orizzontale** in alto con 5 step (Geometria · Vincoli · Carichi · Run · Risultati), step 1 attivo verde, 2-5 grigi.
- **Form sx**: tipologia (Telaio 2D / Trave continua / Mensola), dimensioni (Larghezza/Altezza/Numero campate), sezione (radio Default S275 IPE 270 / Custom).
- **Preview 2D centrale**: viewport semplificato con la geometria che si aggiorna live mentre l'utente compila il form. Scale indicator + units.
- **Pannello destro `Why we ask this`**: spiegazione contestuale del perché serve quel dato, in linguaggio non infantile.
- **Footer azioni**: "Salva bozza" (sx, draft saved 5 sec fa), "Annulla", "Prossimo passo →" (primary green Percorsi).
- LeftRail con "PERCORSO ATTIVO · Verifica telaio 2D" badge dedicato.

---

## Componenti del mockup parzialmente disponibili

- `WizardShell` esiste (`frontend/src/components/dialogs/wizards/`) per ImportWizard + SismicaTHWizard 3-step, **pattern simile**.
- Preview 2D viewport: `Viewport3D` riusa la stessa pipeline ma con preset Orto, **disponibile**.
- Form input + radio selection: pattern UI già esistente.
- Footer azioni con primary + cancel: pattern già esistente in dialog.

## Componenti MANCANTI

- **Stepper orizzontale persistente** (top fixed) con 5 step → non esiste. WizardShell ha stepper interno al modal, non in shell layout.
- **`Why we ask this` panel contextual** → pattern non esiste. Probabilmente serve un nuovo componente `ContextualHelpPanel`.
- **Draft saved indicator** (5 sec fa) → utile generalizzazione di `lastSavedAt` già esistente in TopBar.
- **Path-specific routing** → non c'è. Per ora wizard sono dialog modal, non page.

## Severity gap

| # | Gap | Severity |
|---|---|---|
| 1 | Concetto step in Percorso non esiste come page-level | **P0** — feature nuova |
| 2 | Stepper top-bar persistente | P0 |
| 3 | `Why we ask this` contextual panel | P1 |
| 4 | Preview live durante form input | P1 |
| 5 | Draft saved badge contestuale step | P2 |

## Stima sforzo

Implementare lo step Geometria del Percorso telaio 2D end-to-end:
**~3 giorni** (form + preview + Why + state machine step 1/5).

## Raccomandazione

**Schermata non implementata, gap completo. Scope del Demo Slice
"Verifica telaio 2D"**. Non implementare prima di aver concordato il
data-model di "Path" + "Step".
