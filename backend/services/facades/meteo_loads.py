"""MeteoLoadsService — facade per design loads vento + neve (Sprint 2 — B4).

Dato lat/lon (+ opzionalmente quota), calcola:
    - velocita' base vento 50y v_b,0 (EN 1991-1-4 §4.2)
    - pressione cinetica di base q_b e di picco q_p(z=10m, terreno II)
    - carico neve al suolo s_k stimato (EN 1991-1-3) + s_design tetto piano

Pipeline:
    1. Estrai massimi storici 50y via orchestrator F8 (dominio "meteo")
       -> wind_gust_50y_ms + snowfall_50y_cm
    2. Estrai elevazione via orchestrator F8 (dominio "elevation") se
       non passata dall'utente
    3. Applica formule EN 1991 semplificate
    4. Output: MeteoLoadsResult strutturato

ASSUNZIONI semplificative (v1.3):
    - categoria di terreno II (EN 1991-1-4 Tab. 4.1) come default
    - c_dir = c_season = 1.0 (no correzione direzionale/stagionale)
    - z_riferimento = 10 m (default EN 1991)
    - gust factor 3s -> 10min mean = 1.4 (Davenport, EN 1991-1-4 §B.1)
    - densita' aria ρ = 1.25 kg/m³
    - densita' neve assestata ρ_s = 200 kg/m³ (assestamento parziale,
      conservative vs neve fresca 100)
    - μ_i = 0.8 (tetto piano EN 1991-1-3 Tab. 5.2)
    - C_e = C_t = 1.0 (esposizione/termico normale)

Per upgrade futuro:
    - integrare zone NTC 2018 (cf NTC §3.3.2 per vento, §3.4.2 per neve)
    - tabelle altitudine-dipendente per s_k Alpine/Mediterraneo
    - factor c_e(z) realistico per altezze z != 10m
"""
from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel, Field

from ..orchestrator import ServiceOrchestrator, orchestrator as default_orchestrator
from ..providers.meteo.errors import ProviderError, ProviderUnavailableError


logger = logging.getLogger(__name__)


# ---- Costanti EN 1991-1-4 / 1-3 ------------------------------------------

AIR_DENSITY_KG_M3 = 1.25                # ρ aria EN 1991-1-4 §4.5
GUST_FACTOR = 1.4                       # 3s gust → 10min mean Davenport
TERRAIN_II_C_E_10M = 1.7                # c_e(z=10m, II) EN 1991-1-4 Tab. 4.2
SNOW_DENSITY_KG_M3 = 200.0              # neve assestata
SNOW_MU_I_FLAT_ROOF = 0.8               # EN 1991-1-3 Tab. 5.2
SNOW_C_E = 1.0                          # esposizione normale
SNOW_C_T = 1.0                          # termico normale
G_M_S2 = 9.81                           # accelerazione gravita'


# ---- DTO ----------------------------------------------------------------


class MeteoLoadsLocation(BaseModel):
    lat: float
    lon: float
    elevation_m: float | None = None
    elevation_source: str | None = None  # provider che ha fornito elevazione


class WindLoads(BaseModel):
    """Vento — EN 1991-1-4."""

    v_b0_ms: float = Field(description="Velocita' base 50y (m/s, 10min mean a 10m)")
    gust_max_observed_ms: float = Field(description="Raffica massima storica osservata (m/s)")
    q_b_kN_m2: float = Field(description="Pressione cinetica di base 0.5·ρ·v_b² [kN/m²]")
    q_p_z10_kN_m2: float = Field(description="Pressione cinetica di picco a z=10m, terreno II [kN/m²]")
    c_e_z10: float = Field(description="Coefficiente esposizione c_e(z=10m, terreno II)")
    terrain_category: str = Field(default="II")
    gust_factor: float = Field(default=GUST_FACTOR)
    air_density_kg_m3: float = Field(default=AIR_DENSITY_KG_M3)
    source_provider: str = Field(default="open_meteo_archive")


class SnowLoads(BaseModel):
    """Neve — EN 1991-1-3."""

    s_k_kN_m2: float = Field(description="Carico neve al suolo caratteristico [kN/m²]")
    snowfall_max_observed_cm: float = Field(description="Massima nevicata storica osservata (cm/giorno)")
    snow_density_kg_m3: float = Field(default=SNOW_DENSITY_KG_M3)
    mu_i_default: float = Field(default=SNOW_MU_I_FLAT_ROOF, description="μ_i tetto piano")
    c_e: float = Field(default=SNOW_C_E)
    c_t: float = Field(default=SNOW_C_T)
    s_design_kN_m2: float = Field(
        description="Carico neve di calcolo s = μ_i·C_e·C_t·s_k [kN/m²]"
    )
    source_provider: str = Field(default="open_meteo_archive")


class MeteoLoadsResult(BaseModel):
    location: MeteoLoadsLocation
    wind: WindLoads
    snow: SnowLoads
    years_used: int = Field(description="Anni di reanalysis usati per gli estremi")
    notes: list[str] = Field(default_factory=list)


# ---- formule (funzioni pure, testabili separatamente) -------------------


def compute_v_b0_from_gust(
    gust_max_ms: float,
    gust_factor: float = GUST_FACTOR,
) -> float:
    """v_b0 (10min mean) ≈ gust / gust_factor.

    Args:
        gust_max_ms: raffica massima (3s gust) a 10 m, m/s
        gust_factor: 1.4 default (Davenport, EN 1991-1-4 §B.1)
    """
    if gust_factor <= 0:
        raise ValueError(f"gust_factor deve essere > 0, ricevuto {gust_factor}")
    return max(0.0, gust_max_ms) / gust_factor


def compute_q_b(v_b0_ms: float, air_density_kg_m3: float = AIR_DENSITY_KG_M3) -> float:
    """Pressione cinetica di base: q_b = 0.5·ρ·v_b² in kN/m²."""
    v = max(0.0, v_b0_ms)
    q_b_pa = 0.5 * air_density_kg_m3 * v * v
    return q_b_pa / 1000.0  # Pa → kN/m²


def compute_q_p_z10(
    q_b_kN_m2: float,
    c_e: float = TERRAIN_II_C_E_10M,
) -> float:
    """Pressione cinetica di picco a z=10m: q_p = c_e · q_b."""
    return c_e * q_b_kN_m2


def compute_s_k_from_snowfall(
    snowfall_max_cm: float,
    snow_density_kg_m3: float = SNOW_DENSITY_KG_M3,
) -> float:
    """Stima s_k da snowfall: s = ρ·g·h con h in m, output kN/m².

    NOTA: la nevicata daily massima e' un proxy per il carico al suolo.
    Per stime piu' precise serve la profondita' di neve al suolo cumulata
    (NTC 2018 e' tabellato per zona+altitudine indipendentemente).
    """
    h_m = max(0.0, snowfall_max_cm) / 100.0
    s_pa = snow_density_kg_m3 * G_M_S2 * h_m
    return s_pa / 1000.0


def compute_s_design(
    s_k_kN_m2: float,
    mu_i: float = SNOW_MU_I_FLAT_ROOF,
    c_e: float = SNOW_C_E,
    c_t: float = SNOW_C_T,
) -> float:
    """s = μ_i · C_e · C_t · s_k (EN 1991-1-3 §5.2)."""
    return mu_i * c_e * c_t * s_k_kN_m2


# ---- Service ------------------------------------------------------------


class MeteoLoadsService:
    """Facade design loads vento + neve."""

    def __init__(
        self,
        orchestrator: ServiceOrchestrator | None = None,
    ) -> None:
        self.orchestrator = (
            orchestrator if orchestrator is not None else default_orchestrator
        )

    async def compute(
        self,
        lat: float,
        lon: float,
        elevation_m: float | None = None,
        years: int = 80,
        terrain_category: str = "II",
    ) -> MeteoLoadsResult:
        """Calcola design loads per la location.

        Args:
            lat, lon: coordinate WGS84
            elevation_m: se None viene letta dal provider elevation
            years: anni di reanalysis (default 80, max 85 per ERA5)
            terrain_category: "II" supportato (default EN 1991-1-4)

        Raises:
            ProviderError / ProviderUnavailableError: se il dominio meteo
              non e' raggiungibile o non ha provider registrati.
        """
        if terrain_category != "II":
            raise NotImplementedError(
                f"terrain_category={terrain_category!r} non ancora supportato "
                "in v1.3 (solo 'II')"
            )

        notes: list[str] = []

        # 1. Extreme meteo via orchestrator (chain "meteo")
        try:
            extremes = await self.orchestrator.call(
                "meteo", "historical_extremes",
                lat=lat, lon=lon, years=years,
            )
        except KeyError as exc:
            raise ProviderUnavailableError(
                "no meteo providers registered — call register_all() at boot",
                provider="meteo_loads_service",
            ) from exc

        # 2. Elevation lookup (opzionale, non bloccante)
        elevation_source: str | None = None
        if elevation_m is None:
            try:
                elev_point = await self.orchestrator.call(
                    "elevation", "lookup", lat=lat, lon=lon,
                )
                elevation_m = float(elev_point.elevation_m)
                elevation_source = str(elev_point.source)
            except KeyError:
                notes.append("elevation domain not registered, defaulting to None")
                elevation_m = None
            except (ProviderUnavailableError, ProviderError) as exc:
                notes.append(f"elevation lookup failed: {exc}")
                elevation_m = None

        # 3. Wind loads (EN 1991-1-4)
        gust_max = float(getattr(extremes, "wind_gust_max_ms", 0.0))
        gust_50y = float(getattr(extremes, "wind_gust_50y_ms", 0.0))
        v_b0 = compute_v_b0_from_gust(gust_50y, gust_factor=GUST_FACTOR)
        q_b = compute_q_b(v_b0, air_density_kg_m3=AIR_DENSITY_KG_M3)
        q_p_10 = compute_q_p_z10(q_b, c_e=TERRAIN_II_C_E_10M)

        wind = WindLoads(
            v_b0_ms=round(v_b0, 2),
            gust_max_observed_ms=round(gust_max, 2),
            q_b_kN_m2=round(q_b, 4),
            q_p_z10_kN_m2=round(q_p_10, 4),
            c_e_z10=TERRAIN_II_C_E_10M,
            terrain_category=terrain_category,
            gust_factor=GUST_FACTOR,
            air_density_kg_m3=AIR_DENSITY_KG_M3,
            source_provider=str(getattr(extremes, "source", "open_meteo_archive")),
        )

        # 4. Snow loads (EN 1991-1-3)
        snow_max = float(getattr(extremes, "snowfall_max_cm", 0.0))
        snow_50y = float(getattr(extremes, "snowfall_50y_cm", 0.0))
        s_k = compute_s_k_from_snowfall(snow_50y, snow_density_kg_m3=SNOW_DENSITY_KG_M3)
        s_design = compute_s_design(s_k)

        snow = SnowLoads(
            s_k_kN_m2=round(s_k, 4),
            snowfall_max_observed_cm=round(snow_max, 2),
            snow_density_kg_m3=SNOW_DENSITY_KG_M3,
            mu_i_default=SNOW_MU_I_FLAT_ROOF,
            c_e=SNOW_C_E,
            c_t=SNOW_C_T,
            s_design_kN_m2=round(s_design, 4),
            source_provider=str(getattr(extremes, "source", "open_meteo_archive")),
        )

        # 5. Compose result
        location = MeteoLoadsLocation(
            lat=lat, lon=lon,
            elevation_m=elevation_m,
            elevation_source=elevation_source,
        )
        years_used = int(getattr(extremes, "years_used", years))

        return MeteoLoadsResult(
            location=location,
            wind=wind,
            snow=snow,
            years_used=years_used,
            notes=notes,
        )


# ---- Singleton ----------------------------------------------------------

service = MeteoLoadsService()
