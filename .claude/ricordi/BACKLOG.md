# BACKLOG — cantieri non urgenti

> Vista operativa per Claude. Il backlog tecnico ingegneristico granulare
> (BL-6, NEW-1..6, EC2 staffe, shell formulation profonda) vive in
> `/BACKLOG.md` root. Qui solo i punti rilevanti per la collaborazione
> Claude-Federico nel breve/medio periodo.

## Cantieri strutturali (validazione)

### Stato vero v3.3.1 (da diagnosi 28/05)

| Famiglia | Errore vs riferimento | Note |
|---|---|---|
| Travi 1D (LE2, Cantilever, Euler) | < 0.001% | Solido, validato |
| Piastre / shell (LE10, simili) | Sottostima sistematica | **Sospetto shear locking Q4** — da verificare |
| Sisma time-history | Didattica | Non production-grade, banner esplicito |

### Cantieri aperti

- **MITC4 vero**: la formulazione shell Q4 attuale usa una semplificazione
  che innesca shear locking. Implementare MITC4 (Mixed Interpolation of
  Tensorial Components) come variante opt-in. Complessità: medio-alta.
- **FASE 2 LE1 residuo**: stress recovery valutato al centroide invece
  che ai nodi → errore cresce con mesh fine (−32% a 12×12, −76% a 20×20).
  File chiave: `backend/core/elements/shell_quad4.py:165`. Vedi
  `/BACKLOG.md` root NEW-1.
- **Ricucitura corner nodes**: ricostruzione stress recovery ai 4 nodi
  d'angolo via shape function interpolation (oggi solo centroide).
- **Buckling silenzioso `n_modes=0`**: il solver buckling restituisce
  zero modi senza errore esplicito in alcuni casi degenerate. Va catturato
  con un warning user-facing.
- **Tautologia LTB**: la verifica Lateral-Torsional Buckling EC3 §6.3.2
  ha un check tautologico (risolve sempre vero) — da analizzare.

## Bug pre-Fetta 1 (frontend / backend integration)

- **`linear/static` mismatch nomi**: il frontend chiama `analysisType:
  "static"` ma il backend Pydantic vuole `"linear"` → 422 validation
  error in alcuni path. Da uniformare (probabilmente il backend → accetta
  entrambi via alias, o il frontend → rinomina). Da verificare con `grep`
  sui due lati.

## Test flaky preesistenti

- **PREEX-1 `cost_estimator` drift**: test time-dependent che dipende da
  timing CPU/CI → flaky su runs lenti. Da isolare con mocking del clock.
- **PREEX-2 USGS test fragile**: dipendenza da endpoint USGS esterno
  che a volte risponde diverso o rate-limit. Da mockare o rendere
  opt-in (`@pytest.mark.online`).

## Foundation finishing (post E0-fix)

- **Rename `--c-*` → `--*-rgb`**: i token CSS RGB-triplet servono come
  binario alpha intenzionale per Tailwind (`bg-accent/50`), ma il nome
  `--c-*` non rende esplicito lo scopo. Rinominare a `--accent-rgb`,
  `--ink-rgb`, ecc. per chiarezza. Migrazione search/replace.
- **Decisione body font**: oggi triade `Plus Jakarta Sans (display) +
  Inter (body) + JetBrains Mono (mono)`. Il prototipo v3 usa solo Plus
  Jakarta anche per body. Federico deve decidere se uniformare o
  tenere separati.
- **Sharp opt-in espliciti**: `data-radius="sharp"` esiste come opt-in
  CSS ma manca UI control utente. Va esposto nella mezza-fetta UI toggle
  (vedi ROADMAP "Prossime").

## Tier-2 weirdness (rifinitura workspace Risultati)

- **Tier-2-A · colonne Reazioni tagliate a dx**: la tabella reazioni ha
  colonne oltre il viewport, scrollbar invisibile su alcune dimensioni
  schermo. Da fixare con overflow-x esplicito + scrollbar visibile.
- **Tier-2-B · toast su gizmo**: il toast "Analisi completata" appare in
  posizione che sovrappone il gizmo viewport in basso a destra in alcuni
  layout. Da spostare o gestire collisione.
- **Tier-3 · sospetto su UR=n/a (design call)**: il rilevatore "calcolo
  sospetto" non scatta quando tutte le UR sono `n/a` (es. sezioni fuori
  EC3). Va deciso se è giusto così (n/a è informazione onesta) o se serve
  un warning aggiuntivo "0 verifiche applicabili — ricontrolla sezione".

## E2E mancanti (Playwright)

- **Cubo H8 sospetto end-to-end**: TEST 4 in `results-workspace.spec.ts`
  copre il badge "Stima vs Validato", ma manca un test full-flow su
  cubo H8 con rilevatore sospetto che scatta.
- **Itera → Costruisci**: workflow di iterazione (modifica modello,
  rilancia, confronta risultati).
- **Stati stale spina**: la spina 3 fasi mostra `done/stale/empty` —
  serve E2E che cambi modello dopo Run e verifichi il passaggio a `stale`.
- **Negative path solver**: cosa succede se il solver fallisce
  (singular matrix, mesh invalida) — il workspace Risultati deve
  mostrare error state onesto, non crashare.
- **Mobile**: il workspace Risultati non è ancora testato su `<768px`.

## UI primitives da rifare in E3

Fetta E3 (lontana, post E2-IA + F1/F2/F3) ricostruirà queste primitive
come componenti consolidati Soft v2.1, sostituendo le N varianti
esistenti:

- `Input`, `Select`, `Tabs`, `Dialog`
- `NumericInput` (con unità, validazione bound, increment kbd)
- `UnitChip` (chip con valore + unità, es. `120 MPa`)
- `KbdHint` (rendering tasti `⌘K` consistente)
- `CommandPalette` (oggi una versione esiste, da consolidare)
- `HelpSheet` (oggi esiste, da consolidare)
- `DataTable` (per Dati Sollecitazioni/Reazioni, oggi tabelle HTML grezze)
- `TrustBadge` (oggi esiste come "Preliminary" inline, da estrarre)
- `URBar` (barra UR colorata semaforo per Verifiche EC3)
- `MetricTile` (tile metriche aggregate per Sintesi)
