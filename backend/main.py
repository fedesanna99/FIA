"""FEA Pro — FastAPI entry point."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api.routes import (
    models, analysis, materials, verify, io as io_routes, ai as ai_routes,
    postprocess as postprocess_routes, verify_ext as verify_ext_routes,
    billing as billing_routes, usage as usage_routes,
)
from api.websocket import router as ws_router
from storage import seed_examples


app = FastAPI(
    title="FEA Pro API",
    description=(
        "Analisi strutturale agli elementi finiti — backend FastAPI/NumPy. "
        "Supporta: statica, modale, dinamica Newmark, time-history sismico, "
        "buckling, push-over, molle unilaterali (Winkler), verifiche EC3/EC2/EC5/EC8, "
        "I/O DXF/IFC/Excel/PDF, AI Copilot, editing collaborativo."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router, prefix="/api/models", tags=["models"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(materials.router, prefix="/api", tags=["materials"])
app.include_router(verify.router, prefix="/api/verify", tags=["verify"])
app.include_router(verify_ext_routes.router, prefix="/api/verify", tags=["verify"])
app.include_router(io_routes.router, prefix="/api/io", tags=["io"])
app.include_router(ai_routes.router, prefix="/api/ai", tags=["ai"])
app.include_router(postprocess_routes.router, prefix="/api/postprocess", tags=["postprocess"])
app.include_router(billing_routes.router, prefix="/api/billing", tags=["billing"])
app.include_router(usage_routes.router, prefix="/api/usage", tags=["usage"])
app.include_router(ws_router, tags=["websocket"])


@app.on_event("startup")
def startup_event():
    seed_examples()


@app.get("/api")
def api_root():
    return {
        "app": "FEA Pro",
        "version": app.version,
        "docs": "/docs",
        "endpoints": {
            "models": "/api/models",
            "analysis": "/api/analysis",
            "materials": "/api/materials",
            "sections": "/api/sections",
            "verify_ec3": "/api/verify/ec3/{model_id}",
            "io_import_dxf": "/api/io/import/dxf",
            "io_import_ifc": "/api/io/import/ifc",
            "io_export_dxf": "/api/io/export/{model_id}/dxf",
            "io_export_ifc": "/api/io/export/{model_id}/ifc",
            "io_export_xlsx": "/api/io/export/{model_id}/xlsx",
            "io_export_pdf": "/api/io/export/{model_id}/pdf",
            "io_accelerograms": "/api/io/accelerograms",
            "ai_ask": "/api/ai/ask",
            "models_compare": "/api/models/compare",
            "auto_detect": "/api/models/{model_id}/auto-detect",
        },
        "features": [
            "static-analysis", "modal", "dynamic-newmark",
            "buckling-eulero", "pushover-plastic-hinges",
            "winkler-foundation", "unilateral-springs-active-set",
            "seismic-time-history-multi-component",
            "rainflow-fatigue-ec3-1-9",
            "ec3-ec2-ec5-ec8-verifications",
            "dxf-ifc-xlsx-pdf-export",
            "ai-copilot-gemini",
            "real-time-collab-websocket",
            "auto-detect-model-issues",
        ],
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "version": app.version}


# ── SPA serving (production / Fly.io single-image build) ─────────────────────
# The Dockerfile copies the built Vite bundle into /app/static. When that
# directory exists, mount it at "/" and add a catch-all that returns
# index.html so client-side routing keeps working. In dev (no /app/static),
# this block is silently skipped and Vite on :5173 serves the SPA.
_STATIC_DIR = Path(__file__).parent / "static"
if _STATIC_DIR.is_dir() and (_STATIC_DIR / "index.html").is_file():
    # Serve hashed assets directly (cached aggressively by browsers).
    app.mount("/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="assets")

    @app.get("/", include_in_schema=False)
    def _spa_root():
        return FileResponse(_STATIC_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def _spa_fallback(full_path: str):
        # Anything starting with api/ws/docs/openapi should already be handled
        # above. Guard against accidental shadowing.
        if full_path.startswith(("api", "ws", "docs", "openapi", "redoc")):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        # If the request matches a real file in /static (favicon, vite.svg…),
        # serve it; otherwise return index.html for client-side routing.
        candidate = _STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_STATIC_DIR / "index.html")
