"""
Analisi a fatica — Rainflow counting (ASTM E1049-85) + curve S-N (EC3-1-9)
+ accumulazione danno secondo Palmgren-Miner.

Algoritmi:
    1. extract_peaks_valleys(signal) → riduce segnale ai soli punti di
       inversione (turning points).
    2. rainflow_count(turning_points) → produce cicli con (range, mean,
       count) secondo ASTM E1049-85.
    3. SNCurve(category, ...)         → curva S-N a doppia pendenza EC3-1-9
       (m=3 per N < 5e6, m=5 per cycles 5e6 < N < 1e8, CAFL sopra).
    4. miner_damage(cycles, sn_curve) → Σ n_i / N_i.

Riferimenti:
    - ASTM E1049-85 Standard Practices for Cycle Counting in Fatigue Analysis
    - EN 1993-1-9:2005 Eurocode 3 part 1-9 Fatigue
    - Palmgren A. (1924), Miner M.A. (1945)
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class FatigueCycle:
    """Ciclo identificato dal Rainflow."""
    range: float      # ampiezza picco-picco
    mean: float       # valor medio
    count: float      # 0.5 (mezzo ciclo) o 1.0 (ciclo intero)


def extract_peaks_valleys(signal: list[float]) -> list[float]:
    """Riduce signal ai soli turning points (massimi e minimi locali).

    Preserva i due estremi del segnale per consistenza ASTM.
    Punti consecutivi uguali vengono fusi.
    """
    if len(signal) < 2:
        return list(signal)
    # Deduplica punti consecutivi uguali
    dedup = [signal[0]]
    for v in signal[1:]:
        if v != dedup[-1]:
            dedup.append(v)
    if len(dedup) <= 2:
        return dedup
    turning = [dedup[0]]
    for i in range(1, len(dedup) - 1):
        prev = dedup[i - 1]; cur = dedup[i]; nxt = dedup[i + 1]
        if (cur > prev and cur > nxt) or (cur < prev and cur < nxt):
            turning.append(cur)
    turning.append(dedup[-1])
    return turning


def rainflow_count(turning_points: list[float]) -> list[FatigueCycle]:
    """Algoritmo Rainflow ASTM E1049-85 §5.4.5 — 'four-point' method.

    Per ogni nuovo turning point, se gli ultimi 4 punti dello stack A-B-C-D
    soddisfano |B-C| ≤ |A-B| e |B-C| ≤ |C-D|, allora B-C è un ciclo completo
    (range = |B-C|, mean = (B+C)/2). B e C vengono rimossi dallo stack e si
    riapplica la regola.

    I segmenti residui sullo stack vengono contati come mezzi cicli (ASTM
    §5.4.5(c)).

    Args:
        turning_points : segnale ridotto ai picchi/valli.

    Returns:
        Lista di FatigueCycle. count=1.0 (intero) o 0.5 (mezzo).
    """
    if len(turning_points) < 2:
        return []
    cycles: list[FatigueCycle] = []
    stack: list[float] = []

    for pt in turning_points:
        stack.append(pt)
        # Riduzione 4-point: tenta di estrarre cicli interni B-C
        while len(stack) >= 4:
            A, B, C, D = stack[-4], stack[-3], stack[-2], stack[-1]
            rng_BC = abs(B - C)
            rng_AB = abs(A - B)
            rng_CD = abs(C - D)
            if rng_BC <= rng_AB and rng_BC <= rng_CD:
                cycles.append(FatigueCycle(
                    range=rng_BC, mean=(B + C) / 2.0, count=1.0,
                ))
                # Rimuovi B e C (gli elementi -3 e -2)
                del stack[-3:-1]
            else:
                break

    # Residui: ogni segmento consecutivo è un mezzo ciclo
    for i in range(len(stack) - 1):
        rng = abs(stack[i] - stack[i + 1])
        mean = (stack[i] + stack[i + 1]) / 2.0
        cycles.append(FatigueCycle(range=rng, mean=mean, count=0.5))

    return cycles


def cycle_histogram(
    cycles: list[FatigueCycle], n_bins: int = 10,
) -> tuple[list[tuple[float, float]], list[float]]:
    """Istogramma 1D dei range. Restituisce (bins, counts)."""
    if not cycles:
        return [], []
    ranges = [c.range for c in cycles]
    rmin, rmax = min(ranges), max(ranges)
    if rmin == rmax:
        return [(rmin, rmin)], [sum(c.count for c in cycles)]
    width = (rmax - rmin) / n_bins
    bins = [(rmin + i * width, rmin + (i + 1) * width) for i in range(n_bins)]
    counts = [0.0] * n_bins
    for c in cycles:
        idx = min(int((c.range - rmin) / width), n_bins - 1)
        counts[idx] += c.count
    return bins, counts


# ============================================================================
# Curve S-N — EC3-1-9 categories
# ============================================================================

@dataclass(frozen=True)
class SNCurve:
    """Curva S-N a 2 pendenze come da EC3-1-9 §7.

    Args:
        delta_sigma_C : range di tensione di riferimento a 2e6 cicli [MPa]
        m1            : pendenza fino a 5e6 cicli (default 3)
        m2            : pendenza 5e6 → 1e8 cicli (default 5)
        N_D           : cicli al cambio pendenza (default 5e6)
        N_L           : cicli oltre i quali nessun danno (CAFL endurance,
                        default 1e8)
        delta_sigma_L : range di tensione al CAFL = N_L (calcolato auto se None)
    """
    delta_sigma_C: float
    m1: float = 3.0
    m2: float = 5.0
    N_C: float = 2e6
    N_D: float = 5e6
    N_L: float = 1e8
    delta_sigma_L: float | None = None

    def cycles_to_failure(self, delta_sigma: float) -> float:
        """N_i per un dato range di tensione.

        Restituisce ∞ se delta_sigma è sotto il CAFL.
        """
        if delta_sigma <= 0:
            return float("inf")
        # ΔσD a N_D: vale ΔσC · (N_C / N_D)^(1/m1)
        ds_D = self.delta_sigma_C * (self.N_C / self.N_D) ** (1.0 / self.m1)
        # ΔσL a N_L: con pendenza m2 da N_D
        ds_L = (self.delta_sigma_L
                if self.delta_sigma_L is not None
                else ds_D * (self.N_D / self.N_L) ** (1.0 / self.m2))
        if delta_sigma <= ds_L:
            return float("inf")  # below CAFL → no fatigue damage
        if delta_sigma >= ds_D:
            # tratto m1 (alti cicli)
            return self.N_C * (self.delta_sigma_C / delta_sigma) ** self.m1
        # tratto m2 (bassi cicli)
        return self.N_D * (ds_D / delta_sigma) ** self.m2


# Categorie di dettaglio EC3-1-9 Tab. 8.1 (selezione comune)
_EC3_CATEGORIES: dict[int, SNCurve] = {
    36: SNCurve(delta_sigma_C=36),
    40: SNCurve(delta_sigma_C=40),
    45: SNCurve(delta_sigma_C=45),
    50: SNCurve(delta_sigma_C=50),
    56: SNCurve(delta_sigma_C=56),
    63: SNCurve(delta_sigma_C=63),
    71: SNCurve(delta_sigma_C=71),
    80: SNCurve(delta_sigma_C=80),
    90: SNCurve(delta_sigma_C=90),
    100: SNCurve(delta_sigma_C=100),
    112: SNCurve(delta_sigma_C=112),
    125: SNCurve(delta_sigma_C=125),
    140: SNCurve(delta_sigma_C=140),
    160: SNCurve(delta_sigma_C=160),
}


def ec3_category(category: int) -> SNCurve:
    """Restituisce la curva S-N EC3 per la categoria di dettaglio indicata."""
    if category not in _EC3_CATEGORIES:
        raise KeyError(
            f"Categoria EC3 '{category}' non disponibile. "
            f"Disponibili: {sorted(_EC3_CATEGORIES)}"
        )
    return _EC3_CATEGORIES[category]


# ============================================================================
# Palmgren-Miner damage
# ============================================================================

def miner_damage(
    cycles: list[FatigueCycle],
    sn_curve: SNCurve,
    *,
    safety_factor_gamma_Mf: float = 1.0,
) -> float:
    """Calcola Σ n_i/N_i applicando il fattore parziale γ_Mf alle Δσ.

    Args:
        cycles            : output di rainflow_count
        sn_curve          : curva S-N (es. ec3_category(80))
        safety_factor_gamma_Mf : γ_Mf da EC3-1-9 §3 (1.0..1.35); moltiplica Δσ
                                 prima del calcolo di N_i, riducendo la vita.

    Returns:
        Damage D in [0, +∞). Failure quando D ≥ 1.
    """
    if safety_factor_gamma_Mf <= 0:
        raise ValueError("γ_Mf deve essere > 0")
    total = 0.0
    for c in cycles:
        ds = c.range * safety_factor_gamma_Mf
        N = sn_curve.cycles_to_failure(ds)
        if N == float("inf"):
            continue
        total += c.count / N
    return total
