"""
Postprocess di drift e interstory drift da risultati time-history.

Funzioni:
    - interstory_drift_history(node_history, levels, axis)
        Ritorna lo storico nel tempo della differenza di spostamento
        tra coppie consecutive di nodi (piano i, piano i-1).
    - max_drift_per_storey(...)
        Max valore assoluto del drift per ogni piano.
    - drift_ratio(drift, h_storey)
        Rapporto drift / altezza di piano (es. 1/200 per EC8 SLE).
"""
from __future__ import annotations


def interstory_drift_history(
    node_history: dict[int, dict[str, list[float]]],
    levels: list[int],
    *,
    axis: str = "ux",
) -> dict[int, list[float]]:
    """Calcola la storia di drift tra coppie di piani consecutive.

    Args:
        node_history : dict {node_id: {"ux": [...], "uy": [...], ...}}
                       come ritornato da DynamicResults.node_history
        levels       : lista di node_id ordinata dal basso (base) verso l'alto.
                       I drift saranno levels[i] - levels[i-1].
        axis         : asse di drift (default 'ux').

    Returns:
        dict {storey_index: [drift(t0), drift(t1), …]}
        con storey_index = 1 per il primo piano (levels[1]-levels[0]), ecc.
    """
    if len(levels) < 2:
        raise ValueError("Servono almeno 2 nodi/piani per il drift.")
    if axis not in ("ux", "uy", "uz"):
        raise ValueError(f"axis '{axis}' deve essere ux/uy/uz")
    missing = [nid for nid in levels if nid not in node_history]
    if missing:
        raise KeyError(f"Nodi mancanti in node_history: {missing}")

    drifts: dict[int, list[float]] = {}
    for i in range(1, len(levels)):
        up = node_history[levels[i]][axis]
        lo = node_history[levels[i - 1]][axis]
        if len(up) != len(lo):
            raise ValueError("Storie temporali di lunghezza diversa.")
        drifts[i] = [u - l for u, l in zip(up, lo)]
    return drifts


def max_drift_per_storey(
    node_history: dict[int, dict[str, list[float]]],
    levels: list[int],
    *,
    axis: str = "ux",
) -> dict[int, float]:
    """Max |drift| per ogni piano."""
    hist = interstory_drift_history(node_history, levels, axis=axis)
    return {k: max(abs(v) for v in vals) for k, vals in hist.items()}


def drift_ratio(drift: float, h_storey: float) -> float:
    """drift/h_storey. Lancia se h_storey ≤ 0."""
    if h_storey <= 0:
        raise ValueError("h_storey deve essere > 0")
    return drift / h_storey
