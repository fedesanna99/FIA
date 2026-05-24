"""
Consistent nodal stress recovery (v2.4.3c, NEW-1 audit v2.3.7).

Implementa il pattern standard FEM Hinton-Campbell: stress ai nodi
mediati sugli elementi adiacenti, poi distribuito back ai centroidi
elementari come media dei 4 nodi.

Riduce errore di stress recovery in punti di concentrazione (gradient
elevato), specie ai bordi di fori e tagli.

Riferimenti:
    Hinton, E. & Campbell, J.S. (1974), "Local and global smoothing of
    discontinuous finite element functions using a least squares method",
    Int. J. Numer. Methods Eng., 8(3): 461-480.
    Bathe, K-J., "Finite Element Procedures" 2nd ed. (2014), §5.4 stress
    recovery + §5.7 smoothing.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, List


# Campi shell stress che vengono mediati ai nodi condivisi.
# Tutti gli altri campi (centroid, principal_*) restano puntuali sull'elemento.
_AVERAGED_FIELDS = (
    "sigma_x", "sigma_y", "tau_xy",
    "sigma_x_top", "sigma_y_top", "tau_xy_top",
    "sigma_x_bot", "sigma_y_bot", "tau_xy_bot",
    "M_x", "M_y", "M_xy",
)


def consistent_nodal_average(
    per_element_node_stresses: Dict[int, List[Dict[str, float]]],
    element_node_ids: Dict[int, List[int]],
) -> Dict[int, Dict[str, float]]:
    """Calcola la media degli stress ai nodi condivisi fra più elementi.

    Args:
        per_element_node_stresses: ``{element_id: [stress_node0, stress_node1, ...]}``
            dove ogni ``stress_nodeI`` è il dict ritornato da
            ``ShellQuad4.stresses_at_nodes()``.
        element_node_ids: ``{element_id: [node_id_0, ..., node_id_3]}`` mappa
            element_id → ordine dei suoi nodi (stesso ordine di
            ``per_element_node_stresses``).

    Returns:
        ``{node_id: averaged_stress_dict}``. Solo i campi in
        ``_AVERAGED_FIELDS`` sono mediati; altri campi sono lasciati invariati
        (verranno ricalcolati elemento-per-elemento al pass successivo).
    """
    # Group contributions per node
    node_contribs: Dict[int, List[Dict[str, float]]] = defaultdict(list)
    for el_id, node_stresses in per_element_node_stresses.items():
        node_ids = element_node_ids.get(el_id, [])
        for local_i, stress in enumerate(node_stresses):
            if local_i < len(node_ids):
                node_contribs[node_ids[local_i]].append(stress)

    # Average each field per node
    result: Dict[int, Dict[str, float]] = {}
    for node_id, contribs in node_contribs.items():
        n = len(contribs)
        if n == 0:
            continue
        avg: Dict[str, float] = {}
        for field in _AVERAGED_FIELDS:
            vals = [c.get(field, 0.0) for c in contribs]
            avg[field] = sum(vals) / n
        result[node_id] = avg
    return result


def element_value_from_nodal_average(
    element_nodal_stresses: List[Dict[str, float]],
) -> Dict[str, float]:
    """Per un elemento, ritorna la media dei suoi 4 stress nodali
    (consistent-averaged).

    Args:
        element_nodal_stresses: list di 4 dict (uno per ogni nodo
            dell'elemento), gia' processati con ``consistent_nodal_average``.

    Returns:
        Dict con campi mediati (membrana + bending).
    """
    n = len(element_nodal_stresses)
    if n == 0:
        return {field: 0.0 for field in _AVERAGED_FIELDS}
    avg: Dict[str, float] = {}
    for field in _AVERAGED_FIELDS:
        avg[field] = sum(s.get(field, 0.0) for s in element_nodal_stresses) / n
    return avg
