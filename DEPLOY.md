# Deploy FEA Pro on Fly.io (single-image, Option A)

This deploys backend + frontend as **one** Fly app. The Vite SPA is built into
the Docker image and served by FastAPI at `/`. Models persist on a Fly Volume
mounted at `/data` (via `FEA_DATA_DIR`).

## 1. Prerequisites

```bash
# install flyctl (https://fly.io/docs/flyctl/install/)
# Windows (PowerShell):
iwr https://fly.io/install.ps1 -useb | iex
# macOS / Linux:
curl -L https://fly.io/install.sh | sh

fly auth login
```

## 2. First-time setup

From the repo root (`fea-pro/`):

```bash
# Reserve the app name (don't deploy yet — we already have fly.toml + Dockerfile)
fly launch --no-deploy --copy-config --name fea-pro --region fra

# Create the persistent volume for /data (1 GB is plenty for JSON models)
fly volumes create fea_data --region fra --size 1
```

If `fea-pro` is taken, pick another name and update the `app =` line in `fly.toml`.

## 3. Deploy

```bash
fly deploy
```

First build takes 5–8 min (numpy/scipy wheels). Subsequent deploys are faster.

When it's up:

```bash
fly open                # opens the app in your browser
fly logs                # stream logs
fly status              # machines, health, volumes
fly ssh console         # shell into the running container
```

## 4. Verify

- `https://<app>.fly.dev/`           → SPA loads, examples are seeded
- `https://<app>.fly.dev/api/health` → `{"status":"ok"}`
- `https://<app>.fly.dev/docs`       → FastAPI Swagger UI
- Run a static analysis on `simple_beam_2d` from the UI — WebSocket progress should stream

## 5. Common operations

```bash
# Bump memory if modal/dynamic OOMs on a big model:
fly scale memory 2048

# Force the app to stay warm (skip cold starts):
fly scale count 1 --max-per-region 1
# In fly.toml set min_machines_running = 1 to make it permanent.

# Inspect persisted models:
fly ssh console -C "ls -la /data"

# Wipe persisted models (keeps the volume):
fly ssh console -C "rm -f /data/*.json"
```

## 6. Cost expectation

- 1× shared-cpu-1x @ 1 GB, auto-stopped when idle → ~**$2–5 / month**
- 1 GB volume → **$0.15 / month**
- Free allowance covers up to 3 small machines (terms change — check pricing)

## 7. Local dev unchanged

`docker-compose up` still works (hot-reload backend on 8000, Vite on 5173).
The static-serving block in `backend/main.py` is a no-op unless `/app/static`
exists — which only happens inside the Fly image.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Build OOM on Fly remote builder | `fly deploy --local-only` (uses your Docker) |
| WebSocket disconnects after a few seconds | Already mitigated; if it returns, set `[http_service] idle_timeout = "300s"` |
| Models disappear after deploy | Volume not mounted — re-run `fly volumes create fea_data` and `fly deploy` |
| 404 on a client-side route refresh | Confirm the SPA fallback in `main.py` is active (look for `/app/static` in the image) |
| Slow first request after idle | Expected: `auto_stop_machines = true`. Set `min_machines_running = 1` to disable. |
