"""Endpoint API per verifiche EC2 / EC5 / EC8 / NTC — M5.

Espone via REST gli helper di `core/verification/{ec2,ec5,ec8}` e
`core/combinations/ntc2018`. A differenza di EC3 (che itera sul modello),
questi endpoint sono "form-driven": l'utente passa parametri (sezione CA,
classe timber, periodo, lista azioni…) e ottiene il calcolo.
"""
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.verification.ec2 import (
    M_Rd_rectangular, minimum_reinforcement,
)
from core.verification.ec2.bending import f_ctm
from core.verification.ec2.shear import shear_check
from core.verification.ec5 import (
    get_timber_class,
    f_t_0_d, f_c_0_d, f_m_d, f_v_d,
    ServiceClass, LoadDuration,
)
from core.verification.ec8 import (
    elastic_spectrum, design_spectrum, ground_parameters,
    q_factor,
    seismic_combination, EA_combination,
    SpectrumType, GroundType, BehaviorClass, StructuralSystem,
)
from core.combinations.ntc2018 import (
    Action, Combination, CombinationType, enumerate_combinations,
)


router = APIRouter()


# ============================================================================
# EC2 — Cemento armato (bending, shear)
# ============================================================================

class EC2BendingRequest(BaseModel):
    """Sezione rettangolare CA — flessione semplice (singola armatura)."""
    b: float = Field(..., gt=0, description="Larghezza sezione [m]")
    d: float = Field(..., gt=0, description="Altezza utile [m]")
    A_s: float = Field(..., gt=0, description="Area armatura tesa [m²]")
    fck: float = Field(..., gt=0, description="f_ck cls [Pa]")
    fyk: float = Field(default=450e6, gt=0, description="f_yk acciaio [Pa]")
    M_Ed: float = Field(default=0.0, ge=0, description="Momento sollecitante [Nm] (per UR)")


@router.post("/ec2/bending")
def ec2_bending(req: EC2BendingRequest):
    try:
        res = M_Rd_rectangular(
            b=req.b, d=req.d, A_s=req.A_s, fck=req.fck, fyk=req.fyk,
        )
        As_min = minimum_reinforcement(b=req.b, d=req.d, fck=req.fck, fyk=req.fyk)
    except ValueError as e:
        raise HTTPException(400, str(e))
    UR = req.M_Ed / res.M_Rd if res.M_Rd > 0 else 0.0
    return {
        "M_Rd": res.M_Rd,
        "x": res.x,
        "z": res.z,
        "x_over_d": res.x_over_d,
        "is_ductile": res.is_ductile,
        "f_cd": res.f_cd,
        "f_yd": res.f_yd,
        "A_s": res.A_s,
        "A_s_min": As_min,
        "A_s_ok": req.A_s >= As_min,
        "M_Ed": req.M_Ed,
        "UR": UR,
        "status": "OK" if UR <= 1.0 else "FAIL",
        "notes": res.notes,
    }


class EC2ShearRequest(BaseModel):
    b_w: float = Field(..., gt=0)
    d: float = Field(..., gt=0)
    A_sl: float = Field(..., gt=0, description="Area armatura long. tesa [m²]")
    fck: float = Field(..., gt=0)
    A_sw: float = Field(default=0.0, ge=0, description="Area staffa singola sez. [m²]")
    s: float = Field(default=0.2, gt=0, description="Passo staffe [m]")
    fywk: float = Field(default=450e6, gt=0)
    cot_theta: float = Field(default=2.5, ge=1.0, le=2.5)
    sigma_cp: float = Field(default=0.0, description="σ compressione media [Pa]")
    V_Ed: float = Field(default=0.0, ge=0, description="Taglio sollecitante [N]")


@router.post("/ec2/shear")
def ec2_shear(req: EC2ShearRequest):
    try:
        res = shear_check(
            b_w=req.b_w, d=req.d, A_sl=req.A_sl, fck=req.fck,
            A_sw=req.A_sw, s=req.s, fywk=req.fywk,
            cot_theta=req.cot_theta, sigma_cp=req.sigma_cp,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    UR = req.V_Ed / res.V_Rd if res.V_Rd > 0 else 0.0
    return {
        "V_Rd": res.V_Rd,
        "V_Rd_c": res.V_Rd_c,
        "V_Rd_s": res.V_Rd_s,
        "V_Rd_max": res.V_Rd_max,
        "needs_stirrups": res.needs_stirrups,
        "V_Ed": req.V_Ed,
        "UR": UR,
        "status": "OK" if UR <= 1.0 else "FAIL",
        "notes": res.notes,
    }


# ============================================================================
# EC5 — Legno (resistance)
# ============================================================================

class EC5TimberRequest(BaseModel):
    timber_class: str = Field(..., description="C24 / C30 / GL24h / GL28h")
    service_class: int = Field(..., ge=1, le=3,
                                description="Classe di servizio 1/2/3 (UNI EN 1995-1-1)")
    load_duration: str = Field(...,
                                description="permanent / long-term / medium-term / short-term / instantaneous")
    sigma_t_0_Ed: float = Field(default=0.0, ge=0, description="σ trazione parallela [Pa]")
    sigma_c_0_Ed: float = Field(default=0.0, ge=0, description="σ compressione parallela [Pa]")
    sigma_m_Ed: float = Field(default=0.0, ge=0, description="σ flessione [Pa]")
    tau_v_Ed: float = Field(default=0.0, ge=0, description="τ taglio [Pa]")


_LOAD_DURATION_MAP: dict[str, LoadDuration] = {
    "permanent": "permanent",
    "long-term": "long-term",
    "medium-term": "medium-term",
    "short-term": "short-term",
    "instantaneous": "instantaneous",
}


@router.post("/ec5/timber")
def ec5_timber(req: EC5TimberRequest):
    try:
        tc = get_timber_class(req.timber_class)
    except ValueError as e:
        raise HTTPException(400, str(e))
    sc: ServiceClass = req.service_class  # type: ignore[assignment]
    ld = _LOAD_DURATION_MAP.get(req.load_duration)
    if ld is None:
        raise HTTPException(400, f"load_duration '{req.load_duration}' non riconosciuta. "
                                   f"Usa: {list(_LOAD_DURATION_MAP)}")
    ft = f_t_0_d(tc, sc, ld)
    fc = f_c_0_d(tc, sc, ld)
    fm = f_m_d(tc, sc, ld)
    fv = f_v_d(tc, sc, ld)

    ur_t = req.sigma_t_0_Ed / ft.value if ft.value > 0 else 0.0
    ur_c = req.sigma_c_0_Ed / fc.value if fc.value > 0 else 0.0
    ur_m = req.sigma_m_Ed   / fm.value if fm.value > 0 else 0.0
    ur_v = req.tau_v_Ed     / fv.value if fv.value > 0 else 0.0
    # combinata trazione/flessione (EC5 §6.2.3)
    ur_tm = ur_t + ur_m
    # combinata compr./flessione (semplificata, k_m=1.0)
    ur_cm = ur_c + ur_m
    UR_max = max(ur_t, ur_c, ur_m, ur_v, ur_tm, ur_cm)

    return {
        "timber_class": req.timber_class,
        "service_class": req.service_class,
        "load_duration": req.load_duration,
        "k_mod": ft.k_mod,
        "gamma_M": ft.gamma_M,
        "f_t_0_d": ft.value,
        "f_c_0_d": fc.value,
        "f_m_d":   fm.value,
        "f_v_d":   fv.value,
        "UR_t":  ur_t,
        "UR_c":  ur_c,
        "UR_m":  ur_m,
        "UR_v":  ur_v,
        "UR_tm": ur_tm,
        "UR_cm": ur_cm,
        "UR_max": UR_max,
        "status": "OK" if UR_max <= 1.0 else "FAIL",
    }


# ============================================================================
# EC8 — Sismica
# ============================================================================

class EC8SpectrumRequest(BaseModel):
    spectrum_type: str = Field(..., description="'1' o '2'")
    ground: str = Field(..., description="'A'/'B'/'C'/'D'/'E'")
    a_g: float = Field(..., gt=0, description="Accelerazione orizzontale di picco [m/s²]")
    xi_pct: float = Field(default=5.0, ge=0, le=50, description="Smorzamento [%]")
    T_min: float = Field(default=0.0, ge=0)
    T_max: float = Field(default=4.0, gt=0)
    n_points: int = Field(default=200, ge=10, le=2000)
    q: float | None = Field(default=None, gt=0,
                             description="Se valorizzato, calcola anche lo spettro di progetto.")
    beta: float = Field(default=0.20, gt=0, description="Coeff. limite inferiore design (3.16)")


@router.post("/ec8/spectrum")
def ec8_spectrum(req: EC8SpectrumRequest):
    if req.spectrum_type not in ("1", "2"):
        raise HTTPException(400, "spectrum_type deve essere '1' o '2'")
    if req.ground not in ("A", "B", "C", "D", "E"):
        raise HTTPException(400, "ground deve essere A/B/C/D/E")
    if req.T_min >= req.T_max:
        raise HTTPException(400, "T_min deve essere < T_max")

    sp: SpectrumType = req.spectrum_type  # type: ignore[assignment]
    g: GroundType = req.ground            # type: ignore[assignment]
    params = ground_parameters(sp, g)
    dT = (req.T_max - req.T_min) / (req.n_points - 1)
    T_list: list[float] = [req.T_min + i * dT for i in range(req.n_points)]
    Se_list: list[float] = []
    Sd_list: list[float] | None = [] if req.q is not None else None
    for T in T_list:
        Se_list.append(elastic_spectrum(T, req.a_g, sp, g, xi_pct=req.xi_pct))
        if Sd_list is not None:
            Sd_list.append(design_spectrum(T, req.a_g, sp, g, q=req.q, beta=req.beta))  # type: ignore[arg-type]

    return {
        "T": T_list,
        "Se": Se_list,
        "Sd": Sd_list,
        "params": {
            "S": params.S, "T_B": params.T_B, "T_C": params.T_C, "T_D": params.T_D,
        },
        "a_g": req.a_g,
        "spectrum_type": req.spectrum_type,
        "ground": req.ground,
        "xi_pct": req.xi_pct,
        "q": req.q,
    }


class EC8QFactorRequest(BaseModel):
    system: str = Field(..., description="frame_concrete/wall_concrete/frame_steel/...")
    ductility_class: str = Field(..., description="DCL/DCM/DCH")
    alpha_u_over_alpha_1: float = Field(default=1.3, ge=1.0, le=1.5)
    k_w: float = Field(default=1.0, gt=0, le=1.0)


@router.post("/ec8/q_factor")
def ec8_q_factor(req: EC8QFactorRequest):
    try:
        q = q_factor(
            system=req.system,  # type: ignore[arg-type]
            ductility_class=req.ductility_class,  # type: ignore[arg-type]
            alpha_u_over_alpha_1=req.alpha_u_over_alpha_1,
            k_w=req.k_w,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "q": q,
        "system": req.system,
        "ductility_class": req.ductility_class,
        "alpha_u_over_alpha_1": req.alpha_u_over_alpha_1,
        "k_w": req.k_w,
    }


# ============================================================================
# NTC 2018 — Combinazioni
# ============================================================================

class ActionDTO(BaseModel):
    name: str
    type: str = Field(..., description="G1/G2/P/Q/E/A")
    value: float
    category: Optional[str] = Field(default=None,
                                      description="Categoria per Q (A_residential, B_office, ...)")


class CombinationsRequest(BaseModel):
    actions: list[ActionDTO]
    combination_type: str = Field(
        ...,
        description="SLU_fundamental / SLE_characteristic / SLE_frequent / "
                    "SLE_quasi_permanent / SLU_seismic / SLU_accidental",
    )


@router.post("/ntc/combinations")
def ntc_combinations(req: CombinationsRequest):
    """Enumera tutte le combinazioni NTC 2018 per il tipo richiesto.

    Per SLU/SLE caratt./freq./acc.: enumera 1 combinazione per ciascuna Q
    designata principale. Per SLE quasi_perm. e SLU_seismic: 1 combinazione.
    """
    try:
        actions = [
            Action(name=a.name, type=a.type, value=a.value, category=a.category)  # type: ignore[arg-type]
            for a in req.actions
        ]
        combs = enumerate_combinations(actions, req.combination_type)  # type: ignore[arg-type]
    except ValueError as e:
        raise HTTPException(400, str(e))

    # envelope max sul valore totale fra tutte le combinazioni
    values = [c.value for c in combs]
    env_max = max(values) if values else 0.0
    env_min = min(values) if values else 0.0

    return {
        "combination_type": req.combination_type,
        "n_combinations": len(combs),
        "combinations": [
            {"name": c.name, "type": c.type, "factors": c.factors, "value": c.value}
            for c in combs
        ],
        "envelope": {"max": env_max, "min": env_min},
        "actions_summary": [
            {"name": a.name, "type": a.type, "value": a.value, "category": a.category}
            for a in actions
        ],
    }
