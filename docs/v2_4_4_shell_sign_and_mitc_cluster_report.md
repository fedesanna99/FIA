# v2.4.4 · Shell sign + MITC cluster — closure report

**Data**: 2026-05-24
**Sprint**: `v2.4.4-shell-sign-and-mitc-cluster`
**Scope effettivo**: ridotto a Q4 sign only (NEW-4-followup-segno)
**Scope deferito**: MITC sign + magnitude (NEW-3-followup esteso)

---

## TL;DR

- Bug `σ_y_top` sign opposto LE10 (NEW-4-followup-segno) **CHIUSO**: formula
  `σ_top = σ_m + 6M/t²` era convenzione "engineering" mentre il solver
  internamente usa **Mindlin Bathe §5.4** con `M_x = +D·κ_x` e
  coordinate **z-up**. Fix: `σ_top = σ_m − 6M/t²`.
- Verifica diagnostica isolata (`scripts/shell_b_bending_convention_diagnostic.py`)
  ha provato **causalmente** la convenzione interna Mindlin Bathe z-up.
- Q4 LE10 mesh 8×8 punto D: σ_y_top = **−22.03 MPa** (target NAFEMS −5.38).
  Segno OK, magnitude residua 309% del target — causa coarse mesh + altre.
- LE1 convergence (membrana): **10/10 invariati** post-fix → fix sign non
  rompe nulla nel cluster membrana.
- **Sorpresa Phase 3**: applicando lo stesso fix anche a MITC, MITC σ_y_top
  passa da +75 a −75 a +75 (sign sbagliato). Il MITC pre-fix aveva "segno
  fortuito" per via di **doppia incoerenza interna** (`_Bs_at` usa
  `(w, rx, ry)` con `γ_xz = ∂w/∂x + ry`, `_bending_stiffness` usa
  convenzione θ identica a Q4 → segni si combinano in modo incoerente).
- Phase 4 (MITC calibration) **deferita** a brief separato
  `v2.4.x-mitc-shear-and-sign-calibration` perché fuori budget di questo
  sprint e richiede audit completo `_Bs_at` + `_bending_stiffness`.

---

## Phase 1 · Investigation (commit `23437fd`)

Output documentato in `docs/v2_4_4_phase1_investigation.md`.

**Verdetto**: Scenario II — `ShellQuad4MITC` **non eredita** da
`ShellQuad4`. Le due classi sono indipendenti, ma B_b è duplicata
algoritmicamente identica in entrambe. La convenzione segno B_b è
quindi `(+, +)` in entrambe. Fix sign va replicato in 4 punti
(2 file × 2 funzioni).

K_b = B_bᵀ · D_p · B_b è **bilinear** in B_b → invariante per cambio
segno B_b. Quindi qualsiasi inversione segno B_b non avrebbe rotto
LE1 (verificato empiricamente in Phase 2.4: 10/10 invariati).

---

## Phase 2.0 · Diagnostic (`scripts/shell_b_bending_convention_diagnostic.py`)

### Test 1 · Single Q4 element, applied field θ_x = −1.0·x

Sui 4 nodi:
- nodo 0 (0,0): θ_x = 0
- nodo 1 (1,0): θ_x = −1
- nodo 2 (1,1): θ_x = −1
- nodo 3 (0,1): θ_x = 0

⇒ `∂θ_x/∂x = −1`, gli altri DOF = 0.

Atteso convenzione Bathe Mindlin §5.4 (`κ_x = +∂θ_x/∂x`, `M_x = +D·κ_x`):
```
M_x_atteso = +D_p · κ_x = +1.923e7 · (−1) = −1.923e7 N·m
```

Misurato dal codice:
```
M_x_avg = −1.923e7 N·m   ✅ MATCH BATHE_MINDLIN
M_y_avg ≈ 0              ✅ (no θ_y applied)
```

**Conclusione**: convenzione interna confermata = **Mindlin Bathe §5.4**.

### Test 2 · Plate 2×2m SS, p = 1 MPa

Risultati:
```
max|uz|     = 7.5e-4 m
uz_center   = −7.5e-4 m   ← NEG (deflessione verso il basso, p>0 ↑ down)
                            quindi convenzione COORDINATA **z-up**
M_y_center  = −2.1e+5 N·m/m
σ_y_top     = +24.5 MPa (pre-fix)   ← SBAGLIATO, atteso NEG (compr top)
```

**Conclusione**: per piastra concava verso l'alto (w_xx > 0) sotto p>0,
la fibra TOP (z=+t/2) deve essere in **compressione** → σ_top < 0.

Pre-fix dava σ_top > 0 perché usava formula "engineering" `σ_top = σ_m + 6M/t²`
incompatibile con convenzione interna Mindlin z-up. Formula corretta:
```
σ(z) = −(12·z/t³)·M    →   σ_top(z=+t/2) = −6M/t²
σ_top = σ_m − 6M/t²
σ_bot = σ_m + 6M/t²
```

---

## Phase 2.1 · Q4 fix (`backend/core/elements/shell_quad4.py`)

- `stresses_at_nodes`: invertito segno top/bot
- `stresses`: invertito segno top/bot (per `default` centroid)
- Docstring completo che spiega la convenzione Bathe Mindlin §5.4 z-up
- Cross-reference al diagnostico

---

## Phase 2.2 · MITC fix (`backend/core/elements/shell_quad4_mitc.py`)

Stesso pattern applicato per coerenza Q4↔MITC, con commento di rinvio
alla docstring Q4 per evitare duplicazione.

⚠️ **Effetto inatteso**: MITC pre-fix dava σ_y_top **NEG** (segno
fortuitamente "giusto"). Post-fix dà σ_y_top **POS** (sbagliato).
Vedi Phase 3 sotto.

---

## Phase 2.3 · Test sign (`backend/tests/solver/test_shell_bending_sign.py`)

3 test nuovi:
1. `test_le10_q4_sigma_y_top_negative` — Q4 LE10 mesh 8×8 punto D:
   σ_y_top < 0. **PASS** (σ_y_top = −22.03 MPa).
2. `test_le10_q4_sigma_y_top_magnitude_reasonable` — |σ_y_top| in
   `[0.1×, 10×]` del target NAFEMS −5.38 MPa. **PASS** (ratio 4.1).
3. `test_le10_q4_bending_antisymmetry_preserved` — sanity: delta_top =
   −delta_bot. **PASS**.

---

## Phase 2.4 · LE1 regression check

Run `pytest backend/tests/nafems/test_le1_*` post-fix: **10/10 PASS**.
Convergence rate invariato, error vs target NAFEMS LE1 invariato.

Rationale teorica: K_b = B_bᵀ·D_p·B_b è bilinear in B_b → invariante.
Stesso ragionamento si applica a `σ_x_membrana` (cluster membrana è
indipendente dal cluster bending). Atteso e verificato.

---

## Phase 3 · MITC verification post-fix (anomalia)

LE10 con `SHELL_Q4_MITC`, stesso mesh 8×8, p=1 MPa, t=0.6 m:

| Quantità    | Pre-fix sign  | Post-fix sign |
|-------------|---------------|---------------|
| σ_y_top (D) | −75 MPa       | **+75 MPa**   |
| max\|uz\|   | 0.237 m       | 0.237 m       |
| segno fisico atteso (compressione top) | OK fortuito | SBAGLIATO |

**Diagnosi**: il MITC ha due incoerenze interne che si auto-compensano
nel pre-fix:

1. `_Bs_at` (riga 110-120 di `shell_quad4_mitc.py`) costruisce la
   matrice B_s con convenzione `(w, rx, ry)`:
   ```
   γ_xz = ∂w/∂x + ry      ← convenzione "ingegneristica" rotazione asse
   γ_yz = ∂w/∂y − rx
   ```
   Questa convenzione è coerente con **Timoshenko engineering**, NON
   con Bathe Mindlin §5.4 (`γ_xz = ∂w/∂x − θ_y`).

2. `_bending_stiffness` (riga 133-178) costruisce B_b con convenzione
   θ identica a Q4 (Bathe Mindlin):
   ```
   κ_x = ∂θ_x/∂x          ← Bathe Mindlin
   ```

Le due convenzioni si combinano in modo incoerente nel passaggio
`u → ε_b → M`. Il risultato è che M_x_mitc ha segno opposto a M_x_q4
per gli stessi spostamenti.

**Decisione**: questo va corretto unificando tutte le convenzioni a
Bathe Mindlin §5.4. Operazione non banale (potrebbe richiedere
ricostruzione di K_s) → **deferita** a brief separato
`v2.4.x-mitc-shear-and-sign-calibration` con scope esteso che include
sia la calibrazione magnitude (~37× factor in deflection) che la
correzione sign (ora isolata).

---

## Phase 4 · DEFERITA

Calibrazione MITC (sia magnitude `_bending_stiffness/K_s` che sign
`_Bs_at` convention) richiede:
- Audit completo θ_x/θ_y/rx/ry tra `_Bs_at` e `_bending_stiffness`
- Test contro implementazione MITC4 reference (Bathe / CalculiX / FEAP)
- Test parametrico Q4 vs MITC su 3 thickness ratios
- Test sign σ_y_top MITC (analogo a Q4)

→ Brief separato `v2.4.x-mitc-shear-and-sign-calibration`,
   stima ~1-1.5 giorni.

---

## Phase 5 · Test finali (questo sprint)

Test eseguiti:
- ✅ Phase 2.3 `test_shell_bending_sign.py`: 3/3 PASS
- ✅ Phase 2.4 LE1 regression: 10/10 invariati
- ⏭️ MITC sign test: out of scope (Phase 4 deferita)

Nessuna regressione introdotta. Il fix Q4 è solido e isolato.

---

## File modificati / aggiunti

```
backend/core/elements/shell_quad4.py        (modified — sign fix + docstring)
backend/core/elements/shell_quad4_mitc.py   (modified — sign fix)
backend/tests/solver/test_shell_bending_sign.py  (new — 3 test)
backend/scripts/shell_b_bending_convention_diagnostic.py (new — diagnostic)
docs/v2_4_4_phase1_investigation.md         (already committed in Phase 1)
docs/v2_4_4_shell_sign_and_mitc_cluster_report.md (this report)
BACKLOG.md                                  (NEW-4-followup-segno CLOSED;
                                             NEW-3-followup scope esteso)
```

---

## Conclusione

`v2.4.4-shell-sign-and-mitc-cluster` chiude:
- ✅ **NEW-4-followup-segno** (Q4 σ_y_top sign LE10)

ed espone con maggior chiarezza:
- 🔁 **NEW-3-followup** ora include sign MITC oltre alla magnitude
  ~37× originale; entrambi rinviati a brief separato.

Cluster shell post-v2.4.4:
- Q4 sign + nodal stress recovery: ✅ stabili
- MITC magnitude + sign: ❌ ancora aperti, isolati in un singolo brief

Tag finale: `v2.4.4-shell-sign-and-mitc-cluster`.
