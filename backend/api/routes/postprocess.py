"""Endpoint post-process avanzati — M4.

Espongono via REST i moduli `core/postprocess`:
    - drift                (FASE 12)
    - mode_superposition   (FASE 16)
    - convergence          (FASE 19)
    - zz_error             (FASE 19)
    - isolines (semplificato, su set di triangoli + valori nodali)
"""
from __future__ import annotations
from dataclasses import asdict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from schemas import FEAModel
from schemas.results import ModalResults
from core.postprocess import (
    interstory_drift_history, max_drift_per_storey, drift_ratio,
    superpose_modes, normalize_to_unit_max, amplify_for_animation,
    analyze_convergence,
    zz_error_estimate, relative_error,
    isoline_levels_tri3, auto_levels,
    isosurface_tets, isosurface_hex8, total_area, iso_auto_levels_3d,
)
import storage

router = APIRouter()


def _get_model(model_id: str) -> FEAModel:
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    return m


# ============================================================================
# Drift (FASE 12) — usa risultati dynamic / seismic_th
# ============================================================================

class DriftRequest(BaseModel):
    """Interstory drift su nodi-piano ordinati dal basso verso l'alto."""
    levels: list[int] = Field(..., min_length=2,
                              description="Lista node_id ordinata dal basso (base) verso l'alto.")
    axis: str = Field(default="ux", pattern="^(ux|uy|uz)$")
    h_storey: float | None = Field(default=None, gt=0,
                                     description="Altezza interpiano [m] per calcolare drift ratio.")
    analysis_type: str = Field(default="dynamic",
                                description="Tipo di analisi da cui leggere node_history (dynamic / seismic_th).")


@router.post("/{model_id}/drift")
def drift_endpoint(model_id: str, req: DriftRequest):
    dyn = storage.get_results(model_id, req.analysis_type)
    if dyn is None:
        raise HTTPException(404, f"Nessun risultato '{req.analysis_type}' per modello {model_id}.")
    node_history = getattr(dyn, "node_history", None)
    if node_history is None and isinstance(dyn, dict):
        node_history = dyn.get("node_history")
    if not node_history:
        raise HTTPException(400, "L'analisi non ha node_history salvata. "
                                   "Imposta save_every≥1 e includi i nodi di interesse.")
    try:
        history = interstory_drift_history(node_history, req.levels, axis=req.axis)
        max_drift = max_drift_per_storey(node_history, req.levels, axis=req.axis)
    except (ValueError, KeyError) as e:
        raise HTTPException(400, str(e))

    drift_ratios = None
    if req.h_storey is not None:
        drift_ratios = {k: drift_ratio(v, req.h_storey) for k, v in max_drift.items()}

    return {
        "axis": req.axis,
        "levels": req.levels,
        "history": history,
        "max_drift_per_storey": max_drift,
        "drift_ratios": drift_ratios,
        "h_storey": req.h_storey,
    }


# ============================================================================
# Mode superposition (FASE 16)
# ============================================================================

class ModeSuperpositionRequest(BaseModel):
    weights: list[float] = Field(..., min_length=1,
                                  description="Pesi w_i per ciascun modo (len ≤ n_modes).")
    amplitude: float = Field(default=1.0,
                              description="Fattore di amplificazione finale (se normalizza=True viene applicato a max=1).")
    normalize: bool = Field(default=True,
                            description="Se True, normalizza max|u|=1 prima di applicare amplitude.")


@router.post("/{model_id}/mode_superposition")
def mode_superposition_endpoint(model_id: str, req: ModeSuperpositionRequest):
    modal = storage.get_results(model_id, "modal")
    if modal is None:
        raise HTTPException(404, "Nessuna analisi modale salvata. Esegui prima un'analisi modale.")
    if not isinstance(modal, ModalResults):
        raise HTTPException(500, "Tipo modal results inaspettato.")

    modes = modal.modes[: len(req.weights)]
    if not modes:
        raise HTTPException(400, "Nessun modo disponibile.")

    combined = superpose_modes(modes, req.weights[: len(modes)])
    if req.normalize:
        combined = amplify_for_animation(combined, req.amplitude, base_size=1.0)
    else:
        combined = {k: tuple(c * req.amplitude for c in v) for k, v in combined.items()}

    return {
        "deformed": [
            {"node_id": k, "ux": v[0], "uy": v[1], "uz": v[2]}
            for k, v in combined.items()
        ],
        "n_modes_used": len(modes),
        "weights_used": req.weights[: len(modes)],
        "amplitude": req.amplitude,
        "normalize": req.normalize,
    }


# ============================================================================
# Convergence (FASE 19) — Richardson extrapolation
# ============================================================================

class ConvergenceRequest(BaseModel):
    values: list[float] = Field(..., min_length=2,
                                 description="Quantità di interesse q(h), q(h/r), q(h/r²), …")
    ratio: float = Field(default=2.0, gt=1.0,
                          description="Fattore di rifinitura tra mesh consecutive.")
    fs: float = Field(default=1.25, gt=0,
                       description="Safety factor GCI Roache (1.25 per ≥3 mesh, 3.0 per 2).")


@router.post("/convergence")
def convergence_endpoint(req: ConvergenceRequest):
    """Analisi di convergenza Richardson + GCI ASME V&V20.

    Restituisce ordine apparente, valore estrapolato, GCI sul mesh più fine.
    Per p=2 (Bernoulli/CST/Q4), order≈2 e GCI < 5% sono indicativi di
    convergenza accettabile.
    """
    try:
        result = analyze_convergence(req.values, ratio=req.ratio, fs=req.fs)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return asdict(result)


# ============================================================================
# ZZ Error estimator (FASE 19)
# ============================================================================

class ZZErrorRequest(BaseModel):
    """Stima ZZ a partire da campo scalare per elemento (es. σ_VM)."""
    element_values: dict[int, float] = Field(
        ...,
        description="dict {element_id: σ_h} — valore costante per elemento.",
    )
    refine_fraction: float = Field(default=0.2, gt=0, le=1.0)


@router.post("/{model_id}/zz_error")
def zz_error_endpoint(model_id: str, req: ZZErrorRequest):
    """Errore Zienkiewicz-Zhu su un campo scalare per elemento.

    Returns: element_errors + global_error + refinement_candidates (top X%).
    """
    model = _get_model(model_id)
    element_nodes = {e.id: list(e.nodes) for e in model.elements}
    result = zz_error_estimate(req.element_values, element_nodes,
                                refine_fraction=req.refine_fraction)
    rel_err = relative_error(req.element_values, element_nodes)
    return {
        "element_errors": result.element_errors,
        "global_error": result.global_error,
        "relative_error": rel_err,
        "refinement_candidates": result.refinement_candidates,
        "n_elements": len(req.element_values),
    }


# ============================================================================
# Iso-lines tri3 (FASE 16) — semplificato
# ============================================================================

class IsolineRequest(BaseModel):
    """Iso-linee su mesh triangolare con campo scalare nodale.

    Restituisce {level: [{p1, p2}, …]} usando marching squares Tri3.
    """
    field: dict[int, float] = Field(..., description="Valore scalare per node_id.")
    levels: list[float] | None = Field(default=None,
                                         description="Livelli espliciti. Se None, auto.")
    n_auto_levels: int = Field(default=10, ge=1, le=50)


@router.post("/{model_id}/isolines")
def isolines_endpoint(model_id: str, req: IsolineRequest):
    model = _get_model(model_id)
    # Estrai solo i nodi presenti
    nodes_xyz = {n.id: (n.x, n.y, n.z) for n in model.nodes}
    triangles: list[tuple[int, int, int]] = []
    for el in model.elements:
        if el.type.value == "tri3" and len(el.nodes) >= 3:
            triangles.append((el.nodes[0], el.nodes[1], el.nodes[2]))
    if not triangles:
        raise HTTPException(400, "Il modello non contiene triangoli tri3.")
    levels = req.levels if req.levels else auto_levels(req.field, n=req.n_auto_levels)
    iso = isoline_levels_tri3(nodes_xyz, triangles, req.field, levels)
    return {
        "levels": levels,
        "segments_per_level": {
            str(c): [
                {"p1": list(seg.p1), "p2": list(seg.p2)}
                for seg in segs
            ]
            for c, segs in iso.items()
        },
        "n_triangles": len(triangles),
    }


# ============================================================================
# Iso-surfaces 3D — BL-7 (marching tetrahedra)
# ============================================================================

class IsosurfaceRequest(BaseModel):
    """Iso-superficie 3D su mesh tetraedrica o esaedrica.

    Cerca elementi SOLID_H8 (5-tet decomposition) o SOLID_T4/T10 (T10 usa
    solo i 4 vertici, le mid-edge nodes vengono ignorati).
    """
    field: dict[int, float] = Field(..., description="Campo scalare nodale.")
    levels: list[float] | None = Field(default=None,
                                         description="Livelli espliciti. Se None, auto.")
    n_auto_levels: int = Field(default=5, ge=1, le=30)


@router.post("/{model_id}/isosurfaces")
def isosurfaces_endpoint(model_id: str, req: IsosurfaceRequest):
    """Estrae iso-superfici 3D da campo scalare nodale.

    Restituisce {level: [{p1, p2, p3}, ...]} con la mesh di triangoli per
    ogni livello, più un metric di area totale (utile per superfici di
    rottura, contornare zone plastiche, ecc.).
    """
    model = _get_model(model_id)
    nodes_xyz = {n.id: (n.x, n.y, n.z) for n in model.nodes}

    tets: list[tuple[int, int, int, int]] = []
    hexes: list[tuple[int, int, int, int, int, int, int, int]] = []
    for el in model.elements:
        et = el.type.value
        if et == "solid_t4" and len(el.nodes) >= 4:
            tets.append(tuple(el.nodes[:4]))
        elif et == "solid_t10" and len(el.nodes) >= 4:
            # Per T10 prendiamo solo i 4 vertici (i mid-edge sono ignorati
            # nell'estrazione iso — il marching tet usa solo i vertici).
            tets.append(tuple(el.nodes[:4]))
        elif et == "solid_h8" and len(el.nodes) == 8:
            hexes.append(tuple(el.nodes))

    if not tets and not hexes:
        raise HTTPException(400,
            "Il modello non contiene elementi solidi (SOLID_T4/T10/H8).")

    levels = req.levels if req.levels else iso_auto_levels_3d(req.field, n=req.n_auto_levels)

    surfaces: dict[str, list[dict]] = {}
    areas: dict[str, float] = {}
    for c in levels:
        tris_tets = isosurface_tets(nodes_xyz, tets, req.field, c) if tets else []
        tris_hex = isosurface_hex8(nodes_xyz, hexes, req.field, c) if hexes else []
        tris = list(tris_tets) + list(tris_hex)
        surfaces[str(c)] = [
            {"p1": list(t.p1), "p2": list(t.p2), "p3": list(t.p3)}
            for t in tris
        ]
        areas[str(c)] = total_area(tris)

    return {
        "levels": levels,
        "triangles_per_level": surfaces,
        "area_per_level": areas,
        "n_tets": len(tets),
        "n_hexes": len(hexes),
    }
