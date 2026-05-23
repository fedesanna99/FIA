"""FEA Pro — FastAPI entry point."""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api.routes import (
    models, analysis, materials, verify, io as io_routes, ai as ai_routes,
    postprocess as postprocess_routes, verify_ext as verify_ext_routes,
    billing as billing_routes, usage as usage_routes,
    quotas as quotas_routes, jobs as jobs_routes,
    validation as validation_routes,
    providers_usage as providers_usage_routes,
    loads as loads_routes,
    geocoding as geocoding_routes,
    terrain as terrain_routes,
    auth as auth_routes,
)
from api.websocket import router as ws_router
from storage import seed_examples
from jobs.worker import get_worker
from services.providers.registration import register_all
from services.self_ping import start_self_ping, stop_self_ping, get_stats as get_self_ping_stats


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

# v2.2.2 audit-fix P1 — CORS lockdown.
# Prima: allow_origins=["*"] con allow_credentials=True (la spec CORS lo vieta,
# i browser ignorano l'header credentials con wildcard, ma per produzione è
# rischio open-CORS). Ora: lista esplicita configurabile via env-var.
# Default include il deploy fly.io + localhost dev (porti Vite + preview).
_default_origins = ",".join([
    "https://fea-pro.fly.dev",
    "http://localhost:5173",  # Vite dev
    "http://localhost:5176",  # Vite preview
    "http://localhost:4173",  # Vite preview alt
    "http://127.0.0.1:5173",
])
_cors_env = os.environ.get("CORS_ALLOWED_ORIGINS", _default_origins).strip()
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
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
app.include_router(quotas_routes.router, prefix="/api/quotas", tags=["quotas"])
app.include_router(jobs_routes.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(validation_routes.router, prefix="/api/validation", tags=["validation"])
app.include_router(
    providers_usage_routes.router,
    prefix="/api/providers/usage",
    tags=["providers-usage"],
)
app.include_router(loads_routes.router, prefix="/api/loads", tags=["loads"])
app.include_router(geocoding_routes.router, prefix="/api/geocoding", tags=["geocoding"])
app.include_router(terrain_routes.router, prefix="/api/terrain", tags=["terrain"])
app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(ws_router, tags=["websocket"])


@app.on_event("startup")
async def startup_event():
    seed_examples()
    # Registra gli 8 provider F4 nel registry (Sprint 2 F8 orchestrator dependency).
    # Senza questo, /api/loads/*, /api/geocoding/*, /api/terrain/* rispondono 503
    # "no providers registered".
    register_all()
    # Avvia il job worker (A5)
    worker = get_worker()
    await worker.start()
    # Cold-start mitigation (alpha.12): self-ping via public URL ogni 4min
    # per evitare che Fly.io fermi la VM dopo 5min di idle. Opt-in via env.
    start_self_ping()


@app.on_event("shutdown")
async def shutdown_event():
    worker = get_worker()
    await worker.stop()
    await stop_self_ping()


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


@app.get("/api/health/self-ping")
def health_self_ping():
    """Stats self-ping cold-start mitigation (alpha.12). Utile per debug
    su Fly.io: verifica che il loop stia pingando con successo e che la
    VM rimanga warm tra deploy."""
    return get_self_ping_stats()


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
        # Directory request (e.g. /audit/) → serve nested index.html if present
        # so sub-app entry points (audit viewer, /docs static, …) work
        # without forcing a SPA route to a different bundle.
        if candidate.is_dir() and (candidate / "index.html").is_file():
            return FileResponse(candidate / "index.html")
        return FileResponse(_STATIC_DIR / "index.html")
