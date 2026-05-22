# Playwright Setup — Smoke E2E

> Procedura per installare ed eseguire i test Playwright introdotti
> nello sprint v1.6.1-polish (T6).

---

## Installazione (una sola volta)

```bash
cd frontend

# 1. Aggiungi @playwright/test alle devDependencies
pnpm add -D @playwright/test

# 2. Scarica i browser binaries (~150 MB)
pnpm exec playwright install chromium

# 3. (Opzionale) installa anche firefox + webkit
pnpm exec playwright install
```

> Nota: i binaries finiscono in `~/.cache/ms-playwright/` (Linux/Mac) o
> `%USERPROFILE%\AppData\Local\ms-playwright\` (Windows). NON sono
> committati nel repo.

## Esecuzione

### Locale (dev)

```bash
# Terminale 1: dev server + backend
cd frontend
pnpm dev

# Terminale 2: smoke E2E
cd frontend
pnpm e2e            # headless
pnpm e2e --headed   # con browser visibile
pnpm e2e --debug    # step-through con Playwright Inspector
```

Gli screenshot di verifica vengono salvati in `.codex-temp/verify-T6-*.png`.

### Produzione (fea-pro.fly.dev)

```bash
cd frontend
E2E_BASE_URL=https://fea-pro.fly.dev pnpm e2e
```

### CI

Aggiungere step in `.github/workflows/ci.yml`:

```yaml
- name: Install Playwright
  run: cd frontend && pnpm exec playwright install chromium --with-deps

- name: Run smoke E2E
  run: cd frontend && pnpm e2e
  env:
    CI: true
```

## Scenari coperti

`frontend/e2e/smoke-engineer-workflow.spec.ts` — 4 test:

1. **Empty state**: rail disabled, banner offline, 0 toast errore, no
   View button anomalo (verifica fix v1.6.1 T1/T2/T3 + v1.6 S0 B03).
2. **Workflow base**: template → load → run → deformata. ⚠ Richiede
   backend disponibile.
3. **Palette UX**: Ctrl+K, ESC, backdrop click (v1.6 S0 B02).
4. **Errori 422**: nessun `[object Object]` nei toast, traduzione
   italiana "vincolo" (v1.6 S0 B05).

## Configurazione

`playwright.config.ts`:
- `testDir: ./e2e`
- `baseURL`: env `E2E_BASE_URL` || `http://localhost:5173`
- `viewport`: 1440×900 (Desktop Chrome)
- `workers: 1` (i test toccano lo stato globale, no parallelismo)

## Troubleshooting

### `Error: browserType.launch: Executable doesn't exist`
→ `pnpm exec playwright install chromium`.

### `Test timeout exceeded`
→ Il backend sta cold-starting (Fly.io free tier). Aumenta `timeout` o
  fai un primo `curl https://fea-pro.fly.dev/api/health` come warmup.

### `[object Object]` ancora visibile
→ Bug! Aprire issue: il `translateAxiosError` in `lib/apiErrors.ts` non sta
  mappando un kind backend nuovo.
