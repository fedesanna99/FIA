# ADR 006 — Templates professional-grade (TPL-1..8) + SYNC catalog

- **Data**: 30/05/2026 sera-notte
- **Stato**: 🟢 CHIUSO 30/05/2026 notte (8 template + SYNC + ROADMAP entry)
- **Predecessori**: ADR 005 Demo Slice v1.9 (`005-demo-slice-v1-9.md`),
  fetta GAL del 30/05 sera (template inventory fix con esorcismo 6 fantasmi)
- **Successore atteso**: ADR 007 quando un nuovo filone aprirà
  (eg. v1.10 AI Copilot funzionale o "ulteriori categorie strutturali")

## Contesto

Pre-serie: catalogo `backend/examples.py` aveva 9 template **benchmark
accademici** (5-72 nodi tipo NAFEMS LE1, rigorosi per validazione solver
ma percepiti come "demo da università" dall'audience target).

Paolo (co-founder + ing civile PoliTo, target persona) ha detto a
Federico: *"servono strutture con centinaia e più nodi"*. Federico ha
richiesto template "che assomigliano a problemi reali del professionista
italiano".

## Problema

I FEM commerciali seri (SAP2000 / Midas / ETABS / RFEM / STAAD / Robot)
**non** espongono benchmark accademici nelle sample library: mostrano
edifici interi 3-15 piani, capannoni completi, tralicci, platee —
**tipicamente 200-5000 nodi**. Il nostro divario è di 10× — culturale
prima che tecnico.

## Decisione

**Serie TPL-1..8** in 8 commit atomici consecutivi, riusando ESCLUSIVAMENTE
gli element types già nel solver (BEAM2D/BEAM3D/TRUSS3D/SHELL_Q4/T3/SOLID_H8/
CABLE2D + Constraint SPRING per Winkler) — zero touch al solver.

| TPL | Nome · ID backend | Nodi · Elem | Tipo | Norme |
|---|---|---|---|---|
| 1 | Edificio CA 4 piani · `ex_rc_building_4st` | 585 · 500 | BEAM3D + SHELL_Q4 | NTC §4.1/§7.4, EC2, EC8 §5 |
| 2 | Capannone acciaio 1 campata · `ex_steel_portal_hall` | 81 · 100 | BEAM3D + TRUSS3D | NTC §4.2, EC3, EC1-1-4 |
| 3 | Capriata Pratt L=24m · `ex_steel_truss_pratt_24m` | 24 · 45 | TRUSS3D | EC3 §6.3, NTC §4.2 |
| 4 | Telaio CA 2D 5×3 pushover · `ex_rc_frame_2d_pushover` | 24 · 33 | BEAM2D | NTC §7.4/§7.8.1, EC8 §4.3.3 |
| 5 | Solaio CA + travi · `ex_rc_floor_with_beams` | 425 · 440 | SHELL_Q4 + BEAM3D | NTC §4.1, EC2 |
| 6 | Muro sostegno plane-strain · `ex_retaining_wall_2d` | 186 · 150 | SHELL_Q4 (membrana 2D) | NTC §6.5, EC7-1 |
| 7 | Ponte trave isostatica L=20m · `ex_bridge_simple_span_20m` | 189 · 276 | SHELL_Q4 + BEAM3D | NTC §5, EC1-2, EC2-2 |
| 8 | Platea fondazione Winkler · `ex_raft_winkler` | 525 · 480 | SHELL_Q4 + 525 SPRING | NTC §6.4, EC7 |

**Fetta SYNC intermedia** (commit `4f1cf16`, tra TPL-1 e TPL-2): bug
"10 cards home vs 9 modale" segnalato live da Federico → estratto
`frontend/src/templates/catalog.tsx` come **single source of truth UI**
(TEMPLATES_CATALOG + VARIANT_THUMBS registry). Da quel commit, i 3
consumer (TemplateGallery / TemplatesPage / TemplateGalleryDialog)
importano dallo stesso modulo. Aggiungere un template = 1 voce in
catalog + 1 builder backend → appare automaticamente ovunque.

## Convention cristallizzate

### 1. Pattern "1 fetta TPL = 1 commit atomico"

Per ogni nuovo template:
1. `backend/examples.py` — builder Python procedurale (nx/ny div +
   `node_id(i, j)` helper deterministico) + voce in
   `build_example_models()` lista finale
2. `backend/tests/test_examples.py` — voce in `ALL_EXAMPLES`
   (test_static_runs_without_errors parametric ne copre il solve) +
   2-3 test dedicati (geometry counts + reactions balance OR
   spostamento finito per modelli senza reaction classica)
3. `frontend/src/templates/catalog.tsx` — voce in
   `TEMPLATES_CATALOG` (nuovo `id: "tN"` consecutivo) + nuova
   variant nell'enum `TemplateVariant` + nuova `XxxThumb` SVG +
   voce in `VARIANT_THUMBS` registry
4. `frontend/src/templates/catalog.test.ts` — voce in
   `BACKEND_TEMPLATE_IDS_GROUND_TRUTH` + incremento `toHaveLength(N)`
   nel test "ha esattamente N voci"
5. Restart backend per re-seed via `seed_examples()` (locale: stop+
   start preview; deploy: Fly riavvia il container fresh)
6. `git commit -m "feat(templates): <nome> (TPL-N)"` con body descrittivo

### 2. ⚠️ Convention orientamento elementi (CRITICA · bug TPL-4 fix)

- **BEAM2D**: vive nel piano X-Y (Y = asse verticale, gravità in `-fy`).
  NON nel piano X-Z. Pattern di riferimento in `example_portal_frame_2d`
  e `example_simple_beam_2d`. Carichi pushover orizzontali = `fx`.
- **BEAM3D**: 3D nativo, `orientation=[0, 0, 1]` di default per
  pilastri verticali. Z = asse globale verticale.
- **SHELL_Q4**: nel piano X-Y normalmente (z=0 per tutti i nodi),
  carichi nodali `fz` = fuori-piano. Per plane-strain approssimato
  (es. muro TPL-6 in sezione), si modella nel piano X-Y dove Y =
  verticale della sezione.
- **TRUSS3D**: 3D nativo, posiziona dovunque.
- **SOLID_H8**: 8 nodi cubici, qualsiasi orientamento.

Sanity: dopo aver scritto il builder, **lancia subito `python -c "from
examples import example_X; m = example_X(); print(len(m.nodes), ...)"`**
per verificare counts + bbox prima del pytest completo. Il test
parametric `test_static_runs_without_errors[X]` triggera il solver e
catch "Elemento beam2d con lunghezza nulla" se la geometria è sbagliata
(es. nodi coincidenti per orientamento errato).

### 3. ⚠️ Convention ROLLER (cristallizzata da MEMORIA storica)

`ConstraintType.ROLLER_<asse_bloccato>` blocca l'asse, NON lo lascia
libero. Opposta a Ansys/SAP. Esempio: `ROLLER_Y` su carrello di una
trave 2D blocca `uy` (verticale) e lascia `ux` libero (rolling
orizzontale).

### 4. Pattern Winkler nativo (TPL-8)

Il solver supporta supporti elastici nodali via:
```python
Constraint(
    id=N, type=ConstraintType.SPRING, node_id=X,
    spring_k=[k_x, k_y, k_z, k_rx, k_ry, k_rz]  # 6 DOF
)
```
Per Winkler 2D/3D: `spring_k=[k_xy, k_xy, k_w * area_trib, 0, 0, 0]`
con piccola rigidezza orizzontale `k_xy` per evitare moto rigido
nel piano.

⚠️ Σ Fz reazioni == 0 con SPRING (k·u è force interna, non reaction
classica). Validazione via `max_displacement` finito + fisicamente
ragionevole. Benchmark Hetenyi gia' presente in
`backend/tests/benchmarks/test_winkler_beam.py`.

### 5. Pattern UI variant + SVG (SYNC catalog)

In `frontend/src/templates/catalog.tsx`:
- Estendi `TemplateVariant` enum (es. `"warehouse"`, `"frame2d"`)
- Aggiungi `XxxThumb` function (stile coerente: `viewBox="0 0 280 160"`,
  `stroke="var(--ink)"`, `accent="var(--coral)"`)
- Registra in `VARIANT_THUMBS` mapping
- Le SVG sono "schematic engineering drawings": vista sezione/laterale/
  dall'alto, frecce per carichi, hatch per appoggi, no decorazioni

### 6. Test consistency catalog ↔ backend (no fantasmi futuri)

`catalog.test.ts` mantiene hardcoded `BACKEND_TEMPLATE_IDS_GROUND_TRUTH`
+ assert match 1:1 con `TEMPLATE_BACKEND_IDS`. Se aggiungi al backend
ma dimentichi catalog (o viceversa), il test fallisce esplicito.
Onesto: aggiungere un template = aggiornare ground truth ESPLICITAMENTE
(forza l'attenzione).

## Conseguenze

### Sostenibili end-to-end
- **Catalogo 17 template** (era 9 pre-serie), tutti realmente serviti
  dal backend e mostrati in UI sincronizzata
- **38 pytest verdi** in 7.60s (era 16 pre-serie, +22 nuovi test:
  2-3 per template + parametric)
- **1166 vitest verdi** invariato + 11 nuovi test consistency catalog
- Zero touch al solver / store di dominio / viewport engine

### Sezioni e materiali aggiunti
- `shell_t600` (60cm) in `SECTIONS_DB` per platea CA fondazione TPL-8
- Nessun nuovo materiale (concrete_c25, concrete_c30 già esistenti)

### Da fare in fette future (NON TPL-1..8)
- ⚠️ **Test backend approfonditi** per i nuovi template (oggi solo
  geometry + reactions/disp balance basic. Mancano: verifica EC stress,
  comparazione con formula analitica, modali per quelli che la fanno)
- **Validazione plane-strain** TPL-6 (oggi approssimato con shell t=20cm)
  — eventuale solver dedicato plane-strain in futuro
- **Carichi mobili LM1 reali** TPL-7 (oggi solo TS statico al centro,
  manca UDL distribuito + posizionamento più realistico)
- **Suola di fondazione** TPL-6 (oggi solo muro verticale, manca suola
  per dimensionamento realistico)
- **Pushover analysis pipeline UI** per TPL-4 (oggi modello pronto ma
  la UI non offre il workflow pushover incrementale dedicato)

### Deploy
**Pre-deploy**: 10 commit locali (`4bb8c65..b76f6b2`) accumulati, attende
ordine push esplicito di Federico. Pattern stabilito durante la sessione:
push + `fly deploy --remote-only` + verifica live HTTP 200 + grep bundle.

## Per il prossimo Claude

Quando Federico dirà "aggiungiamo template X" o "TPL-9":
1. **Leggi questo ADR** per pattern + convention cristallizzate
2. **Pattern "1 fetta = 1 commit atomico"** sezione "Convention 1" sopra
3. ⚠️ Rispetta convention orientamento BEAM2D piano X-Y (sezione 2)
4. ⚠️ Rispetta convention ROLLER blocca asse (sezione 3)
5. Se serve supporto elastico → SPRING + spring_k 6-DOF (sezione 4)
6. SVG variant nuova in `catalog.tsx` (sezione 5)
7. Aggiorna ground truth in `catalog.test.ts` (sezione 6)
8. Restart backend per re-seed locale + Fly riavvia auto al deploy

Reference visivo per il design system FEA: vedi singoli commit
TPL-1..8 (`git show 4bb8c65`, etc) per esempi concreti di builder
+ test + SVG.
