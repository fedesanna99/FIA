"""
Error estimator a posteriori — versione semplificata Zienkiewicz-Zhu (1987).

Idea base:
    1. Si parte da un campo σ_h (calcolato dal solver, costante o
       discontinuo a tratti su ogni elemento).
    2. Si calcola σ_smoothed (per nodo): media pesata delle σ_h degli
       elementi che condividono quel nodo.
    3. L'errore locale per elemento è la norma L2 della differenza tra
       σ_h e σ_smoothed (proiettata sull'elemento).
    4. L'errore globale è la radice della somma dei quadrati degli errori
       per elemento.

Limitazioni:
    - Versione semplificata: si lavora su stress nodali, non sui Gauss
      points; le funzioni di forma non sono integrate esattamente.
    - Valida per stime relative di errore, non per certificazioni FEM.
"""
from __future__ import annotations
from dataclasses import dataclass, field
import math


@dataclass
class ZZErrorResult:
    """Risultato della stima Zienkiewicz-Zhu."""
    element_errors: dict[int, float] = field(default_factory=dict)
    global_error: float = 0.0
    refinement_candidates: list[int] = field(default_factory=list)  # eid ordinati per errore


def _smooth_nodal_values(
    element_values: dict[int, float],
    element_nodes: dict[int, list[int]],
) -> dict[int, float]:
    """Calcola un valore "smoothed" per nodo come media dei valori degli
    elementi che condividono quel nodo."""
    sums: dict[int, float] = {}
    counts: dict[int, int] = {}
    for eid, val in element_values.items():
        for nid in element_nodes.get(eid, []):
            sums[nid] = sums.get(nid, 0.0) + val
            counts[nid] = counts.get(nid, 0) + 1
    return {nid: sums[nid] / counts[nid] for nid in sums}


def zz_error_estimate(
    element_values: dict[int, float],
    element_nodes: dict[int, list[int]],
    *,
    refine_fraction: float = 0.2,
) -> ZZErrorResult:
    """Stima Zienkiewicz-Zhu dell'errore.

    Args:
        element_values  : dict {eid: σ_h_elem} — valore costante per elemento
        element_nodes   : dict {eid: [n1, n2, ...]} — nodi appartenenti all'elem
        refine_fraction : frazione di elementi candidati per rifinitura
                          (es. 0.2 → top 20% con errore maggiore).

    Returns:
        ZZErrorResult con element_errors, global_error, refinement_candidates.
    """
    if not element_values:
        return ZZErrorResult()

    # 1. Smooth nodal field
    nodal_smoothed = _smooth_nodal_values(element_values, element_nodes)

    # 2. Per ogni elemento, "ricostruisce" la σ_smoothed come media dei
    #    valori nodali → confronta col valore σ_h
    element_errors: dict[int, float] = {}
    for eid, sigma_h in element_values.items():
        nids = element_nodes.get(eid, [])
        if not nids:
            element_errors[eid] = 0.0
            continue
        sigma_smooth = sum(nodal_smoothed[nid] for nid in nids) / len(nids)
        # Errore locale: |σ_h - σ_smoothed| (semplificato, no integrazione)
        element_errors[eid] = abs(sigma_h - sigma_smooth)

    # 3. Errore globale (norma L2 discreta)
    global_err = math.sqrt(sum(e * e for e in element_errors.values()))

    # 4. Candidati per rifinitura: top refine_fraction
    sorted_eids = sorted(element_errors, key=lambda k: element_errors[k], reverse=True)
    n_top = max(1, int(refine_fraction * len(sorted_eids)))
    candidates = sorted_eids[:n_top]

    return ZZErrorResult(
        element_errors=element_errors,
        global_error=global_err,
        refinement_candidates=candidates,
    )


def relative_error(
    element_values: dict[int, float],
    element_nodes: dict[int, list[int]],
) -> float:
    """η = ||σ_h - σ_smoothed|| / ||σ_smoothed|| (norma relativa)."""
    result = zz_error_estimate(element_values, element_nodes)
    nodal_smoothed = _smooth_nodal_values(element_values, element_nodes)
    norm_smooth = math.sqrt(sum(v * v for v in nodal_smoothed.values()))
    if norm_smooth < 1e-30:
        return 0.0
    return result.global_error / norm_smooth
