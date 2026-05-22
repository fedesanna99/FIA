# Demo Quality Checklist — FEA Pro v1.6.1-polish

> Walkthrough manuale 15-20 min su `pnpm preview` (build production) o
> https://fea-pro.fly.dev. Da rifare prima di ogni demo a ingegneri.

---

## Setup

```bash
cd frontend
pnpm build && pnpm preview      # locale, port 4173
# oppure
open https://fea-pro.fly.dev    # produzione
```

DevTools sempre aperti: tab Console + Network.

---

## A. Empty state (no model, backend OK)

- [ ] Dashboard mostra "Buongiorno, {user}" + counters (0 modelli / 0 job)
- [ ] 4 quick actions visibili: Nuovo modello · Da template · Importa file · Esempi
- [ ] LeftRail Make/Solve/Verify in **opacity 30%** (disabled fix B03)
- [ ] RightRail Inspect/View in opacity 30%, Tools enabled (NAFEMS validation funziona)
- [ ] Nessun "View" button inline accanto a QuotaCard (fix T2)
- [ ] Bell senza badge in topbar (fix T3)
- [ ] Console: 0 errori, max 1-2 warning innocui

## B. Empty state offline (backend down)

```bash
# Simulazione: ferma backend o usa --no-server in qualche modo
```

- [ ] Banner giallo "Backend/database non disponibile" visibile sopra le action
- [ ] Tutti i 4 quick action card → opacity ridotta + cursor `not-allowed` + tooltip
- [ ] **0 toast "Errore"** visibili (fix T1)
- [ ] Bell senza badge (fix T3)
- [ ] Click "Riprova" → spinner sul bottone

## C. Template loading

- [ ] Click "Da template" → apre **TemplateGalleryDialog** (NON dialog NewModel)
- [ ] 9 template visibili come card grid
- [ ] Click "Telaio portale 2D" → modello caricato
- [ ] Viewport auto-fit (camera centrata sul modello, fix B15)
- [ ] HUD chip topbar: nome modello + "N nodi · M elem · materiale"

## D. ViewPanel cockpit

- [ ] RightRail "View" apre il pannello cockpit
- [ ] **Preset row**: Tecnica / CAD / Review / Performance selezionabili
- [ ] Click "CAD" → render = Wire, projection = Orto, node labels ON
- [ ] Click "Performance" → render = Solid, Engine GPU ON, layers minimi
- [ ] Click "Tecnica" → torna alla configurazione default
- [ ] **Engine toggle**: Legacy ↔ Engine GPU. Stats "draw N · xR.R" si aggiorna
- [ ] Switch Engine 5 volte rapido → **no crash, no frame nero, no toast**
- [ ] Layer base: Griglia / Carichi / Vincoli / Nodi ID indipendenti
- [ ] Risultati overlay: deformata/colormap/diagrammi **disabled** senza analisi (fix B16)

## E. Workflow base con backend

- [ ] Click su un elemento → apre **ElementDialog** (no doppio click)
- [ ] "Cambia sezione" → **SectionPicker mostra 100+ sezioni** (fix B13)
- [ ] Filter "HEB" → lista filtrata
- [ ] Click "HEB 240" → conferma → vista aggiornata
- [ ] Click bottone "Esegui" → chip running in topbar (fix B17)
- [ ] Topbar mostra chip "Static · running" + progress %
- [ ] A fine analisi: toast "Analisi completata"
- [ ] RightRail "View" → Deformata toggle **enabled** (fix B16)
- [ ] Toggle ON → deformata visibile in viewport
- [ ] Diagrammi N/V/M nel viewport
- [ ] "Esporta PDF" → download del report

## F. Dismiss UX

- [ ] Ctrl+K apre command palette (placeholder "Cerca")
- [ ] ESC chiude palette
- [ ] Riapri + click su backdrop scuro fuori dal dialog → chiude (fix B02)
- [ ] Aprire un wizard (Import) + click backdrop → chiude
- [ ] **Mobile (responsive devtools)**: hardware back (Alt+←) chiude modal aperto (fix B08)

## G. Errori

- [ ] Crea modello vuoto (senza vincoli) + Esegui statica
- [ ] Toast errore con messaggio italiano: "Aggiungi almeno un vincolo prima di lanciare l'analisi..." (fix B05)
- [ ] **NESSUN `[object Object]` da nessuna parte**

## H. Multi-device

- [ ] Resize browser a 768px (mobile breakpoint): tabbar in basso visibile
- [ ] LeftRail/RightRail nascosti su mobile
- [ ] Mobile tab "Altro" mostra menu con: Verifiche / View / Strumenti / Cerca / AI Copilot / Tema / Account / Focus
- [ ] Theme dark/light: bell color OK, contrast OK in entrambi

---

## Risultati

| Sezione | Esito |
|---|---|
| A. Empty state | ☐ pass · ☐ blocker · ☐ minor |
| B. Empty offline | ☐ pass · ☐ blocker · ☐ minor |
| C. Template loading | ☐ pass · ☐ blocker · ☐ minor |
| D. ViewPanel cockpit | ☐ pass · ☐ blocker · ☐ minor |
| E. Workflow base | ☐ pass · ☐ blocker · ☐ minor |
| F. Dismiss UX | ☐ pass · ☐ blocker · ☐ minor |
| G. Errori | ☐ pass · ☐ blocker · ☐ minor |
| H. Multi-device | ☐ pass · ☐ blocker · ☐ minor |

**Tempo totale walkthrough**: __ min (target < 20 min)

Se uno dei checkpoint blocca → **NON firmare lo sprint**. Apri issue, fixa,
ri-walkthrough.
