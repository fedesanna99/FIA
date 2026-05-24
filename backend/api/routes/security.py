"""
Endpoint security per supporto CSP report-only.

Bug #17 dell'audit v2.3.5 (sprint 3 v2.4.2c-security-headers).
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request


logger = logging.getLogger("csp-violations")
router = APIRouter()


@router.post("/csp-report", include_in_schema=False)
async def csp_report(request: Request):
    """
    Endpoint per ricevere violazioni CSP report-only.

    Logga le violazioni a livello WARNING (non blocca). Quando i log
    sono puliti per qualche sprint, considerare il passaggio a
    enforcement (header ``Content-Security-Policy`` invece di
    ``Content-Security-Policy-Report-Only``).
    """
    try:
        body = await request.json()
        logger.warning("CSP violation: %s", body)
    except Exception:  # noqa: BLE001
        # Body non parsabile → ignora silently (browser format vario)
        pass
    return {"status": "received"}
