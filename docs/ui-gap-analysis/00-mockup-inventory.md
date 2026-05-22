# Mockup target inventory · v0.3

> Pacchetto sorgente: `FEA_PRO_FULL_EXPORT_v0_3_DOCS_MOCKUPS.zip`, cartella
> `03_mockups_new_pack/`. File copiati in `docs/mockups-reference/`.

## File presenti (8/8 ✅)

| # | File | Risoluzione | Scopo (estratto da `04_mockup_annotations/MOCKUP_PACK_GUIDE_FOR_CLAUDE.md`) |
|---|---|---|---|
| 01 | `01_home_no_model_studio_pro_vs_percorsi.png` | 1920×1080 | Home / no model — empty state pulito con CTA doppia Studio Pro / Percorsi; pannelli modello-specifici disabilitati o non visibili |
| 02 | `02_percorsi_path_selection.png` | 1920×1080 | Galleria Percorsi (route cards), stato attivo/soon, "Step-by-step / Algorithmic guidance / Always in control", link Open Studio Pro |
| 03 | `03_percorso_telaio_2d_step_geometry.png` | 1920×1080 | Percorso "Verifica telaio 2D" step Geometria — stepper, form semplice, preview 2D, draft saved, "Prossimo passo" |
| 04 | `04_percorso_supports_and_loads.png` | 1920×1080 | Step Supports + Loads — support cards, load input, toggle self-weight, "Validate model", link nota Studio Pro |
| 05 | `05_model_ready_run_analysis_compute_profiles.png` | 1920×1080 | Model ready / Run analysis — validation summary, compute profile cards, estimated credits/time, primary Run |
| 06 | `06_results_critical_view_gps_strutturale.png` | 1920×1080 | Critical view / GPS Strutturale — critical element, UC max, insight panel, "Prossimo passo", generate report |
| 07 | `07_report_preview_trust_layer.png` | 1920×1080 | Report preview — prima versione semplice, dati run/modello/criticità, note Trust Layer, export PDF |
| 08 | `08_studio_pro_same_model_from_percorsi.png` | 1920×1080 | Studio Pro vista completa sullo stesso modello aperto da Percorsi (mai modelli paralleli) |

## Mockup secondari / di contesto

`02_mockups_old_reference/` contiene 3 immagini old + 6 context raw — **non**
sono target di questo audit, sono riferimenti storici da cui Studio Pro
moderno deriva. Citati qui per completezza:
- `01_old_reference_desktop_workspace.png`
- `02_old_reference_extra_panels.png`
- `03_old_reference_mobile_tablet.png`

## Filosofia espressa dai mockup (estratta dalla guida)

- Studio Pro e Percorsi sono **due porte sullo stesso modello**. Mai
  modelli paralleli, mai export/import interno, mai stati divergenti.
- Percorsi è "a prova di chiunque" ma **non banalizza** la responsabilità
  tecnica.
- GPS Strutturale / Bussola Strutturale è **algoritmico**: algoritmo > AI,
  rule engine deterministico, non AI libera.
- View Engine deve far capire "cosa manca, cosa è critico, cosa guardare,
  cosa fare dopo" (= "prossimo passo").
- Crediti **trasparenti**, collegati a potenza usata. *"I crediti non
  comprano verità diversa. Comprano tempo, profondità, controlli,
  priorità e potenza computazionale."*

## Stato di implementazione atteso (per fase)

| Mockup | v1.6.1-stabilization (now) | Product Alignment Sprint | Demo Slice telaio 2D |
|---|---|---|---|
| 01 | usare solo come contesto | naming Studio Pro / Percorsi, CTA doppia | — |
| 02 | usare solo come contesto | placeholder (non funzionale) | — |
| 03 | — | predisposizione architetturale | implementazione completa |
| 04 | — | — | implementazione completa |
| 05 | — | — | implementazione completa |
| 06 | — | — | implementazione completa |
| 07 | — | — | implementazione completa |
| 08 | usare solo come contesto | — | post-Demo Slice (vista parallela) |

Questo audit (UI Gap Analysis) **non implementa nulla**: misura solo la
distanza attuale.
