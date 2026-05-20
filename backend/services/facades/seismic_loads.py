"""SeismicLoadsService — facade per design loads sismici (Sprint 2 — B3).

Dato lat/lon (+ opzionalmente soil_category), calcola:
    - magnitudo massima storica M_max via USGS catalog (radius/years)
    - accelerazione al sito a_g/g (GMPE Sabetta-Pugliese 1996 semplificato)
    - parametri spettrali F_0, T_c* (default NTC 2018)
    - response spectrum elastico (T -> S_e(T)) per progettazione EC8/NTC

Pipeline:
    1. orchestrator.call("seismic", "historical_max_magnitude", lat, lon, ...)
    2. GMPE per stimare a_g
    3. Construct response spectrum NTC 2018 §3.2.3.2

ASSUNZIONI v1.3 (documentate per upgrade futuro):
    - **a_g e' una STIMA da M_max storico**, NON il vero a_g da tabella
      reticolo NTC 2018 (che richiederebbe dataset ufficiale 10751 nodi).
      Per progetto reale: usare tabella ufficiale + Vita di Riferimento +
      Classe d'Uso. Output di v1.3 e' utile per stima preliminare /
      pre-progetto / didattica.
    - GMPE usato: legge attenuazione semplificata in forma
      log10(PGA/g) = c1 + c2·(M-6) + c3·log10(R+h_ref)
      taratura empirica vagamente Sabetta-Pugliese 1996 per Italia.
    - distanza ipocentrale R: 20 km default (epicentro tipico catalogo)
    - F_0 = 2.5 (valore medio italiano, range 2.2-2.8)
    - T_c* = 0.35 s (range 0.3-0.5)
    - smorzamento ξ = 5% (eta = 1.0)
    - soil category A (terreno rigido) default; B/C/D/E supportati con
      tabella C_C + S NTC 2018 Tab. 3.2.II
    - vita riferimento V_R = 50 anni, T_R = 475 anni (SLV ordinario)

Riferimenti:
    - NTC 2018 §3.2.3 (spettri di risposta elastici)
    - NTC 2018 Tab. 3.2.II (coefficienti di sottosuolo)
    - EN 1998-1:2004 §3.2.2.2 (analogo europeo)
    - Sabetta & Pugliese, 1996 (GMPE Italia)
"""
from __future__ import annotations

import logging
import math
from typing import Literal

from pydantic import BaseModel, Field

from ..orchestrator import ServiceOrchestrator, orchestrator as default_orchestrator
from ..providers.meteo.errors import ProviderError, ProviderUnavailableError


logger = logging.getLogger(__name__)


# ---- Costanti NTC 2018 / EC8 ---------------------------------------------

# GMPE Sabetta-Pugliese 1996 (Italia, soil A reference)
# log10(PGA/g) = c1 + c2·M + c3·log10(sqrt(R² + h²))
GMPE_C1 = -1.845
GMPE_C2 = 0.363
GMPE_C3 = -1.0
GMPE_H_REF = 5.0  # km
GMPE_R_DEFAULT_KM = 20.0

# NTC 2018 default
F_0_DEFAULT = 2.5
T_C_STAR_DEFAULT = 0.35    # secondi
DAMPING_RATIO_DEFAULT = 0.05  # 5%
V_R_DEFAULT_YEARS = 50

# Tab. 3.2.II NTC 2018 — categoria sottosuolo
SoilCategory = Literal["A", "B", "C", "D", "E"]
SOIL_S: dict[str, float] = {"A": 1.00, "B": 1.20, "C": 1.50, "D": 1.80, "E": 1.60}
SOIL_C_C: dict[str, float] = {"A": 1.00, "B": 1.10, "C": 1.05, "D": 1.25, "E": 1.15}

# Spettro: numero di punti default
SPECTRUM_N_POINTS_DEFAULT = 100
SPECTRUM_T_MAX_S_DEFAULT = 4.0


# ---- DTO ----------------------------------------------------------------


class SeismicLoadsLocation(BaseModel):
    lat: float
    lon: float
    elevation_m: float | None = None
    elevation_source: str | None = None


class SeismicSiteParams(BaseModel):
    """Parametri del sito secondo NTC 2018 §3.2.3."""

    a_g_over_g: float = Field(description="a_g/g (accelerazione orizzontale al sito)")
    F_0: float = Field(description="Amplificazione spettrale massima")
    T_c_star_s: float = Field(description="Periodo inizio velocita' costante (s)")
    soil_category: SoilCategory = Field(default="A")
    S: float = Field(description="Coefficiente di sottosuolo (S = S_S · S_T, qui S_T=1)")
    C_C: float = Field(description="Coefficiente per T_C (NTC 2018 Tab. 3.2.II)")
    T_B_s: float = Field(description="Periodo inizio tratto costante (s) = T_C/3")
    T_C_s: float = Field(description="Periodo inizio velocita' costante (s) = C_C·T_C*")
    T_D_s: float = Field(description="Periodo inizio spostamento costante (s)")
    eta: float = Field(description="Fattore correzione smorzamento")
    damping_ratio: float = Field(default=DAMPING_RATIO_DEFAULT)


class ResponseSpectrumPoint(BaseModel):
    T_s: float
    S_e_over_g: float  # accelerazione spettrale / g


class SeismicLoadsResult(BaseModel):
    location: SeismicLoadsLocation
    historical_max_magnitude: float = Field(description="M_max storico nel raggio richiesto")
    search_radius_km: float
    search_years_back: int
    site_params: SeismicSiteParams
    spectrum: list[ResponseSpectrumPoint] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    gmpe_used: str = Field(default="simplified_italy_2018")


# ---- formule pure -------------------------------------------------------


def estimate_a_g_from_magnitude(
    magnitude: float,
    R_km: float = GMPE_R_DEFAULT_KM,
    c1: float = GMPE_C1,
    c2: float = GMPE_C2,
    c3: float = GMPE_C3,
    h_ref: float = GMPE_H_REF,
) -> float:
    """Stima a_g/g da magnitudo + distanza Joyner-Boore (Sabetta-Pugliese 1996).

    Formula (Bull. Seism. Soc. Am. vol. 86):
        log10(PGA/g) = c1 + c2·M + c3·log10(sqrt(R² + h²))

    con c1=-1.845, c2=0.363, c3=-1.0, h=5.0 km — taratura per Italia.

    Validazione attesa (per soil A, R=20 km):
        M=5.0 -> a_g/g ≈ 0.04 (~0.04 g)
        M=6.0 -> a_g/g ≈ 0.10
        M=6.5 -> a_g/g ≈ 0.16
        M=7.0 -> a_g/g ≈ 0.24

    Args:
        magnitude: Mw
        R_km: distanza Joyner-Boore (km), default 20
        c1, c2, c3, h_ref: coefficienti GMPE

    Returns:
        a_g/g (frazione di g, e.g. 0.15 = 0.15·g)

    Edge cases:
        - M <= 0       -> 0
        - R <= 0       -> usa min R=1 km per evitare singolarita'
        - clip output a [0, 1.5] per protezione bug fisica
    """
    if magnitude <= 0:
        return 0.0
    R_eff = max(1.0, float(R_km))
    R_total = math.sqrt(R_eff * R_eff + h_ref * h_ref)
    log_pga = c1 + c2 * magnitude + c3 * math.log10(R_total)
    a_g_g = float(10.0 ** log_pga)
    # Clip a valori fisicamente plausibili (0 < a_g/g <= 1.5)
    return max(0.0, min(1.5, a_g_g))


def compute_eta(damping_ratio: float = DAMPING_RATIO_DEFAULT) -> float:
    """Fattore correzione smorzamento.

    eta = sqrt(10 / (5 + ξ·100)), con ξ in [0.01, 0.50].
    Per ξ = 5% restituisce 1.0.

    Args:
        damping_ratio: fattore di smorzamento (decimale, e.g. 0.05 = 5%)
    """
    xi_pct = max(1.0, min(50.0, damping_ratio * 100.0))
    return math.sqrt(10.0 / (5.0 + xi_pct))


def compute_site_params(
    a_g_over_g: float,
    F_0: float = F_0_DEFAULT,
    T_c_star_s: float = T_C_STAR_DEFAULT,
    soil_category: SoilCategory = "A",
    damping_ratio: float = DAMPING_RATIO_DEFAULT,
) -> SeismicSiteParams:
    """Computa parametri spettrali per il sito.

    NTC 2018 §3.2.3.2:
        T_B = T_C / 3
        T_C = C_C · T_C*
        T_D = 4 · (a_g/g) + 1.6
        S   = S_S · S_T  (S_T = 1 per topografia piana)
    """
    if soil_category not in SOIL_S:
        raise ValueError(
            f"soil_category {soil_category!r} non supportato: "
            f"{sorted(SOIL_S.keys())}"
        )
    S_S = SOIL_S[soil_category]
    C_C = SOIL_C_C[soil_category]
    S = S_S  # S_T = 1 (topografia piana, NTC 2018 Tab. 3.2.III default)
    eta = compute_eta(damping_ratio)

    T_C = C_C * T_c_star_s
    T_B = T_C / 3.0
    T_D = 4.0 * a_g_over_g + 1.6

    return SeismicSiteParams(
        a_g_over_g=a_g_over_g,
        F_0=F_0,
        T_c_star_s=T_c_star_s,
        soil_category=soil_category,
        S=S,
        C_C=C_C,
        T_B_s=T_B,
        T_C_s=T_C,
        T_D_s=T_D,
        eta=eta,
        damping_ratio=damping_ratio,
    )


def compute_response_spectrum(
    params: SeismicSiteParams,
    n_points: int = SPECTRUM_N_POINTS_DEFAULT,
    t_max_s: float = SPECTRUM_T_MAX_S_DEFAULT,
) -> list[ResponseSpectrumPoint]:
    """Costruisce lo spettro di risposta elastico (componente orizzontale).

    NTC 2018 §3.2.3.2.1, formule (3.2.4):
        0 ≤ T < T_B:    S_e = a_g·S·η·F_0·[T/T_B + (1 - T/T_B)·(1/η/F_0)]    (form. semplificata)
                       (forma canonica: a_g·S·[1 + T/T_B·(η·F_0 - 1)])
        T_B ≤ T < T_C:  S_e = a_g·S·η·F_0
        T_C ≤ T < T_D:  S_e = a_g·S·η·F_0·(T_C/T)
        T ≥ T_D:        S_e = a_g·S·η·F_0·(T_C·T_D/T²)

    Args:
        params: parametri del sito
        n_points: numero di punti dello spettro
        t_max_s: periodo massimo (s)

    Returns:
        Lista di ResponseSpectrumPoint(T_s, S_e_over_g) ordinata.
    """
    if n_points < 2:
        raise ValueError(f"n_points deve essere >= 2, ricevuto {n_points}")
    if t_max_s <= 0:
        raise ValueError(f"t_max_s deve essere > 0, ricevuto {t_max_s}")

    a_g = params.a_g_over_g
    S = params.S
    eta = params.eta
    F_0 = params.F_0
    T_B = params.T_B_s
    T_C = params.T_C_s
    T_D = params.T_D_s

    plateau = a_g * S * eta * F_0
    points: list[ResponseSpectrumPoint] = []
    dt = t_max_s / (n_points - 1)
    for i in range(n_points):
        T = i * dt
        if T < T_B:
            # Formulazione canonica NTC 2018 (3.2.4)
            if T_B > 0:
                ratio = T / T_B
            else:
                ratio = 0.0
            S_e = a_g * S * (1.0 + ratio * (eta * F_0 - 1.0))
        elif T < T_C:
            S_e = plateau
        elif T < T_D:
            S_e = plateau * (T_C / T) if T > 0 else plateau
        else:
            S_e = plateau * (T_C * T_D / (T * T)) if T > 0 else plateau
        points.append(ResponseSpectrumPoint(T_s=round(T, 4), S_e_over_g=round(S_e, 6)))
    return points


# ---- Service ------------------------------------------------------------


class SeismicLoadsService:
    """Facade design loads sismici (NTC 2018 / EC8 simplified)."""

    def __init__(self, orchestrator: ServiceOrchestrator | None = None) -> None:
        self.orchestrator = (
            orchestrator if orchestrator is not None else default_orchestrator
        )

    async def compute(
        self,
        lat: float,
        lon: float,
        elevation_m: float | None = None,
        max_radius_km: float = 100.0,
        years_back: int = 100,
        soil_category: SoilCategory = "A",
        F_0: float = F_0_DEFAULT,
        T_c_star_s: float = T_C_STAR_DEFAULT,
        damping_ratio: float = DAMPING_RATIO_DEFAULT,
        gmpe_R_km: float = GMPE_R_DEFAULT_KM,
        spectrum_n_points: int = SPECTRUM_N_POINTS_DEFAULT,
        spectrum_t_max_s: float = SPECTRUM_T_MAX_S_DEFAULT,
    ) -> SeismicLoadsResult:
        """Calcola design seismic loads per la location.

        Args:
            lat, lon: coordinate WGS84
            elevation_m: opzionale, recuperato da provider elevation se None
            max_radius_km: raggio ricerca catalogo USGS (default 100 km)
            years_back: finestra storica (default 100 anni)
            soil_category: A/B/C/D/E (NTC 2018 Tab. 3.2.II)
            F_0, T_c_star_s: override parametri NTC (default 2.5, 0.35 s)
            damping_ratio: smorzamento (default 5%)
            gmpe_R_km: distanza ipocentrale assunta GMPE (default 20 km)
            spectrum_n_points: punti dello spettro (default 100)
            spectrum_t_max_s: periodo massimo spettro (default 4 s)

        Raises:
            ProviderUnavailableError: nessun provider seismic
            ProviderError: errore upstream non-recoverable
            ValueError: parametri invalidi
        """
        if not (0.0 < max_radius_km <= 10000.0):
            raise ValueError(f"max_radius_km deve essere in (0, 10000], got {max_radius_km}")
        if not (1 <= years_back <= 200):
            raise ValueError(f"years_back deve essere in [1, 200], got {years_back}")

        notes: list[str] = []

        # 1. M_max storico via orchestrator (chain "seismic")
        try:
            m_max = await self.orchestrator.call(
                "seismic", "historical_max_magnitude",
                lat=lat, lon=lon,
                max_radius_km=max_radius_km, years_back=years_back,
            )
        except KeyError as exc:
            raise ProviderUnavailableError(
                "no seismic providers registered — call register_all() at boot",
                provider="seismic_loads_service",
            ) from exc

        m_max = float(m_max)
        if m_max == 0.0:
            notes.append(
                f"no historical earthquakes within {max_radius_km:.0f} km in "
                f"{years_back} years — using minimum design a_g (M=4.5 baseline)"
            )
            m_max = 4.5  # baseline minimo NTC 2018 zona 4

        # 2. Elevation lookup (opzionale)
        elevation_source: str | None = None
        if elevation_m is None:
            try:
                ele = await self.orchestrator.call(
                    "elevation", "lookup", lat=lat, lon=lon,
                )
                elevation_m = float(ele.elevation_m)
                elevation_source = str(ele.source)
            except KeyError:
                notes.append("elevation domain not registered, defaulting to None")
                elevation_m = None
            except (ProviderUnavailableError, ProviderError) as exc:
                notes.append(f"elevation lookup failed: {exc}")
                elevation_m = None

        # 3. GMPE: stima a_g/g
        a_g = estimate_a_g_from_magnitude(magnitude=m_max, R_km=gmpe_R_km)

        # 4. Site params + spectrum
        site_params = compute_site_params(
            a_g_over_g=a_g,
            F_0=F_0,
            T_c_star_s=T_c_star_s,
            soil_category=soil_category,
            damping_ratio=damping_ratio,
        )
        spectrum = compute_response_spectrum(
            params=site_params,
            n_points=spectrum_n_points,
            t_max_s=spectrum_t_max_s,
        )

        # 5. Note operative
        notes.append(
            "v1.3 estimate — for design use NTC 2018 official site spectrum table "
            "(reticolo 10751 punti). Output here is preliminary / educational."
        )

        location = SeismicLoadsLocation(
            lat=lat, lon=lon,
            elevation_m=elevation_m,
            elevation_source=elevation_source,
        )

        return SeismicLoadsResult(
            location=location,
            historical_max_magnitude=round(m_max, 2),
            search_radius_km=max_radius_km,
            search_years_back=years_back,
            site_params=site_params,
            spectrum=spectrum,
            notes=notes,
            gmpe_used="simplified_italy_2018",
        )


# ---- Singleton ----------------------------------------------------------

service = SeismicLoadsService()
