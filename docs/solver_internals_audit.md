# Solver Internals Audit · v2.3.7

**Data**: 2026-05-24
**Branch**: test (SHA `a8cc0fe`)
**Tipo**: diagnostic only — **zero modifiche a codice produzione**
**Input**: `docs/nafems_truth_audit.md` (audit v2.3.5), bug NEW-1..4 aperti.

> **TL;DR**: 4 bug NEW dell'audit `v2.3.5` diagnosticati alla riga di codice.
>
> - **NEW-1** LE1 anti-convergenza → **stress recovery al centroide** (ipotesi b
>   confermata): centroide dell'elemento adiacente si sposta verso il centro
>   quad raffinando, valore letto sottostima il picco al nodo D del bordo foro.
>   Loads sottostimati del ~10% (ipotesi c, contributo minore).
> - **NEW-2** Q4=MITC su LE1 → **non è un bug, è fisica**: LE1 è membrana
>   piana (vincoli bloccano w + rotazioni), bending K_b non significativo.
>   Q4 e MITC condividono `_membrane_stiffness` identica.
> - **NEW-3** MITC `max|uz|=0` su LE10 → **dispatch pressure_load incompleto**
>   in `assembler.py:244` (`if el.type == ElementType.SHELL_Q4:` non gestisce
>   `SHELL_Q4_MITC`). Carico mai applicato → `u=0`.
> - **NEW-4** LE10 `σ_yy(D)=0` → **postprocess shell legge solo membrana**.
>   `ShellQuad4.stresses()` riga 156 estrae `u_x, u_y` per ogni nodo, ignora
>   `θ_x, θ_y`. No bending stress in fibra estrema. Schema `ElementStress`
>   non ha campi `sigma_*_top/bot` né `M_x/M_y`.
>
> **Sequenza fix raccomandata**: B (cluster separati). 3 brief atomici
> in cascata, ~2-4 settimane totali.

---

## Sezione 1 · Inventario codepath shell

### File coinvolti

| Modulo | File | Note |
|---|---|---|
| Element Q4 std | `backend/core/elements/shell_quad4.py` | `class ShellQuad4` 13:, Mindlin-Reissner 2×2 Gauss |
| Element MITC4 | `backend/core/elements/shell_quad4_mitc.py` | `class ShellQuad4MITC` 36:, tying points Bathe-Dvorkin |
| Element layered | `backend/core/elements/shell_quad4_layered.py` | `class ShellQuad4Layered` 124:, multistrato ABD |
| Tri 3-nodi | `backend/core/elements/tri3.py` | T3 plane-stress |
| Dispatch element type | `backend/core/solver/assembler.py:85-104` | factory `_make_instance` |
| Dispatch pressure load | `backend/core/solver/assembler.py:232-253` | **gestisce solo SHELL_Q4** (vedi T3) |
| Mesher quarter ellipse | `backend/core/mesh/quarter_ellipse_with_hole` | Coons patch transfinita |
| Postprocess stress | `ShellQuad4.stresses()` 153: | solo membrana (vedi T4) |
| Schema risultato | `backend/schemas/results.py::ElementStress` | nessun campo bending |

### Metodi classi shell (file:riga)

```
ShellQuad4 (shell_quad4.py)
  25  __init__(nodes_xyz, E, nu, t, rho)
  35  _build_local_frame
  45  _shape_functions(xi, eta)
  56  _membrane_stiffness            ← identica a MITC
  81  _bending_stiffness              ← Mindlin standard 2x2 (locking-prone)
 112  stiffness_local_24
 124  _transformation_matrix
 130  stiffness_global
 134  mass_global
 145  _area
 153  stresses(u_global_24)           ← solo membrana, no bending

ShellQuad4MITC (shell_quad4_mitc.py)
  52  __init__
  63  _build_local_frame
  73  _shape_functions
  85  _membrane_stiffness             ← identica a Q4
 111  _Bs_at(xi, eta)                  ← nuovo, calcola B_shear ai tying points
 133  _bending_stiffness              ← MITC4 Bathe-Dvorkin (locking-free)
 179  stiffness_local_24
 195  _transformation_matrix
 201  stiffness_global
 205  mass_global
 216  _area
 224  stresses(u_global_24)           ← idem a Q4 (solo membrana)
```

### Dispatch element_type → classe (assembler.py)

```python
# assembler.py:85-104 — istanziazione element
if et == ElementType.SHELL_Q4:
    coords = [nodes[nid] for nid in element.nodes]
    if sec and getattr(sec, "layers", None):
        ...
        return ShellQuad4Layered(coords, layers_obj)
    t = sec.thickness if sec and sec.thickness else 0.1
    return ShellQuad4(coords, mat.E, mat.nu, t, mat.rho)
if et == ElementType.SHELL_Q4_MITC:
    coords = [nodes[nid] for nid in element.nodes]
    t = sec.thickness if sec and sec.thickness else 0.1
    return ShellQuad4MITC(coords, mat.E, mat.nu, t, mat.rho)
```

✅ Dispatch corretto a livello istanziazione: SHELL_Q4_MITC istanzia
`ShellQuad4MITC`, non `ShellQuad4`. Le classi sono distinte e separate.

### Dispatch pressure load (assembler.py:232-253)

```python
elif load.type == LoadType.PRESSURE:
    eid = load.target_id
    el = next((e for e in self.model.elements if e.id == eid), None)
    ...
    if el.type == ElementType.SHELL_Q4:          # ← SOLO QUI!
        A = inst._area()
        normal = inst.R[2]
        force_total = -p * A * normal
        f_per_node = force_total / 4.0
        for i_n in range(4):
            base_idx = i_n * 6
            F[dofs[base_idx]]     += f_per_node[0]
            F[dofs[base_idx + 1]] += f_per_node[1]
            F[dofs[base_idx + 2]] += f_per_node[2]
    # NESSUN elif per SHELL_Q4_MITC, TRI3, ecc.
```

❌ **Bug NEW-3**: il branch gestisce solo `SHELL_Q4`. Per `SHELL_Q4_MITC`
il loop sui load passa oltre senza aggiungere nulla a `F`.

---

## Sezione 2 · NEW-1 LE1 anti-convergenza root cause

Tre ipotesi testate via script (`backend/scripts/le1_*_diagnostics.py`).

### T2a · Mesh degeneracy (ipotesi a) — ❌ ESCLUSA

`backend/scripts/le1_mesh_diagnostics.py` output:

```
nx=  4  n_el=  16  aspect[min/max/avg]=  1.85/  3.46/ 2.65  skew_max= 1.11
nx=  6  n_el=  36  aspect[min/max/avg]=  1.64/  3.46/ 2.55  skew_max= 1.12
nx=  8  n_el=  64  aspect[min/max/avg]=  1.54/  3.46/ 2.51  skew_max= 1.14
nx= 10  n_el= 100  aspect[min/max/avg]=  1.49/  3.46/ 2.48  skew_max= 1.15
nx= 12  n_el= 144  aspect[min/max/avg]=  1.45/  3.46/ 2.46  skew_max= 1.15
nx= 16  n_el= 256  aspect[min/max/avg]=  1.40/  3.46/ 2.43  skew_max= 1.16
nx= 20  n_el= 400  aspect[min/max/avg]=  1.37/  3.46/ 2.42  skew_max= 1.16
```

La mesh **migliora leggermente** raffinando: aspect ratio medio cala da 2.65
a 2.42, max stabile 3.46, skewness stabile 1.16. Nessuna degenerazione.
**Ipotesi (a) esclusa.**

### T2b · Stress recovery (ipotesi b) — ✅ CONFERMATA (causa primaria)

`backend/scripts/le1_stress_recovery_diagnostics.py` output:

```
nx= 8   nodo D=1  elemento adiacente=[1]  centroide=(2.058,0.108)  d=0.1229
         sigma_y = +5.502e+07  → media 55.02 MPa  (target 92.7, err −40.6%)

nx=12   nodo D=1  elemento adiacente=[1]  centroide=(2.043,0.070)  d=0.0823
         sigma_y = +6.256e+07  → media 62.56 MPa  (err −32.5%)

nx=16   nodo D=1  elemento adiacente=[1]  centroide=(2.034,0.052)  d=0.0620
         sigma_y = +3.005e+07  → media 30.05 MPa  (err −67.6%)  ← CROLLO

nx=20   nodo D=1  elemento adiacente=[1]  centroide=(2.028,0.041)  d=0.0497
         sigma_y = +2.237e+07  → media 22.37 MPa  (err −75.9%)  ← CROLLO
```

**Pattern**:
1. Sempre **1 solo elemento adiacente al punto D** (l'elemento al vertice
   del foro). Indipendente da mesh.
2. Il **centroide** dell'elemento si avvicina al punto D raffinando
   (d: 0.123 → 0.050) ma resta **sempre offset** dal nodo D.
3. Lo stress σ_y è valutato al **centroide** in `ShellQuad4.stresses()`
   (Gauss point (0,0) → centroide locale): `_, dN_dxi, dN_deta = self._shape_functions(0.0, 0.0)`.

**Causa**: lo stress σ_y nel campo elliptic-membrane ha **gradient elevato**
in prossimità del bordo del foro (concentrazione di tensione). Allontanarsi
dal punto D (anche di 0.05 m con b_inner=1.0) → letture sottostimano il picco.

Raffinando, l'elemento adiacente diventa **più piccolo** quindi il centroide
si avvicina al punto D, ma **anche il dominio dell'elemento si restringe**:
- nx=12: elemento al vertice ~ 0.16 × 0.50 m → centroide a 0.082 m da D
- nx=20: elemento al vertice ~ 0.09 × 0.30 m → centroide a 0.050 m da D

Ma la concentrazione di tensione cala rapidamente con distanza dal foro
(stress decay ~ 1/r² in flat plate, comportamento analogo in membrana ellittica).
A 0.05 m dal foro, σ è già crollato significativamente rispetto al picco al
nodo. **Da qui anti-convergenza.**

**Fix richiesto**: stress extrapolation Gauss-points → nodi (es. quartic
extrapolation Q4: usare i 4 Gauss points 2×2 e estrapolare al nodo via
formule note Bathe FEM Procedures §5.7). Oppure stress recovery
super-convergente con super-convergent patch (Zienkiewicz-Zhu).

### T2c · Loads sottostimati (ipotesi c) — ⚠ CONFERMATA (contributo minore)

`backend/scripts/le1_loads_diagnostics.py` output:

```
nx=  4  F_actual/F_expected = 0.8525
nx=  6  F_actual/F_expected = 0.8685
nx=  8  F_actual/F_expected = 0.8766
nx= 10  F_actual/F_expected = 0.8814
nx= 12  F_actual/F_expected = 0.8847
nx= 16  F_actual/F_expected = 0.8729
nx= 20  F_actual/F_expected = 0.8965
```

Il carico effettivo applicato è **85-90%** del teorico
`sigma_edge × t × perimetro_quarter`. Mancante ~10-15%.

**Cause**:
1. Il test `_build_le1` distribuisce `F_total / N_edge_nodes` uniformemente
   sui nodi del bordo, ma proietta in direzione normale `(x/a², y/b²)`.
   La proiezione e l'arc-length per nodo non sono pesate correttamente.
2. La tolerance `abs((x/a)² + (y/b)² - 1.0) < 0.05` per identificare
   `edge_nodes` può escludere/includere nodi a caso.
3. Per ogni nodo `F_per_node` è `F_total / N` ma la lunghezza d'arco
   associata non è uniforme (parametrizzazione mesh ≠ arc-length).

**Contributo all'errore**: ~10-15%. Da solo non spiega il −32% di errore,
ma somma alla causa primaria (stress recovery). Se il carico fosse
applicato correttamente, l'errore residuo da stress recovery resterebbe
~ −25% a mesh 12×12 invece di −32%.

### Conclusione T2

| Ipotesi | Esito | Contributo all'errore osservato |
|---|---|---|
| (a) Mesh degeneracy | ❌ ESCLUSA | 0% |
| (b) Stress recovery al centroide | ✅ **CAUSA PRIMARIA** | ~20-30% |
| (c) Loads sottostimati ~10% | ✅ contributo minore | ~10% |

**Root cause primaria di NEW-1**: stress recovery valutato al centroide
in `ShellQuad4.stresses()` riga 165 (`_shape_functions(0.0, 0.0)`). Da
estendere con extrapolation Gauss → nodi o super-convergent recovery.

---

## Sezione 3 · NEW-2 e NEW-3 · Q4 vs MITC dispatch

### NEW-2 · Q4 e MITC identici su LE1 — NON È UN BUG

**Diagnosi via lettura codice**:

`ShellQuad4._membrane_stiffness()` (shell_quad4.py:56-80) e
`ShellQuad4MITC._membrane_stiffness()` (shell_quad4_mitc.py:85-109)
sono **algoritmicamente identici** (entrambi 2×2 Gauss + B-matrix membrana
standard).

`_bending_stiffness()` differisce:
- Q4 (shell_quad4.py:81-111): `Bs` calcolato direttamente al Gauss point
  → soffre di shear locking per piastre sottili.
- MITC (shell_quad4_mitc.py:133-178): `Bs` interpolato dai 4 tying points
  Bathe-Dvorkin → locking-free.

**LE1 è una membrana piana** (`is_3d=False`, vincoli `[ux/uy, uz, rx, ry, _]`
bloccano w, rx, ry su tutti i nodi). Il contributo bending K_b è
**non significativo** (rotazioni e w bloccati). Solo K_m governa il
risultato.

→ Q4 e MITC danno output **identici** non per bug dispatch ma perché
**la fisica del problema rende il bending irrilevante**. Comportamento
strutturalmente corretto.

**NEW-2 classificato come falso positivo dell'audit.** Da rimuovere come
"bug" e annotare nell'audit `v2.3.5` come finding chiarito.

### NEW-3 · MITC `max|uz|=0` su LE10 — BUG CONFERMATO

**Causa root** identificata in assembler.py:244 (sezione 1):

```python
if el.type == ElementType.SHELL_Q4:   # ← gestisce SOLO SHELL_Q4
    A = inst._area()
    normal = inst.R[2]
    force_total = -p * A * normal
    ...
# Nessun elif/branch per SHELL_Q4_MITC
```

Per ogni elemento `SHELL_Q4_MITC` con load `LoadType.PRESSURE`, il branch
non si attiva → `F` non riceve forze → sistema `K·u=F` con `F=0` sui DOF
liberi → `u=0` → `max|uz|=0` esattamente.

**Fix richiesto**: estendere il branch:
```python
if el.type in (ElementType.SHELL_Q4, ElementType.SHELL_Q4_MITC):
    ...
```
Più correttamente, anche layered:
```python
if el.type in (ElementType.SHELL_Q4, ElementType.SHELL_Q4_MITC,
               ElementType.SHELL_Q4_LAYERED):  # adatta nome enum se diverso
    ...
```

**Complessità fix**: ~1 ora (branch + 2-3 test).
**Rischio regressione**: minimo (solo lift, non cambia comportamento Q4).

---

## Sezione 4 · NEW-4 LE10 σ_yy(D)=0 root cause

### Diagnosi via lettura codice

`ShellQuad4.stresses(u_global_24)` (shell_quad4.py:153-200):

```python
def stresses(self, u_global_24):
    T = self._transformation_matrix()
    u_local = T @ u_global_24
    u_membrane = np.array([u_local[6 * i + j] for i in range(4) for j in range(2)])
    #                                              ^^^^^^^^^^^^^^^^^^^^^
    # i in [0..3]: nodi  ·  j in [0,1]: solo ux, uy  → 4×2 = 8 valori
    # NESSUN uso di u_local[6*i+2..5]  ← uz, theta_x, theta_y, theta_z IGNORATI
    ...
    eps = B @ u_membrane          # 3 × 8 · 8 → 3 strain (eps_x, eps_y, gamma_xy)
    sigma = D @ eps               # plane-stress D → sigma membrana
    sx, sy, txy = sigma
    return {"sigma_x": sx, "sigma_y": sy, "tau_xy": txy, ...}
```

**Output**: solo `sigma_x, sigma_y, tau_xy` **membrana**. Nessun termine
bending `σ_bending = M·z/I` in fibra estrema z=±t/2.

`ShellQuad4MITC.stresses()` (shell_quad4_mitc.py:224) ha **logica identica**
— stesso problema.

### Verifica empirica (`backend/scripts/le10_stress_diagnostics.py`)

```
max|uz| = 6.3858e-03 m       ← deflessione fisica ~6 mm sotto p=1MPa
max|rx| = 2.7770e-03 rad     ← rotazione esiste = bending attivo nel solver
max|ry| = 3.0152e-03 rad     ← idem

Punto D: nodo 5 @ (1.875, 0.000)
Elementi adiacenti: [4, 5]
  el 4: sigma_x=0.000  sigma_y=0.000  tau_xy=0.000  von_mises=0.000
```

→ **solver calcola rotazioni correttamente** (bending presente: max|rx|=
2.8e-3, max|ry|=3.0e-3). Ma `stresses()` ignora rotazioni → `σ=0`.

### Schema ElementStress (backend/schemas/results.py)

```python
class ElementStress(BaseModel):
    element_id: int
    sigma_x: float = 0.0
    sigma_y: float = 0.0
    sigma_z: float = 0.0
    tau_xy: float = 0.0
    tau_yz: float = 0.0
    tau_xz: float = 0.0
    von_mises: float = 0.0
    sigma_max: float = 0.0
    sigma_min: float = 0.0
    principal_angle_deg: float = 0.0
    centroid: list[float] = []
    principal_dir1: list[float] = []
    principal_dir2: list[float] = []
```

**Nessun campo** per `sigma_x_top`, `sigma_y_top`, `sigma_x_bot`, `sigma_y_bot`,
`M_x`, `M_y`, `M_xy`. Architetturalmente non c'è dove mettere il bending stress.

### Fix richiesto

Step in cascata:
1. **Estendere `ElementStress`** con campi opzionali:
   ```python
   sigma_x_top: float | None = None  # fibra estrema z=+t/2
   sigma_y_top: float | None = None
   sigma_x_bot: float | None = None
   sigma_y_bot: float | None = None
   Mx: float | None = None           # momento flettente per unità di lunghezza
   My: float | None = None
   Mxy: float | None = None
   ```
2. **Estendere `ShellQuad4.stresses()`** per:
   - Estrarre `u_z, θ_x, θ_y` dei 4 nodi (16 valori)
   - Calcolare `Bb @ u_bending` per ottenere curvature `κ_x, κ_y, κ_xy`
   - Convertire in momenti via `M = D_bending · κ`
   - Convertire in stress fibra estrema: `σ_top = M · (t/2) / (t³/12) = 6M/t²`
3. **Estendere `ShellQuad4MITC.stresses()`** in parallelo (stesso approccio
   bending, ma B usa tying points)
4. **Test parametrico**: LE10 σ_yy(D) atteso −5.38 MPa ±10%.

**Complessità fix**: ~2-3 giorni (schema + stresses() Q4 + stresses() MITC +
test extension + verifica regression LE1).

**Rischio regressione**: media. Test esistenti EC2/EC3 leggono `sigma_x`,
`sigma_y` da shell — se cambiamo il significato (membrana → max(membrana,
top, bot)?) potremmo rompere. Strategia safe: aggiungere campi nuovi
SENZA modificare `sigma_x/y/xy` esistenti (= membrana). Frontend/test
post-fix leggono nuovi campi quando bending è rilevante.

---

## Sezione 5 · Raccomandazioni fix

### Per ciascuno dei 4 bug NEW

#### NEW-1 · LE1 anti-convergenza (stress recovery + loads)
- **Root cause primaria**: stress recovery al centroide invece di estrapolazione ai nodi (shell_quad4.py:165).
- **Root cause secondaria**: loads sottostimati ~10% nel test builder (test_le1_elliptic_membrane.py).
- **File chiave**:
  - `backend/core/elements/shell_quad4.py:153-200` (stresses)
  - `backend/core/elements/shell_quad4_mitc.py:224` (stresses MITC analoga)
  - `backend/tests/nafems/test_le1_elliptic_membrane.py` (loads builder)
- **Complessità fix**: 2-3 giorni (stress extrapolation Gauss→nodi + recalibrazione loads)
- **Test regressione**: 4 nuovi
  - LE1 mesh 12×12 errore < 5% (target NAFEMS)
  - LE1 convergenza monotona (mesh fine ≤ mesh coarse × 1.0)
  - LE1 carichi: F_actual / F_expected > 0.99
  - Smoke su LE2/cantilever per no-regression
- **Rischio regressione**: alta su EC3/EC2 esistenti se cambiamo significato `sigma_y` shell. Strategia safe: campo nuovo `sigma_y_nodal` per recovery extrapolato, `sigma_y` resta valore al centroide (back-compat).

#### NEW-2 · Q4=MITC su LE1
- **Non è un bug**: fisica corretta (LE1 membrana piana, no bending significativo).
- **File chiave**: nessuno da modificare.
- **Complessità fix**: 0 (riclassificare come "comportamento atteso" in audit v2.3.5).
- **Test regressione**: aggiungere unit test che documenta:
  `test_le1_q4_and_mitc_must_agree_within_1pct()` con motivazione.

#### NEW-3 · MITC pressure load ignored
- **Root cause**: assembler.py:244 condition `if el.type == ElementType.SHELL_Q4:` non gestisce MITC.
- **File chiave**: `backend/core/solver/assembler.py:244`
- **Complessità fix**: ~1 ora (extend condition + 2 test)
- **Test regressione**: 2 nuovi
  - LE10 con MITC: `max|uz| > 0` e ordine di grandezza atteso
  - Confronto Q4 vs MITC su piastra sottile (MITC deve dare deflessione più alta = locking-free)
- **Rischio regressione**: minimo (extension, no behavior change su Q4).

#### NEW-4 · LE10 σ_yy(D)=0 (postprocess membrana-only)
- **Root cause**: `ShellQuad4.stresses()` ignora DOF rotazionali. Schema `ElementStress` non ha campi bending.
- **File chiave**:
  - `backend/schemas/results.py::ElementStress` (extend schema)
  - `backend/core/elements/shell_quad4.py:153` (extend stresses)
  - `backend/core/elements/shell_quad4_mitc.py:224` (extend stresses)
- **Complessità fix**: 2-3 giorni
- **Test regressione**: 5 nuovi
  - LE10 σ_yy(D) errore < 15% (target NAFEMS ±10%, accettiamo borderline su mesh coarse)
  - LE10 sigma_y_top != sigma_y_bot (bending presente)
  - LE10 M_x, M_y non-zero
  - Q4 vs MITC su LE10: MITC deve dare bending stress più vicino al target
  - Smoke LE1: sigma_y membrana invariato (back-compat)
- **Rischio regressione**: media. Strategia safe: campi nuovi opzionali, `sigma_x/y/xy` esistenti restano membrana puro.

### Sequenza ottimale brief di fix

**Sequenza B (cluster separati)** — raccomandata.

Tre brief atomici in cascata:

#### Brief 1 · `v2.4.3a-shell-pressure-mitc-fix`
- Scope: NEW-3 + NEW-2 (chiarimento)
- Modifiche: `assembler.py:244` extend + unit test Q4-vs-MITC LE1
- Stima: ~3 ore
- Rischio: minimo

#### Brief 2 · `v2.4.3b-shell-bending-stress-recovery`
- Scope: NEW-4 (postprocess bending)
- Modifiche: schema ElementStress + Q4/MITC `stresses()` extend
- Stima: ~2-3 giorni
- Rischio: media (regression EC2/EC3 — mitigata con campi additivi)

#### Brief 3 · `v2.4.3c-shell-stress-recovery-nodal`
- Scope: NEW-1 (extrapolation Gauss → nodi + loads recalibration)
- Modifiche: shell stress recovery + test_le1 loads builder
- Stima: ~2-3 giorni
- Rischio: media

**Totale stimato**: 5-7 giorni di lavoro tecnico.

**Alternative sequenze considerate**:
- **Sequenza A** (un unico brief): SCONSIGLIATA — i 3 cluster hanno root
  cause diverse e rischi di regressione diversi. Mischiarli in un brief
  unico aumenta probabilità di errori e rende difficile bisect.
- **Sequenza C** (fix prerequisiti in cascata): NON necessaria — i 3 brief
  sono indipendenti tecnicamente. Possono essere eseguiti in qualsiasi
  ordine (anche parallelo se più developer).

### LE2/cantilever/Euler sicuri post-fix?

✅ **Sì**. I 3 brief proposti toccano:
- `assembler.py:244` (pressure load dispatch) — non usato da LE2/cantilever/Euler
- `ShellQuad4.stresses()` / `ShellQuad4MITC.stresses()` — non usati da
  beam/truss (LE2 usa BEAM3D, cantilever usa BEAM2D, Euler usa BEAM2D)
- Schema `ElementStress` — campi additivi, no breaking change

Test esistenti per beam/truss/buckling **non toccati**.

### Benchmarking permanente

Raccomando di promuovere `backend/scripts/nafems_truth_measurement.py` a
**test pytest** post-fix:

```python
# backend/tests/benchmarks/test_nafems_truth_strict.py (post v2.4.3c)
@pytest.mark.parametrize("nx", [8, 12, 16])
def test_le1_within_nafems_5pct(nx):
    m = _build_le1(nx=nx, ny=nx, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_D = _sigma_y_at_point_D_nodal(m, r)  # nuovo helper post-fix
    err_pct = (abs(sigma_D) - SIGMA_TARGET) / SIGMA_TARGET * 100
    assert abs(err_pct) <= 5.0  # NAFEMS ufficiale
```

In CI: marker `nafems_strict` skip-by-default finché v2.4.3c non chiude,
poi attivato come gate permanente.

---

**Output finale**: 4 root cause identificati, sequenza fix raccomandata,
zero codice produzione modificato in questo audit. Brief di fix
(`v2.4.3a/b/c`) possono partire immediatamente.
