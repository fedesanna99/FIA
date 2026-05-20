"""
API I/O — import/export verso formati BIM/CAD.

Endpoint:
    POST /api/io/import/dxf          (multipart .dxf)
    POST /api/io/import/ifc          (multipart .ifc)
    GET  /api/io/export/{id}/dxf     → application/dxf
    GET  /api/io/export/{id}/ifc     → application/ifc

L'import salva direttamente in storage e ritorna il modello creato.
L'export ritorna il file binario con il content-type appropriato.
"""
from __future__ import annotations
import tempfile
from pathlib import Path

import json

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

import storage
from core.io import (
    import_dxf, export_dxf, import_ifc, export_ifc,
    export_excel, export_pdf,
)
from core.io.accelerogram import parse_accelerogram
from core.io.synthetic_accel import (
    kanai_tajimi_accelerogram, boore_white_noise_accelerogram,
)


_ACCEL_DIR = Path(__file__).resolve().parents[2] / "data" / "accelerograms"


router = APIRouter()


@router.post("/import/dxf")
async def import_dxf_endpoint(
    file: UploadFile = File(...),
    material_id: str = Form("steel_s355"),
    section_id: str = Form("ipe_300"),
    tol: float | None = Form(None, description="Tol dedupe nodi [m]"),
    layer_material_map: str | None = Form(
        None,
        description="(BL-8) JSON {layer_name: material_id}. Override del material_id per layer.",
    ),
    layer_section_map: str | None = Form(
        None,
        description="(BL-8) JSON {layer_name: section_id}. Override del section_id per layer.",
    ),
):
    """Riceve un .dxf, lo importa come nuovo modello, lo salva, ritorna il FEAModel.

    Per la mappatura layer→materiale/sezione, passa stringhe JSON
    (es. `layer_material_map={"COLONNE":"steel_s355","SOLAI":"timber_c24"}`).
    """
    if not file.filename or not file.filename.lower().endswith(".dxf"):
        raise HTTPException(400, "File deve avere estensione .dxf")

    def _parse_map(raw: str | None, label: str) -> dict[str, str] | None:
        if not raw:
            return None
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as e:
            raise HTTPException(400, f"{label}: JSON non valido — {e}")
        if not isinstance(parsed, dict):
            raise HTTPException(400, f"{label}: deve essere un oggetto JSON")
        return {str(k): str(v) for k, v in parsed.items()}

    lm = _parse_map(layer_material_map, "layer_material_map")
    ls = _parse_map(layer_section_map, "layer_section_map")

    data = await file.read()
    tmp = Path(tempfile.mkdtemp()) / file.filename
    tmp.write_bytes(data)
    try:
        model = import_dxf(
            tmp,
            material_id=material_id, section_id=section_id,
            model_id=storage.new_id(),
            model_name=file.filename.rsplit(".", 1)[0],
            tolerance=tol if tol is not None else 1e-6,
            layer_material_map=lm,
            layer_section_map=ls,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Errore importazione DXF: {e}")
    storage.save_model(model)
    return {"model": model, "warnings": []}


@router.post("/import/ifc")
async def import_ifc_endpoint(
    file: UploadFile = File(...),
    material_id: str = Query("steel_s355"),
    section_id: str = Query("ipe_300"),
):
    """Riceve un .ifc, lo importa come nuovo modello (solo IfcBeam/IfcColumn)."""
    if not file.filename or not file.filename.lower().endswith(".ifc"):
        raise HTTPException(400, "File deve avere estensione .ifc")
    data = await file.read()
    tmp = Path(tempfile.mkdtemp()) / file.filename
    tmp.write_bytes(data)
    try:
        model = import_ifc(
            tmp,
            material_id=material_id, section_id=section_id,
            model_id=storage.new_id(),
            model_name=file.filename.rsplit(".", 1)[0],
        )
    except Exception as e:
        raise HTTPException(400, f"Errore importazione IFC: {e}")
    storage.save_model(model)
    return {"model": model, "warnings": []}


@router.get("/export/{model_id}/dxf")
def export_dxf_endpoint(model_id: str):
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    tmp = Path(tempfile.mkdtemp()) / f"{m.name or model_id}.dxf"
    export_dxf(m, tmp)
    return FileResponse(
        tmp, media_type="application/dxf",
        filename=tmp.name,
    )


@router.get("/accelerograms")
def list_accelerograms():
    """Elenca i file accelerogrammi disponibili nel catalogo embedded."""
    if not _ACCEL_DIR.exists():
        return {"items": []}
    items = []
    for f in sorted(_ACCEL_DIR.iterdir()):
        if not f.is_file():
            continue
        try:
            rec = parse_accelerogram(f)
            items.append({
                "name": rec.name,
                "filename": f.name,
                "dt": rec.dt,
                "npts": rec.npts,
                "duration_s": rec.duration(),
                "pga_m_s2": rec.pga,
                "source": rec.source,
            })
        except Exception as e:
            items.append({
                "name": f.stem, "filename": f.name,
                "error": str(e),
            })
    return {"items": items}


@router.get("/accelerograms/{filename}")
def get_accelerogram(filename: str):
    """Restituisce la time history (t, a) [m/s²] di un accelerogramma."""
    p = _ACCEL_DIR / filename
    if not p.exists():
        raise HTTPException(404, f"Accelerogramma '{filename}' non trovato")
    rec = parse_accelerogram(p)
    return {
        "name": rec.name,
        "dt": rec.dt,
        "npts": rec.npts,
        "duration_s": rec.duration(),
        "pga_m_s2": rec.pga,
        "source": rec.source,
        "time_history": rec.time_history(),
    }


class SyntheticAccelReq(BaseModel):
    method: str = "kanai_tajimi"  # 'kanai_tajimi' | 'boore'
    pga: float = 3.0   # m/s²
    dt: float = 0.01
    duration: float = 20.0
    omega_g_hz: float = 5.0
    xi_g: float = 0.6
    t1: float = 2.0
    t2: float = 10.0
    seed: int | None = None


@router.post("/accelerograms/synthetic")
def generate_synthetic(req: SyntheticAccelReq):
    """Genera un accelerogramma sintetico (KT o Boore) e ritorna time-history."""
    import math
    if req.method == "kanai_tajimi":
        rec = kanai_tajimi_accelerogram(
            pga=req.pga, dt=req.dt, duration=req.duration,
            omega_g=req.omega_g_hz * 2 * math.pi,
            xi_g=req.xi_g, t1=req.t1, t2=req.t2,
            seed=req.seed,
        )
    elif req.method == "boore":
        rec = boore_white_noise_accelerogram(
            pga=req.pga, dt=req.dt, duration=req.duration,
            t1=req.t1, t2=req.t2, seed=req.seed,
        )
    else:
        raise HTTPException(400, f"method sconosciuto: {req.method}")
    return {
        "name": rec.name,
        "dt": rec.dt,
        "npts": rec.npts,
        "duration_s": rec.duration(),
        "pga_m_s2": rec.pga,
        "source": rec.source,
        "time_history": rec.time_history(),
    }


@router.get("/export/{model_id}/ifc")
def export_ifc_endpoint(model_id: str):
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    tmp = Path(tempfile.mkdtemp()) / f"{m.name or model_id}.ifc"
    export_ifc(m, tmp)
    return FileResponse(
        tmp, media_type="application/ifc",
        filename=tmp.name,
    )


@router.get("/export/{model_id}/pdf")
def export_pdf_endpoint(
    model_id: str,
    include_static: bool = Query(False),
    include_modal: bool = Query(False),
    author: str = Query("FEA Pro"),
    title: str | None = Query(None),
):
    """Genera relazione PDF parametrica."""
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    sr = mr = None
    if include_static:
        from core.solver import StaticSolver
        sr = StaticSolver(m).solve()
    if include_modal:
        from core.solver import ModalSolver
        mr = ModalSolver(m).solve()
    tmp = Path(tempfile.mkdtemp()) / f"{m.name or model_id}.pdf"
    export_pdf(m, tmp, static_results=sr, modal_results=mr,
                author=author, title=title)
    return FileResponse(tmp, media_type="application/pdf", filename=tmp.name)


@router.get("/export/{model_id}/xlsx")
def export_xlsx_endpoint(
    model_id: str,
    include_static: bool = Query(False),
    include_modal: bool = Query(False),
):
    """Export Excel multi-sheet. Se include_static o include_modal sono True
    esegue il solver e aggiunge i sheet relativi.
    """
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    static_results = None
    modal_results = None
    if include_static:
        from core.solver import StaticSolver
        static_results = StaticSolver(m).solve()
    if include_modal:
        from core.solver import ModalSolver
        modal_results = ModalSolver(m).solve()
    tmp = Path(tempfile.mkdtemp()) / f"{m.name or model_id}.xlsx"
    export_excel(m, tmp,
                 static_results=static_results, modal_results=modal_results)
    return FileResponse(
        tmp,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=tmp.name,
    )
