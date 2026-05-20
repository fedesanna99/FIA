"""Helpers + tolleranze per i benchmark NAFEMS LE1/LE2/LE10 (Sprint 1 — D1)."""
from __future__ import annotations


def assert_within_nafems_tolerance(
    value: float,
    target: float,
    tol_pct: float,
    name: str = "result",
) -> None:
    """Assert relativo tipo NAFEMS: |value - target| / |target| <= tol_pct/100.

    NB: per casi target=0 ricade su confronto assoluto.
    """
    if abs(target) < 1e-30:
        err = abs(value)
    else:
        err = abs(value - target) / abs(target)
    assert err * 100 <= tol_pct + 1e-9, (
        f"{name}: ottenuto {value:.6g}, atteso {target:.6g}, "
        f"err = {err*100:.2f}% > tol {tol_pct:.1f}%"
    )
