# v2.3.7-solver-internals-audit · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: diagnostic only — **zero modifiche a codice produzione**

## Sintesi

Diagnosi tecnica sulla shell formulation. 4 bug NEW dell'audit `v2.3.5`
analizzati alla riga di codice. 3 root cause distinte identificate, 1
"bug" riclassificato come falso positivo (comportamento fisico atteso).

## Step 0 · Debt tracking
3 voci aggiunte a BACKLOG.md "Media priorità":
- **#22bis** GDPR cascade incomplete (4 stub modules) — P1
- **#28bis** Rate limit in-memory single-instance — P2
- **#17bis** CSP report-only → enforcement promotion — P2

## Findings — risposte alle 3 domande aperte audit v2.3.5

### 1. LE1 anti-convergenza root cause (NEW-1)

**Causa primaria**: stress recovery valutato al **centroide** dell'elemento
(`shell_quad4.py:165`, Gauss point (0,0)). Raffinando, il centroide si
avvicina al nodo D ma resta sempre offset in zona di gradient elevato
(concentrazione tensione al bordo del foro). Errore cresce da −32%
(12×12) a −76% (20×20).

**Causa secondaria**: load distribution sottostima ~10-15% in
`test_le1_elliptic_membrane.py::_build_le1` (proiezione normali su
nodi non pesata per arc-length).

**Verifiche**:
- ❌ ipotesi (a) mesh degeneracy — ESCLUSA via `le1_mesh_diagnostics.py`
  (aspect max stabile 3.46, skew stabile 1.16)
- ✅ ipotesi (b) stress recovery — CONFERMATA via `le1_stress_recovery_diagnostics.py`
- ✅ ipotesi (c) loads — confermata contributo minore via `le1_loads_diagnostics.py`

### 2. SHELL_Q4 vs SHELL_Q4_MITC dispatch (NEW-2, NEW-3)

**NEW-2** (Q4=MITC su LE1): **non è un bug, è fisica corretta**. LE1 è
membrana piana (w + rotazioni bloccate), bending K_b irrilevante.
`_membrane_stiffness()` identica fra Q4 e MITC → output identico atteso.

**NEW-3** (MITC `max|uz|=0` su LE10): **bug confermato** in
`assembler.py:244`. Branch `if el.type == ElementType.SHELL_Q4:` non
gestisce `SHELL_Q4_MITC` → carico pressione mai applicato. Fix: 1 ora.

### 3. LE10 σ_yy(D)=0 postprocess (NEW-4)

**Causa**: `ShellQuad4.stresses()` riga 156 estrae solo `u_x, u_y` dei
4 nodi (8 valori), ignora `u_z, θ_x, θ_y, θ_z`. Stress recovery solo
membrana, nessun bending in fibra estrema z=±t/2. Stesso pattern in
`ShellQuad4MITC.stresses()`.

**Verifica empirica** via `le10_stress_diagnostics.py`:
- Solver calcola correttamente: `max|uz|=6.4mm, max|rx|=2.8e-3, max|ry|=3.0e-3`
- Postprocess restituisce `sigma_x = sigma_y = tau_xy = 0` per ogni elemento

**Schema gap**: `ElementStress` non ha campi `sigma_*_top/bot`, `M_x/y/xy`.

## File output (nessun core/ toccato)

- `docs/solver_internals_audit.md` (nuovo, sintesi completa T1-T5, ~650 righe)
- `backend/scripts/le1_mesh_diagnostics.py` (nuovo, riusabile in CI)
- `backend/scripts/le1_stress_recovery_diagnostics.py` (nuovo)
- `backend/scripts/le1_loads_diagnostics.py` (nuovo)
- `backend/scripts/le10_stress_diagnostics.py` (nuovo)
- `BACKLOG.md` (NEW-1..4 aggiornati con root cause + Step 0 debt tracking)

## Quality gates
- ✅ Diff aggregato HEAD~N..HEAD: SOLO `BACKLOG.md`, `docs/`, `backend/scripts/`
- ✅ ZERO modifiche in `backend/core/elements/`, `backend/core/solver/`,
  `backend/core/postprocess/`, `backend/tests/`
- ✅ Baseline pytest invariata (no codice produzione toccato)
- ✅ tsc + vitest non eseguiti (no frontend touched)

## Sequenza fix raccomandata: **B (cluster separati)**

3 brief atomici in cascata, totale ~5-7 giorni:

| Brief | Scope | Stima | Rischio |
|---|---|---|---|
| `v2.4.3a-shell-pressure-mitc-fix` | NEW-3 (+ chiarimento NEW-2) | ~3 ore | minimo |
| `v2.4.3b-shell-bending-stress-recovery` | NEW-4 (schema + postprocess) | ~2-3 giorni | media |
| `v2.4.3c-shell-stress-recovery-nodal` | NEW-1 (extrapolation + loads) | ~2-3 giorni | media |

I 3 brief sono **indipendenti tecnicamente** (no prerequisiti hard fra loro).
Possono essere eseguiti in qualsiasi ordine, anche in parallelo se più developer.

**LE2/cantilever/Euler restano sicuri** (no regressione attesa: i fix toccano
solo file shell-specific, beam/truss non toccati).

## Benchmarking permanente

Raccomando promozione `backend/scripts/nafems_truth_measurement.py` a test
pytest (`test_nafems_truth_strict.py`) post-fix, con marker
`@pytest.mark.nafems_strict` skip-by-default fino a `v2.4.3c` chiuso, poi
gate CI permanente al ±5% NAFEMS ufficiale.

## Prossimo passo raccomandato

`v2.4.3a-shell-pressure-mitc-fix` come primo brief di fix — è il più
piccolo (1 ora codice), minimo rischio regressione, chiude un bug P1
isolato (#NEW-3). Buona partenza per ricostruire fiducia nella
formulazione shell prima dei fix più invasivi (`b` e `c`).
