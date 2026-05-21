"""Self-ping background task — cold-start mitigation per Fly.io free-tier.

## Problema

Fly.io con `auto_stop_machines = true` + `min_machines_running = 0` ferma
la VM dopo ~5 min di inattivita' (no connessioni in entrata). Il prossimo
utente paga un cold-start ~10-22s (boot Python + Uvicorn + register_all).

## Soluzione (alpha.12)

Background task `asyncio` che ping il PROPRIO endpoint `/api/health`
TRAMITE il public URL (non localhost). Il ping viaggia attraverso il
proxy Fly.io → la proxy vede una connessione in entrata → resetta il
timer di idle → la VM rimane warm.

E' un workaround "lecito" e standard nel mondo Fly: l'app si auto-warm
senza dipendere da servizi esterni (UptimeRobot/cron-job.org) che
richiedono account utente. Costo: 0$ aggiuntivi, 1 HTTP call ogni 4min.

## Configurazione

Tre env var (tutte opt-in, default OFF per dev/test):
- `FEAPRO_SELF_PING_URL` (es. "https://fea-pro.fly.dev/api/health")
- `FEAPRO_SELF_PING_INTERVAL_S` (default 240 = 4min, < Fly idle 5min)
- `FEAPRO_SELF_PING_ENABLED` (set "true" per abilitare)

Se URL e' vuoto o ENABLED non e' "true", il task NON parte (no overhead
in dev). Senza override, la fly.toml setta tutto in produzione.

## Failure mode

Se la richiesta fallisce (timeout/5xx), logga warning ma NON crasha. Il
task ri-prova al prossimo intervallo. Tre fallimenti consecutivi
loggano ERROR (utile per allarme via Fly logs).
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


# ── State ───────────────────────────────────────────────────────────────────
_task: Optional[asyncio.Task] = None
_stats = {
    "started_at": 0.0,
    "n_pings": 0,
    "n_success": 0,
    "n_failures": 0,
    "consecutive_failures": 0,
    "last_ping_at": 0.0,
    "last_status": 0,
    "last_latency_ms": 0.0,
    "last_error": "",
}


def get_stats() -> dict:
    """Restituisce snapshot stats per `/api/health/self-ping` debug endpoint."""
    return {**_stats}


async def _ping_once(client: httpx.AsyncClient, url: str) -> tuple[bool, int, float, str]:
    """Esegue una richiesta GET. Restituisce (success, status, latency_ms, error)."""
    t0 = time.monotonic()
    try:
        resp = await client.get(url, timeout=10.0)
        latency_ms = (time.monotonic() - t0) * 1000
        return (resp.status_code < 500, resp.status_code, latency_ms, "")
    except (httpx.TimeoutException, httpx.HTTPError) as e:
        latency_ms = (time.monotonic() - t0) * 1000
        return (False, 0, latency_ms, str(e))


async def _self_ping_loop(url: str, interval_s: float) -> None:
    """Loop infinito: ping ogni interval_s. Cancellabile via task.cancel()."""
    logger.info(
        "self_ping: started → url=%s interval=%.0fs (Fly idle timeout ~5min)",
        url, interval_s,
    )
    _stats["started_at"] = time.time()

    # Headers HTTP per auto-identificarsi nei log Fly (utile debugging)
    headers = {"User-Agent": "feapro-self-ping/1.0 (cold-start mitigation)"}

    async with httpx.AsyncClient(headers=headers) as client:
        # Sleep iniziale per dare al server tempo di startup completo
        await asyncio.sleep(min(30.0, interval_s))

        while True:
            try:
                _stats["n_pings"] += 1
                success, status, latency_ms, error = await _ping_once(client, url)
                _stats["last_ping_at"] = time.time()
                _stats["last_status"] = status
                _stats["last_latency_ms"] = round(latency_ms, 1)
                _stats["last_error"] = error

                if success:
                    _stats["n_success"] += 1
                    _stats["consecutive_failures"] = 0
                    logger.debug(
                        "self_ping ok: status=%d latency=%.0fms total=%d",
                        status, latency_ms, _stats["n_pings"],
                    )
                else:
                    _stats["n_failures"] += 1
                    _stats["consecutive_failures"] += 1
                    log_fn = (
                        logger.error if _stats["consecutive_failures"] >= 3
                        else logger.warning
                    )
                    log_fn(
                        "self_ping fail: status=%d err=%r consecutive=%d",
                        status, error, _stats["consecutive_failures"],
                    )

                await asyncio.sleep(interval_s)
            except asyncio.CancelledError:
                logger.info(
                    "self_ping: stopped (total=%d ok=%d fail=%d)",
                    _stats["n_pings"], _stats["n_success"], _stats["n_failures"],
                )
                raise
            except Exception as e:  # noqa: BLE001
                # Non far morire mai il task per un eccezione imprevista
                logger.exception("self_ping: unexpected error %r", e)
                await asyncio.sleep(interval_s)


def start_self_ping() -> Optional[asyncio.Task]:
    """Avvia il task di self-ping se le env var lo abilitano.

    Restituisce il task creato oppure None se disabilitato. Idempotente:
    se gia' avviato, non ne crea un altro.
    """
    global _task

    if _task is not None and not _task.done():
        logger.debug("self_ping: already running, skip")
        return _task

    enabled = os.getenv("FEAPRO_SELF_PING_ENABLED", "").lower() in ("true", "1", "yes")
    url = os.getenv("FEAPRO_SELF_PING_URL", "").strip()

    if not enabled:
        logger.info("self_ping: disabled (FEAPRO_SELF_PING_ENABLED != true)")
        return None
    if not url:
        logger.warning(
            "self_ping: ENABLED but no FEAPRO_SELF_PING_URL set, skip"
        )
        return None

    try:
        interval_s = float(os.getenv("FEAPRO_SELF_PING_INTERVAL_S", "240"))
    except ValueError:
        interval_s = 240.0

    # Range sicuro: tra 60s e 600s (Fly default 5min idle)
    interval_s = max(60.0, min(600.0, interval_s))

    loop = asyncio.get_event_loop()
    _task = loop.create_task(_self_ping_loop(url, interval_s))
    return _task


async def stop_self_ping() -> None:
    """Cancella il task in modo grazioso (su shutdown FastAPI)."""
    global _task
    if _task is None:
        return
    _task.cancel()
    try:
        await _task
    except asyncio.CancelledError:
        pass
    _task = None
