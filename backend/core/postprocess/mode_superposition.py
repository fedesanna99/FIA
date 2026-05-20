"""
Sovrapposizione modale — combinazione lineare di shape modali con pesi.

Applicazioni:
    - Visualizzazione modi multipli sovrapposti (es. animazione mix di modi 1+2)
    - Time-history modal superposition: u(t) = Σ φ_i · q_i(t)
    - Modal amplification per response-spectrum: u_max = Σ α_i · φ_i · Γ_i · Sd_i

Input:
    Liste di ModeShape (con ux/uy/uz per nodo) + pesi w_i.
Output:
    dict {node_id: (ux_sum, uy_sum, uz_sum)} con la combinazione lineare.

Inoltre vengono fornite utility per verifica:
    - check_modal_orthogonality(phi_i, phi_j, M) → φ_i^T M φ_j
"""
from __future__ import annotations
from typing import Sequence

from schemas.results import ModeShape


def superpose_modes(
    modes: Sequence[ModeShape],
    weights: Sequence[float],
) -> dict[int, tuple[float, float, float]]:
    """Combinazione lineare di modi: u_node = Σ w_i · φ_i,node.

    Args:
        modes   : lista di ModeShape (ognuno con .displacements: list[NodalDisplacement])
        weights : pesi w_i corrispondenti.

    Returns:
        dict {node_id: (ux, uy, uz)} con la deformata combinata (solo traslazioni).
    """
    if len(modes) != len(weights):
        raise ValueError(
            f"modes ({len(modes)}) e weights ({len(weights)}) di lunghezza diversa"
        )
    if not modes:
        return {}
    combined: dict[int, list[float]] = {}
    for mode, w in zip(modes, weights):
        for d in mode.displacements:
            if d.node_id not in combined:
                combined[d.node_id] = [0.0, 0.0, 0.0]
            combined[d.node_id][0] += w * d.ux
            combined[d.node_id][1] += w * d.uy
            combined[d.node_id][2] += w * d.uz
    return {k: tuple(v) for k, v in combined.items()}  # type: ignore


def normalize_to_unit_max(
    deformed: dict[int, tuple[float, float, float]],
) -> dict[int, tuple[float, float, float]]:
    """Normalizza la deformata in modo che max|u_i| = 1."""
    if not deformed:
        return {}
    max_abs = max(
        max(abs(c) for c in v) for v in deformed.values()
    )
    if max_abs == 0:
        return deformed
    return {
        k: (v[0] / max_abs, v[1] / max_abs, v[2] / max_abs)
        for k, v in deformed.items()
    }


def amplify_for_animation(
    deformed: dict[int, tuple[float, float, float]],
    amplitude: float,
    *,
    base_size: float = 1.0,
) -> dict[int, tuple[float, float, float]]:
    """Scala la deformata per visualizzazione (amplitude * unit_max).

    base_size è la lunghezza caratteristica del modello — la deformata
    viene normalizzata e poi moltiplicata per amplitude * base_size.
    """
    normalized = normalize_to_unit_max(deformed)
    factor = amplitude * base_size
    return {
        k: (v[0] * factor, v[1] * factor, v[2] * factor)
        for k, v in normalized.items()
    }
