"""Test su FFT e spettro di risposta."""
import math
import numpy as np
import pytest

from core.postprocess import fft_spectrum, response_spectrum


def test_fft_pure_sinusoid_finds_frequency():
    f0 = 5.0
    dt = 0.005
    t = np.arange(0, 2.0, dt)
    x = np.sin(2 * np.pi * f0 * t)
    s = fft_spectrum(t.tolist(), x.tolist())
    assert s["dominant_hz"] == pytest.approx(f0, abs=0.5)
    assert len(s["frequencies"]) > 0
    assert len(s["amplitudes"]) == len(s["frequencies"])


def test_fft_two_components():
    f1, f2 = 2.0, 8.0
    dt = 0.002
    t = np.arange(0, 3.0, dt)
    x = np.sin(2 * np.pi * f1 * t) + 0.5 * np.sin(2 * np.pi * f2 * t)
    s = fft_spectrum(t.tolist(), x.tolist())
    amps = np.array(s["amplitudes"])
    freqs = np.array(s["frequencies"])
    top2_idx = np.argsort(amps)[-2:]
    top2_freqs = sorted(freqs[top2_idx])
    assert top2_freqs[0] == pytest.approx(f1, abs=0.5)
    assert top2_freqs[1] == pytest.approx(f2, abs=0.5)


def test_fft_short_signal_returns_empty():
    s = fft_spectrum([0.0, 0.1], [1.0, 0.0])
    assert s["frequencies"] == []


def test_response_spectrum_runs():
    dt = 0.01
    t = np.arange(0, 5.0, dt)
    a_g = np.where(t < 0.2, 5.0 * np.sin(np.pi * t / 0.2), 0.0)
    r = response_spectrum(t.tolist(), a_g.tolist(),
                          periods=np.linspace(0.1, 2.0, 20))
    assert len(r["periods"]) == 20
    assert len(r["Sd"]) == 20
    assert all(math.isfinite(v) for v in r["Sa"])
    assert max(r["Sa"]) > 0


def test_response_spectrum_resonance():
    """Test: oscillatore con T=1s sollecitato da accel armonica a f=1Hz risuona."""
    dt = 0.001
    t = np.arange(0, 8.0, dt)
    f0 = 1.0
    a_g = np.sin(2 * np.pi * f0 * t)
    r = response_spectrum(t.tolist(), a_g.tolist(),
                          periods=np.linspace(0.3, 2.0, 30),
                          damping_ratio=0.02)
    periods = np.array(r["periods"])
    Sa = np.array(r["Sa"])
    peak_T = periods[np.argmax(Sa)]
    assert peak_T == pytest.approx(1.0 / f0, abs=0.15)
