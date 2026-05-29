# ADR 001 — NAFEMS LE1/LE10 onesto

- **Data**: 28/05/2026
- **Stato**: ✅ CHIUSO
- **Tag**: `v3.3.1-nafems-honest`
- **Commit**: `ffbc692` — `test(v3.3.1): NAFEMS LE1/LE10 benchmark resi onesti`

## Contesto

Pre-decisione: i benchmark NAFEMS LE1 (Elliptic Membrane) e LE10 (Thick
Plate) erano marcati PASS nei test, ma l'audit `v2.3.5-nafems-truth-audit`
(24/05/2026) aveva dimostrato che:

- I numeri reali erano fuori dalla tolleranza ufficiale NAFEMS.
- I test misuravano la cosa sbagliata (max|uz| invece di σ_yy in LE10).
- Le tolerance applicate erano grossolanamente lasche
  (es. LE1 con `SIGMA_TARGET/5 ≤ ≤ SIGMA_TARGET*5` = ±400%).

Posizione: l'app dichiarava "NAFEMS validated" pur essendo sbagliata.
Bugia visiva che violava la filosofia 🤍 — andava chiusa.

## Problema diagnosticato

### LE10 — foro finto

Il test LE10 usava una geometria con `a_i = 0.5` (raggio interno
foro) invece del valore canonico NAFEMS `a_i = 2.0`. Il modello
risolveva una struttura **diversa** dal benchmark, quindi il PASS era
matematicamente falso. La discrepanza geometrica era 4×.

### LE1 — criterio geometrico instabile

Il test LE1 selezionava il nodo D (centro foro) con un criterio
**geometrico** (`x ≈ a_i, y ≈ 0` con tolleranza) che, raffinando la
mesh, arruolava anche **anelli interni** dell'anello quad. Il nodo
"D" cambiava a ogni risoluzione → numeri non confrontabili.

## Decisione

1. **LE10 geometria**: passare a `a_i = 2.0` canonico NAFEMS (foro vero).
2. **LE10 tolerance**: ±15% sulla σ_yy(D). **Tolerance nostra, calibrata
   sul locking osservato — NON NAFEMS dogmatica**. Razionale: a 8×8
   col foro vero (`a_i=2.0`) lo shear locking Q4 produce ~10-11% errore;
   ±15% lascia margine al locking attuale ma esclude regressioni
   grossolane. Quando MITC4 chiuderà il locking, la tolerance va stretta.
3. **LE1 tolerance**: ±5% sulla σ_yy(D) (target stretto NAFEMS).
4. **LE1 selezione nodo D**: criterio **topologico** `i = nx` (l'indice
   del nodo D è univocamente determinato dalla topologia mesh, non
   dalle coordinate). Indipendente dalla raffinatura.
5. **Bug strutturali identificati ma non risolti** restano marcati con
   `@pytest.mark.xfail` esplicito (`xfailed onesti` — registrano il
   locking 16×16 senza nasconderlo).

## Conseguenze

- **28 pytest PASS** + **4 xfailed onesti** che documentano i bug
  residui (shear locking Q4 su shell 16×16) — visibili in `pytest -v`.
- Niente più claim "NAFEMS validated" su LE10/LE1 finché i bug
  shell-formulation non sono chiusi. Banner `Preliminary` resta.
- Tag `v3.3.1-nafems-honest` deployato live su <https://fea-pro.fly.dev/>.
- Il README root e `docs/nafems_truth_audit.md` raccontano la storia
  pubblicamente — pattern "onestà sopra marketing" della filosofia 🤍.
- Cantieri residui rimandati a sprint dedicato `v3.4+`:
  - MITC4 vero (sostituisce la formulazione Q4 attuale)
  - Stress recovery ai nodi (oggi al centroide → LE1 NEW-1)
  - Vedi `BACKLOG.md` "Cantieri strutturali (validazione)"

## Cosa ha sbloccato

- Convention "**baseline verde DOPO ogni fetta** vs DOPO il PR": i 4
  xfailed sono accettati come baseline, non vengono nascosti. Pattern
  riusato nelle fette redesign successive.
- Convention **`xfail` onesto** (no tappetino-nasconde-bug):
  1. Si usa **solo se si sa perché fallisce** (root cause identificata,
     non "boh, flaky").
  2. Si usa **solo se c'è un piano per chiuderlo** (cantiere nel
     `BACKLOG.md` o ADR dedicato).
  3. `reason=` esplicito e citante numeri/file/normativa.
     **No**: `reason="flaky"`. **Sì**:
     `reason="locking Q4 NAFEMS LE10 ref -5.38 MPa, attuale -6.2 @16x16, vedi BACKLOG MITC4"`.
- Convention "**ADR pubblico** quando un bug viene scoperto e gestito
  con onestà" — questo file ne è esempio.
- Demarca la differenza tra "test verdi" e "calcolo validato":
  pytest 1708 PASS non significa "il solver è corretto", significa
  "il solver fa quello che il test dichiara". L'audit NAFEMS è la
  fonte di verità per la **correttezza** del calcolo.
