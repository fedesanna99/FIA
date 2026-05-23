"""Endpoint API per verifiche normative (EC3 acciaio).

Endpoint:
    POST /api/verify/ec3/{model_id}    — esegue verifica EC3 su tutti i beam
"""
from __future__ import annotations
import math
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from schemas import (
    FEAModel, ElementType, Material, Section,
    MATERIALS_DB, SECTIONS_DB,
)
from schemas.results import StaticResults
from core.solver import StaticSolver
import storage
from core.verification.ec3 import (
    classify_from_section, SectionClass,
    N_t_Rd, N_c_Rd, M_c_Rd, V_c_Rd,
    shear_area_I_profile,
    N_b_Rd, M_b_Rd, M_cr_simply_supported_uniform,
    combined_NMV,
    serviceability_check,
    GAMMA_M0_NTC, GAMMA_M1_NTC,
)


router = APIRouter()


class EC3VerifyRequest(BaseModel):
    gamma_M0: float = Field(default=GAMMA_M0_NTC, gt=0)
    gamma_M1: float = Field(default=GAMMA_M1_NTC, gt=0)
    serviceability_category: Optional[str] = Field(
        default=None,
        description="Se specificato, esegue anche verifica SLE (frecce)."
    )


class ElementVerification(BaseModel):
    element_id: int
    section_id: str
    material_id: str
    L: float                # lunghezza elemento [m]
    section_class: Optional[int] = None
    N_Ed: float             # forza assiale massima [N] (positivo trazione)
    M_Ed: float             # momento massimo [N·m]
    V_Ed: float             # taglio massimo [N]
    N_Rd: Optional[float] = None
    M_c_Rd: Optional[float] = None
    V_c_Rd: Optional[float] = None
    N_b_Rd: Optional[float] = None
    M_b_Rd: Optional[float] = None
    UR_resistance: float = 0.0
    UR_buckling: Optional[float] = None
    UR_LTB: Optional[float] = None
    UR_serviceability: Optional[float] = None
    UR_max: float = 0.0
    governing: str = ""
    status: str = "OK"      # "OK" | "FAIL"
    notes: str = ""


class EC3VerifyResponse(BaseModel):
    model_id: str
    n_elements_checked: int
    n_failures: int
    results: list[ElementVerification]


def _max_abs_force(f) -> tuple[float, float, float]:
    """Estrae |N|, |M|, |V| massimi sull'elemento (estremi i e j).

    M = max(|Mz|) per beam2D, max(|My|, |Mz|) per beam3D.
    V = max(|Vy|, |Vz|).
    """
    N = max(abs(f.N_i), abs(f.N_j))
    M = max(abs(f.Mz_i), abs(f.Mz_j), abs(f.My_i), abs(f.My_j))
    V = max(abs(f.Vy_i), abs(f.Vy_j), abs(f.Vz_i), abs(f.Vz_j))
    return N, M, V


def _element_length(model: FEAModel, element_id: int) -> float:
    el = next((e for e in model.elements if e.id == element_id), None)
    if el is None:
        return 0.0
    nodes_by_id = {n.id: n for n in model.nodes}
    n1 = nodes_by_id.get(el.nodes[0])
    n2 = nodes_by_id.get(el.nodes[1])
    if n1 is None or n2 is None:
        return 0.0
    return math.sqrt(
        (n2.x - n1.x) ** 2 + (n2.y - n1.y) ** 2 + (n2.z - n1.z) ** 2
    )


def _is_steel(material_id: str) -> bool:
    return material_id.lower().startswith("steel_")


def _verify_one_beam(
    model: FEAModel, el, mat: Material, sec: Section,
    forces, gamma_M0: float, gamma_M1: float,
    delta_max: Optional[float] = None,
    serviceability_category: Optional[str] = None,
) -> ElementVerification:
    L = _element_length(model, el.id)
    fy = mat.fy or 0.0
    if fy <= 0:
        return ElementVerification(
            element_id=el.id, section_id=sec.id, material_id=mat.id, L=L,
            N_Ed=0, M_Ed=0, V_Ed=0,
            status="FAIL", notes="Materiale senza f_y definito",
        )

    cls = classify_from_section(sec, fy_MPa=fy / 1e6, loading="combined")
    section_class = cls.section_class if cls else SectionClass.CLASS_3
    N_Ed, M_Ed, V_Ed = _max_abs_force(forces)

    # Resistenze di sezione
    is_compression = (
        max(forces.N_i, forces.N_j, key=abs) < 0
    )  # convenzione: compressione = N negativa
    N_res = (
        N_c_Rd(A=sec.A, fy=fy, section_class=section_class, gamma_M0=gamma_M0)
        if is_compression
        else N_t_Rd(A=sec.A, fy=fy, gamma_M0=gamma_M0)
    )
    Mc_res = M_c_Rd(
        Wpl=sec.Wply, Wel=sec.Wely, fy=fy,
        section_class=section_class, gamma_M0=gamma_M0,
    )
    if sec.tf and sec.tw and sec.b and sec.r is not None:
        Av = shear_area_I_profile(A=sec.A, b=sec.b, tf=sec.tf, tw=sec.tw, r=sec.r)
    else:
        Av = sec.A  # fallback conservativo
    Vc_res = V_c_Rd(A_v=Av, fy=fy, gamma_M0=gamma_M0)

    # Verifica combinata N+M+V
    comb = combined_NMV(
        N_Ed=N_Ed, M_Ed=M_Ed, V_Ed=V_Ed,
        N_Rd=N_res.value, M_Rd=Mc_res.value, V_Rd=Vc_res.value,
        section_class=section_class,
        A=sec.A, b=sec.b or 0.0, tf=sec.tf or 0.0,
    )
    UR_res = comb.UR

    # Instabilità flessionale (se compressione e profilo I valido)
    UR_buck = None
    Nb_value = None
    if is_compression and sec.type == "I_profile" and sec.h and sec.b and sec.tf:
        try:
            # uso L come L_cr (cerniera-cerniera). Una migliore stima richiede
            # gli effective length factors per ogni asse.
            buck = N_b_Rd(
                A=sec.A, I=sec.Iz, fy=fy, E=mat.E, L_cr=L,
                section_class=section_class,
                h=sec.h, b=sec.b, tf=sec.tf, axis="z",
                gamma_M1=gamma_M1,
            )
            Nb_value = buck.N_b_Rd
            # v2.3.2 fix CI: JSON spec non supporta Infinity. Quando la
            # resistenza è 0 (sezione collassata o input degenere) usiamo
            # un sentinel grande (1e6) che è semanticamente equivalente
            # a "UR molto >> 1, FAIL totale" ma JSON-safe.
            UR_buck = N_Ed / Nb_value if Nb_value > 0 else 1e6
        except Exception:
            UR_buck = None

    # LTB (se flessione + profilo I + Iw noto)
    UR_LTB = None
    Mb_value = None
    if M_Ed > 0 and sec.type == "I_profile" and sec.Iw and sec.J and sec.h and sec.b:
        try:
            G = mat.G
            M_cr = M_cr_simply_supported_uniform(
                E=mat.E, G=G, Iz=sec.Iz, It=sec.J, Iw=sec.Iw, L=L,
            )
            ltb = M_b_Rd(
                Wy=sec.Wply if section_class in (SectionClass.CLASS_1, SectionClass.CLASS_2) else sec.Wely,
                fy=fy, M_cr=M_cr, h=sec.h, b=sec.b, gamma_M1=gamma_M1,
            )
            Mb_value = ltb.M_b_Rd
            # v2.3.2 fix CI: idem caso buckling, sentinel 1e6 invece di inf.
            UR_LTB = M_Ed / Mb_value if Mb_value > 0 else 1e6
        except Exception:
            UR_LTB = None

    # SLE (se richiesto)
    UR_sle = None
    if serviceability_category and delta_max is not None:
        try:
            sle = serviceability_check(
                delta_max=delta_max, L=L, category=serviceability_category,
            )
            UR_sle = sle.UR
        except Exception:
            UR_sle = None

    # U.R. complessivo
    URs = [UR_res]
    if UR_buck is not None: URs.append(UR_buck)
    if UR_LTB is not None: URs.append(UR_LTB)
    if UR_sle is not None: URs.append(UR_sle)
    UR_max = max(URs)
    governing = "resistance"
    if UR_buck is not None and UR_buck == UR_max:
        governing = "buckling"
    elif UR_LTB is not None and UR_LTB == UR_max:
        governing = "LTB"
    elif UR_sle is not None and UR_sle == UR_max:
        governing = "serviceability"

    return ElementVerification(
        element_id=el.id, section_id=sec.id, material_id=mat.id, L=L,
        section_class=int(section_class),
        N_Ed=N_Ed, M_Ed=M_Ed, V_Ed=V_Ed,
        N_Rd=N_res.value, M_c_Rd=Mc_res.value, V_c_Rd=Vc_res.value,
        N_b_Rd=Nb_value, M_b_Rd=Mb_value,
        UR_resistance=UR_res,
        UR_buckling=UR_buck, UR_LTB=UR_LTB,
        UR_serviceability=UR_sle,
        UR_max=UR_max, governing=governing,
        status="OK" if UR_max <= 1.0 else "FAIL",
        notes=f"class C{int(section_class)}",
    )


@router.post("/ec3/{model_id}", response_model=EC3VerifyResponse)
def verify_ec3(model_id: str, req: EC3VerifyRequest = EC3VerifyRequest()):
    """Esegue la verifica EC3 su tutti gli elementi beam in acciaio del modello.

    Richiede risultati statici già calcolati (`POST /api/analysis/static/{id}`).
    """
    model = storage.get_model(model_id)
    if model is None:
        raise HTTPException(404, f"Modello {model_id} non trovato")

    static: Optional[StaticResults] = storage.get_results(model_id, "static")
    if static is None:
        # Auto-esegui statica
        try:
            static = StaticSolver(model).solve()
            storage.save_results(model_id, "static", static)
        except Exception as e:
            raise HTTPException(500, f"Errore esecuzione statica: {e}")

    forces_by_id = {f.element_id: f for f in static.element_forces}
    results: list[ElementVerification] = []
    for el in model.elements:
        if el.type not in (ElementType.BEAM2D, ElementType.BEAM3D):
            continue
        mat = MATERIALS_DB.get(el.material_id)
        if mat is None or not _is_steel(el.material_id):
            continue
        sec = SECTIONS_DB.get(el.section_id) if el.section_id else None
        if sec is None or sec.type != "I_profile":
            continue
        f = forces_by_id.get(el.id)
        if f is None:
            continue
        results.append(_verify_one_beam(
            model=model, el=el, mat=mat, sec=sec,
            forces=f, gamma_M0=req.gamma_M0, gamma_M1=req.gamma_M1,
            serviceability_category=req.serviceability_category,
        ))

    n_failures = sum(1 for r in results if r.status == "FAIL")
    return EC3VerifyResponse(
        model_id=model_id, n_elements_checked=len(results),
        n_failures=n_failures, results=results,
    )
