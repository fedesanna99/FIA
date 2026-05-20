"""Calcolo dello spettro di Fourier (FFT) e spettro di risposta SDOF."""
from __future__ import annotations
import numpy as np


def fft_spectrum(times: list[float], signal: list[float]) -> dict:
    """Trasformata di Fourier monolaterale di un segnale temporale.

    Restituisce dict con frequenze (Hz) e ampiezze normalizzate.
    """
    t = np.asarray(times, dtype=float)
    x = np.asarray(signal, dtype=float)
    n = len(x)
    if n < 4:
        return {"frequencies": [], "amplitudes": [], "phases": [], "dominant_hz": 0.0}
    dt = float(np.mean(np.diff(t)))
    if dt <= 0:
        return {"frequencies": [], "amplitudes": [], "phases": [], "dominant_hz": 0.0}
    X = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, d=dt)
    amps = np.abs(X) * 2.0 / n
    if n > 0:
        amps[0] /= 2.0
    phases = np.angle(X)
    if len(amps) > 1:
        peak_idx = int(np.argmax(amps[1:]) + 1)
        dominant = float(freqs[peak_idx])
    else:
        dominant = 0.0
    return {
        "frequencies": [float(f) for f in freqs],
        "amplitudes": [float(a) for a in amps],
        "phases": [float(p) for p in phases],
        "dominant_hz": dominant,
    }


def response_spectrum(
    times: list[float],
    accelerations: list[float],
    periods: np.ndarray | None = None,
    damping_ratio: float = 0.05,
) -> dict:
    """Spettro di risposta di un'accelerazione (Sd, Sv, Sa) per oscillatori SDOF.

    Per ogni periodo T della griglia, risolve l'equazione SDOF
    m ü + c u̇ + k u = -m a_g(t) con ξ=damping_ratio e ricava i picchi.
    """
    t = np.asarray(times, dtype=float)
    a_g = np.asarray(accelerations, dtype=float)
    n = len(a_g)
    if n < 4:
        return {"periods": [], "Sd": [], "Sv": [], "Sa": []}
    if periods is None:
        periods = np.logspace(np.log10(0.05), np.log10(4.0), 60)
    dt = float(np.mean(np.diff(t)))
    if dt <= 0:
        return {"periods": [], "Sd": [], "Sv": [], "Sa": []}

    Sd, Sv, Sa = [], [], []
    beta, gamma = 0.25, 0.5
    for T in periods:
        omega = 2.0 * np.pi / T
        k = omega * omega
        c = 2.0 * damping_ratio * omega
        a0 = 1.0 / (beta * dt * dt)
        a1 = gamma / (beta * dt)
        a2 = 1.0 / (beta * dt)
        a3 = 1.0 / (2.0 * beta) - 1.0
        a4 = gamma / beta - 1.0
        a5 = dt * (gamma / (2.0 * beta) - 1.0)
        a6 = dt * (1.0 - gamma)
        a7 = dt * gamma
        K_eff = k + a0 + a1 * c
        u, v, a = 0.0, 0.0, -a_g[0]
        u_max = v_max = a_abs_max = 0.0
        for i in range(1, n):
            p_eff = -a_g[i] + (a0 * u + a2 * v + a3 * a) + c * (a1 * u + a4 * v + a5 * a)
            u_new = p_eff / K_eff
            a_new = a0 * (u_new - u) - a2 * v - a3 * a
            v_new = v + a6 * a + a7 * a_new
            u, v, a = u_new, v_new, a_new
            absu, absv = abs(u), abs(v)
            total_acc = abs(a + a_g[i])
            if absu > u_max: u_max = absu
            if absv > v_max: v_max = absv
            if total_acc > a_abs_max: a_abs_max = total_acc
        Sd.append(float(u_max))
        Sv.append(float(v_max))
        Sa.append(float(a_abs_max))
    return {
        "periods": [float(p) for p in periods],
        "Sd": Sd, "Sv": Sv, "Sa": Sa,
        "damping_ratio": damping_ratio,
    }
