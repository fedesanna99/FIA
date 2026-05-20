# ──────────────────────────────────────────────────────────────────────────────
# FEA Pro — single-image build for Fly.io (Option A)
# Stage 1: build the Vite SPA → produces /web/dist
# Stage 2: Python runtime, copy backend + built SPA, serve both on port 8000
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: frontend build ───────────────────────────────────────────────────
FROM node:20-alpine AS web

WORKDIR /web

# install deps first (cached layer)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund

# copy sources and build
COPY frontend/ ./
# Same-origin in production: VITE_API_URL stays empty so axios uses ""
ENV VITE_API_URL=""
RUN npm run build


# ── Stage 2: Python backend + bundled SPA ─────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FEAPRO_DATA_DIR=/data

WORKDIR /app

# build-essential needed for any scipy/numpy fallback builds; slim it after install
# Build deps + runtime libs:
# - build-essential: compile fallback per numpy/scipy se wheel non disponibile
# - libglu1-mesa, libgl1, libxrender1, libxcursor1, libxft2, libxinerama1:
#   gmsh runtime (occt/opencascade dipendenze). Senza libGLU il backend
#   crasha al boot con "libGLU.so.1: cannot open shared object file".
# - libgomp1: OpenMP runtime per gmsh/scipy.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        build-essential curl \
        libglu1-mesa libgl1 libxrender1 libxcursor1 libxft2 libxinerama1 \
        libgomp1 \
 && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install -r requirements.txt \
 && apt-get purge -y --auto-remove build-essential \
 && rm -rf /var/lib/apt/lists/*

# backend sources
COPY backend/ ./

# built SPA from stage 1
COPY --from=web /web/dist ./static

# Persistent data dir (Fly volume mount target).
# Subfolders for: jobs SQLite, services cache, usage tracker, audit JSONL.
RUN mkdir -p /data /data/audit

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/api/health || exit 1

# --proxy-headers: Fly terminates TLS at edge; uvicorn needs to trust X-Forwarded-* for correct scheme.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
