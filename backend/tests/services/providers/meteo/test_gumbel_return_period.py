"""Tests per Gumbel Type I return period estimator (Sprint 2 — F4.1)."""
from __future__ import annotations

import math

import pytest

from services.providers.meteo._gumbel_return_period import (
    EULER_MASCHERONI,
    annual_maxima_from_daily,
    gumbel_return_period,
)


def test_known_dataset_method_of_moments():
    """Calcolo a mano: maxima [10,12,15,13,11,14,16,12,13,14].

    m = 13.0, var = 30/9 ≈ 3.333, s ≈ 1.826
    beta = s·√6/π ≈ 1.4233
    mu   = 13.0 - 0.5772·1.4233 ≈ 12.1784
    Per T=50: p=0.98, -ln(-ln(0.98)) ≈ 3.9019
    x_50 = mu + beta·3.9019 ≈ 17.73
    """
    data = [10, 12, 15, 13, 11, 14, 16, 12, 13, 14]
    x_50 = gumbel_return_period(data, T=50)
    # Calcolo a mano: x_50 ≈ 17.73 m/s (margine ±0.05 per arrotondamenti)
    assert 17.65 < x_50 < 17.85


def test_known_dataset_t10():
    """Stesso dataset, T=10. -ln(-ln(0.9)) ≈ 2.2504.

    x_10 ≈ 12.178 + 1.4233·2.2504 ≈ 15.38
    """
    data = [10, 12, 15, 13, 11, 14, 16, 12, 13, 14]
    x_10 = gumbel_return_period(data, T=10)
    assert 15.20 < x_10 < 15.55


def test_monotonic_in_T():
    """Quantile cresce monotonicamente con T."""
    data = [10, 12, 15, 13, 11, 14, 16, 12, 13, 14]
    q = [gumbel_return_period(data, T=t) for t in (2, 5, 10, 50, 100, 1000)]
    for i in range(1, len(q)):
        assert q[i] > q[i - 1], f"q[{i}]={q[i]} non > q[{i-1}]={q[i-1]}"


def test_empty_returns_zero():
    assert gumbel_return_period([], T=50) == 0.0


def test_single_value_returns_itself():
    """N=1 non permette stima MoM, ritorna il valore (clippato a >=0)."""
    assert gumbel_return_period([15.0], T=50) == 15.0
    assert gumbel_return_period([-5.0], T=50) == 0.0  # clip negativi


def test_constant_data_returns_mean():
    """Std=0: distribuzione degenerare, ritorna media."""
    assert gumbel_return_period([8.0, 8.0, 8.0, 8.0], T=50) == 8.0


def test_t_le_one_raises():
    with pytest.raises(ValueError):
        gumbel_return_period([1, 2, 3], T=1)
    with pytest.raises(ValueError):
        gumbel_return_period([1, 2, 3], T=0)


def test_negative_quantile_clipped_to_zero():
    """Per dati prossimi a 0 con varianza piccola, il modello puo' dare q<0."""
    data = [0.1, 0.1, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.1]
    q = gumbel_return_period(data, T=50)
    assert q >= 0.0


def test_filters_none_values():
    """Annual maxima con None dovrebbero essere ignorati."""
    data = [10, None, 15, 13, None, 14, 16, 12, 13, 14]  # type: ignore[list-item]
    q = gumbel_return_period(data, T=50)  # type: ignore[arg-type]
    # Stima con 8 valori validi
    assert q > 14.0


def test_euler_mascheroni_constant_precision():
    """Constante deve avere precisione full-double per consistency."""
    assert abs(EULER_MASCHERONI - 0.5772156649015329) < 1e-15


def test_annual_maxima_from_daily_basic():
    dates = ["2020-01-01", "2020-06-15", "2021-03-10", "2021-12-31"]
    vals = [10.0, 25.0, 18.0, 22.0]
    maxima = annual_maxima_from_daily(dates, vals)
    assert maxima == [25.0, 22.0]


def test_annual_maxima_from_daily_handles_none():
    dates = ["2020-01-01", "2020-06-15", "2021-03-10"]
    vals = [10.0, None, 18.0]
    maxima = annual_maxima_from_daily(dates, vals)
    assert maxima == [10.0, 18.0]


def test_annual_maxima_from_daily_empty():
    assert annual_maxima_from_daily([], []) == []


def test_annual_maxima_from_daily_length_mismatch_raises():
    with pytest.raises(ValueError):
        annual_maxima_from_daily(["2020-01-01"], [1.0, 2.0])
