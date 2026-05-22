# Confronto · Mockup 05 — Model ready / Run analysis (Compute profiles)

**Mockup target**: `docs/mockups-reference/05_model_ready_run_analysis_compute_profiles.png`
**Screenshot attuali**: `desktop-05-solve-hub.png` (approssimazione di struttura diversa)

---

## Stato

🟡 **PARZIALMENTE PRESENTE come Solve hub interno**, ma con
**filosofia diversa**:
- Mockup: pagina Percorso step 4/5, validation summary in alto, compute
  profile cards al centro, primary Run come bottom-bar prominente.
- Attuale: Solve panel hub con 4 cards `Lineari · Dinamica · Sismica ·
  Non-lineari`. È un menu di analisi, non uno step "model ready".

---

## Layout e struttura

### Cosa coincide
- Concetto "scegli che analisi lanciare prima del Run" presente in entrambi.
- Cost preview esiste lato codice (`CostPreviewDialog`, `useCostPreview`).
- Job system async esiste (Sprint 0 B17 chiuso) → "running chip topbar"
  funziona.

### Cosa diverge
- **Validation summary** in alto nel target (banner "Model ready · 12
  nodi · 11 elementi · 2 vincoli · 4 carichi · gravity ON" con check
  verdi). Attuale: solo HUD chip nel viewport con `N nodi · M elem`, no
  summary "model ready" dedicato.
- **Compute profile cards** target: 3 card (Standard / Pro / Max) con
  diversa qualità mesh, tempo stimato, crediti consumati, qualità report.
  Attuale: Solve hub mostra solo le 4 TIPOLOGIE di analisi (statica vs
  dinamica vs ...), non i profili di potenza.
- **Estimated time + estimated credits** prominenti nel target. Attuale:
  cost preview esiste ma è dialog separato che si apre on-click.
- **Primary Run button** bottom-bar nel target. Attuale: bottone Run è
  in topbar globale.

### Cosa è mancante (attuale)
- Profili compute Standard/Pro/Max come UI scelta esplicita.
- Banner "Model ready" pre-run con summary validation.
- Crediti consumati visualizzati inline al profilo.

---

## Tipografia
- Target heading: "Pronto a lanciare l'analisi?" ~32px / attuale: nessun
  heading hero in Solve hub (solo PanelBreadcrumb "← Solve").

## Colore
- Target compute cards: blu (Standard) · purple (Pro) · gradient/coral (Max)
  → famiglia per "potenza crescente".
- Attuale Solve hub cards: tono `success` per Lineari, `purple` per
  Dinamica, `coral` per Sismica, `warn` per Non-lineari → famiglia
  per "tipo di analisi".

## Densità informativa
| | Target | Attuale |
|---|---|---|
| Decisioni richieste all'utente in 1 page | 1-2 (profilo + Run) | 2 (tipo analisi + parametri) |
| Info contestuali (count/credits/time) | 4-6 inline | 0-1 inline (solo nei dialog) |
| Step/breadcrumb chiaro | sì (4/5 Percorso) | no (è hub libero) |

---

## Severity gap

| # | Gap | Severity |
|---|---|---|
| 1 | Manca concept "Model ready" come step Percorso | **P0** (Demo Slice) |
| 2 | Manca scelta compute profile Standard/Pro/Max | **P1** — feature monetization core |
| 3 | Manca validation summary banner pre-run | P1 |
| 4 | Cost preview esiste ma è in dialog separato | P2 |
| 5 | Run button non in bottom-bar prominente in flusso Percorso | P2 (Studio Pro va bene topbar) |

## Stima sforzo

- Implementare `ComputeProfileCards` + `ValidationSummaryBanner` + cost
  preview inline: **~4-5 giorni**.
- Wire crediti spent / tier → cost preview esistente: **~1 giorno** di
  integrazione.

## Raccomandazione

**Per Studio Pro** (Solve hub attuale): polish accettabile, nessun fix
ora.

**Per Percorso (Demo Slice)**: schermata da progettare ex-novo riusando
`CostPreviewDialog` + jobsStore esistenti. Scope Demo Slice "Verifica
telaio 2D".
