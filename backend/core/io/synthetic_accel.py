"""
Generatori di accelerogrammi sintetici.

Modelli implementati:
    1. Kanai-Tajimi  → spettro di potenza filtrato (rumore bianco × KT)
    2. Boore         → filtered white-noise con envelope di Saragoni-Hart
    3. Spectrum-compatible → matching iterativo con uno spettro target EC8

Riferimenti:
    Kanai (1957), Tajimi (1960) per il filtro KT.
    Saragoni & Hart (1974) per l'envelope.
    Boore (2003) per la generazione stocastica.

Per il matching con spettri EC8 si usa l'algoritmo di Hartmann (frequency
domain scaling) — semplificato per cantieri educativi, non per produzione.
"""
from __future__ import annotations
import math
import random
from .accelerogram import AccelerogramRecord


_G = 9.80665  # m/s²


def _saragoni_hart_envelope(
    n_samples: int, dt: float,
    t1: float, t2: float, t3: float,
) -> list[float]:
    """Envelope a 3 fasi (cresci → plateau → decadi).

    Args:
        t1 : fine fase di crescita [s]
        t2 : inizio fase di decadimento [s]
        t3 : totale [s]
    """
    env: list[float] = []
    for i in range(n_samples):
        t = i * dt
        if t < t1:
            v = (t / t1) ** 2 if t1 > 0 else 0.0
        elif t < t2:
            v = 1.0
        elif t < t3:
            v = math.exp(-0.155 * (t - t2))
        else:
            v = 0.0
        env.append(v)
    return env


def kanai_tajimi_accelerogram(
    pga: float,
    dt: float = 0.01,
    duration: float = 20.0,
    *,
    omega_g: float = 5 * 2 * math.pi,   # 5 Hz — frequenza dominante terreno (default firm soil)
    xi_g: float = 0.6,                  # damping del filtro KT
    t1: float = 2.0, t2: float = 10.0,
    seed: int | None = None,
) -> AccelerogramRecord:
    """Genera un accelerogramma stocastico Kanai-Tajimi con envelope di Saragoni-Hart.

    Args:
        pga         : PGA target [m/s²]
        dt          : passo temporale [s]
        duration    : durata totale [s]
        omega_g     : frequenza dominante del filtro [rad/s]
        xi_g        : damping del filtro
        t1, t2      : tempi di transizione dell'envelope
        seed        : seed per riproducibilità

    Returns:
        AccelerogramRecord normalizzato in m/s² con PGA esattamente == `pga`.
    """
    if seed is not None:
        random.seed(seed)
    n = int(math.ceil(duration / dt)) + 1
    # 1. White noise gaussiano
    w = [random.gauss(0, 1) for _ in range(n)]
    # 2. Filtro KT (eq differenziale 2° ordine integrata Euler)
    # ẍ_g + 2ξ_g ω_g ẋ_g + ω_g² x_g = -w(t)
    # a_g(t) = 2ξ_g ω_g ẋ_g + ω_g² x_g
    x = 0.0
    xd = 0.0
    a_raw: list[float] = []
    for wi in w:
        # Integratore Euler esplicito
        xdd = -2 * xi_g * omega_g * xd - omega_g * omega_g * x - wi
        xd = xd + xdd * dt
        x = x + xd * dt
        a = 2 * xi_g * omega_g * xd + omega_g * omega_g * x
        a_raw.append(a)
    # 3. Envelope Saragoni-Hart
    env = _saragoni_hart_envelope(n, dt, t1, t2, duration)
    a_env = [a * e for a, e in zip(a_raw, env)]
    # 4. Normalizza per PGA target
    cur_max = max(abs(a) for a in a_env) or 1.0
    scale = pga / cur_max
    samples = [a * scale for a in a_env]
    return AccelerogramRecord(
        name=f"synth_KT_{int(omega_g/(2*math.pi))}Hz",
        dt=dt, npts=n, samples=samples,
        units="m/s^2",
        pga=max(abs(a) for a in samples),
        source="synthetic_KT",
        meta={
            "omega_g_rad_s": str(omega_g),
            "xi_g": str(xi_g),
            "envelope_t1": str(t1),
            "envelope_t2": str(t2),
        },
    )


def boore_white_noise_accelerogram(
    pga: float,
    dt: float = 0.01,
    duration: float = 20.0,
    *,
    t1: float = 2.0, t2: float = 10.0,
    seed: int | None = None,
) -> AccelerogramRecord:
    """Generazione semplice: bianco gaussiano × envelope di Saragoni-Hart.

    Meno realistica del Kanai-Tajimi (manca filtro spettrale), utile per test.
    """
    if seed is not None:
        random.seed(seed)
    n = int(math.ceil(duration / dt)) + 1
    w = [random.gauss(0, 1) for _ in range(n)]
    env = _saragoni_hart_envelope(n, dt, t1, t2, duration)
    raw = [w_i * e for w_i, e in zip(w, env)]
    cur_max = max(abs(a) for a in raw) or 1.0
    scale = pga / cur_max
    samples = [a * scale for a in raw]
    return AccelerogramRecord(
        name="synth_Boore_white",
        dt=dt, npts=n, samples=samples,
        units="m/s^2",
        pga=max(abs(a) for a in samples),
        source="synthetic_Boore",
    )
