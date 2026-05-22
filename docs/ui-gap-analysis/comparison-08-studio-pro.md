# Confronto · Mockup 08 — Studio Pro / same model from Percorsi

**Mockup target**: `docs/mockups-reference/08_studio_pro_same_model_from_percorsi.png`
**Screenshot attuali**: `desktop-02-dashboard-with-model.png` (approssimazione) + tutti i panel-* attuali combinati

---

## Stato

🟡 **PARZIALMENTE PRESENTE**. Studio Pro è in sostanza la UI attuale
(workspace shell + LeftRail Make/Solve/Verify + RightRail Inspect/View/
Tools + viewport centrale). Il mockup mostra come dovrebbe apparire una
volta che:
- l'utente apre il modello DAL Percorso (badge "Updated from Percorsi ·
  Verifica telaio 2D" nel header viewport);
- la sidebar destra è densa e persistente (Model info + Analysis summary
  + Results overview + "Synced with Percorsi" note + link Verifica
  telaio 2D back);
- la LeftRail è organizzata per sezioni categoriali con label uppercase.

⚠ **Limite di questo audit**: backend offline ha impedito il caricamento
dei template (Galleria template "Nessun template caricato"). Gli
screenshot `desktop-03..09` (Make/Solve/Verify/View hub + dialoghi) sono
stati catturati **senza modello effettivamente caricato**, quindi
mostrano gli hub vuoti / disabled. Il confronto 08 è basato sulla
struttura osservata negli screenshot empty + conoscenza diretta del
codice.

---

## Layout e struttura

### Cosa coincide (Studio Pro shell esiste)
- Viewport centrale con 3D model + HUD chip top-left.
- Topbar con search + AI button + crediti + avatar.
- LeftRail (slide-in) con Make / Solve / Verify drill-in.
- RightRail (slide-in) con View / Inspect / Tools.
- Bottom statusbar con offline/online indicator.
- Tab nel pannello modello (Model / Loads & BCs / Mesh / Run / Checks).
- Preset viewport (Tecnica / CAD / Review / Performance) — v1.6.1.

### Cosa diverge nella struttura
- **Badge "Updated from Percorsi · Verifica telaio 2D"** sopra il viewport
  (mockup): indica che il modello è stato aperto/aggiornato da un
  Percorso, e cliccando si torna al Percorso. **Manca completamente**.
- **Sidebar destra densa persistente** (non slide-in):
  - `Model information` card (nome, autore, tipo analisi)
  - `Analysis summary` card (tempo, # iter, convergenza, status)
  - `Results overview` card (UC max, max disp, link "Full report")
  - `Synced with Percorsi` note (sync indicator + back link)
- Attuale: RightRail è slide-in che si apre con click sull'icona. Quando
  chiuso, mostra solo icone strette → poca info persistente.
- **LeftRail con sezioni categoriali**: target ha label uppercase
  `WORKSPACES / MAKE / ANALYSIS SETUP / RESULTS / TEMPLATES / EXAMPLES /
  DOCUMENTATION / RELEASE NOTES` con sotto-voci. Attuale: icone flat
  senza sezioni.
- **Top header del viewport** target: `Studio Pro · Pro [badge] · Verifica telaio 2D · ✎` con bottone edit nome + dropdown profile. Attuale: HUD chip diverso.

### Cosa è completamente mancante
- Concetto "modello sincronizzato con Percorso" (data model + UI).
- Sidebar destra densa always-on.
- LeftRail sezioni a label uppercase categoriali.
- Edit nome modello inline dal header viewport.

---

## Tipografia
- Target: heading "Verifica telaio 2D" 22-24px SemiBold, badge "Pro"
  pill verde inline. Attuale: solo HUD chip 11px mono.
- Target sidebar dx labels uppercase 11px tracking-wider. Attuale: rail
  icone con tooltip on-hover.

## Colore
- Target Studio Pro mostra **chip "Pro" verde** distintivo (variante
  utente premium). Attuale: nessun tier visualizzato nello shell.
- Target "Synced with Percorsi" usa verde Percorsi `#10B981`. Attuale:
  non c'è.

## Densità informativa
| | Target | Attuale |
|---|---|---|
| Info modello visibili always-on | 8-10 (model + analysis + results + sync) | 2-3 (nome + counts in HUD) |
| Card persistenti sidebar dx | 3-4 | 0 (rail è slide-in) |
| Sezioni LeftRail | 5-6 categoriali | 1 lista flat icone |

---

## Severity gap

| # | Gap | Severity |
|---|---|---|
| 1 | Badge "Updated from Percorsi" + concept sync modello-Percorso | **P0** (mantra "due porte sullo stesso modello") |
| 2 | Sidebar destra densa always-on (Model info + Analysis + Results) | **P1** (Studio Pro UX) |
| 3 | LeftRail con sezioni categoriali label-uppercase | P1 |
| 4 | Edit nome modello inline | P2 |
| 5 | Tier badge "Pro" visibile nello shell | P2 |
| 6 | Bottom toolbar (deformata / wireframe / scale) come bottom bar persistente | P2 |

## Stima sforzo

- Sidebar destra densa always-on (componenti `ModelInfoCard`,
  `AnalysisSummaryCard`, `ResultsOverviewCard`): **2 giorni**
- LeftRail sezioni categoriali (re-layout): **1-2 giorni**
- Synced-with-Percorsi data-model + UI (richiede Percorsi esistente
  prima): **1-2 giorni** (dopo Demo Slice)
- Edit nome inline + tier badge: **1 giorno**

**Totale stimato**: ~5-7 giorni di lavoro Studio Pro shell.

## Raccomandazione

- **Polish Studio Pro shell** (sidebar destra densa, LeftRail sezioni,
  edit nome): può essere fatto **come refactor visivo** prima del Demo
  Slice, perché non dipende dai Percorsi. Stima 4-5 giorni.
- **"Synced with Percorsi"**: solo dopo che Percorsi esiste.

Trade-off importante: Studio Pro shell attuale è funzionalmente
**completa e usabile**. Il refactor è solo per allineamento visivo a
mockup target. Non è demo-blocker.
