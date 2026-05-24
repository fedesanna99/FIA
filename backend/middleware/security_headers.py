"""
Security headers middleware (HSTS, CSP, X-Frame, X-Content-Type, Referrer).

Bug #17 dell'audit v2.3.5. Headers aggiunti a tutte le risposte HTTP
per protezione MitM, XSS, clickjacking, MIME confusion, referrer leak.

CSP è in modalità ``report-only`` inizialmente (logga violazioni senza
bloccare). Passare a enforcement (``Content-Security-Policy``) quando
le violazioni reali sono zero da qualche sprint.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


# Profilo CSP report-only: permissivo abbastanza per non rompere la SPA
# attuale (inline scripts/styles, Fly.io, Open-Meteo, ecc.), report-uri
# raccoglie le violazioni per analisi.
_CSP_REPORT_ONLY = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "img-src 'self' data: https:; "
    "connect-src 'self' https:; "
    "font-src 'self' data: https://fonts.gstatic.com; "
    "frame-ancestors 'none'; "
    "report-uri /api/csp-report"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Aggiunge security headers a ogni risposta HTTP."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # HSTS: forza HTTPS per 1 anno con subdomains
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

        # X-Frame-Options: blocca embedding in iframe (clickjacking)
        response.headers["X-Frame-Options"] = "DENY"

        # X-Content-Type-Options: blocca MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # CSP report-only (no enforcement, logga violazioni in /api/csp-report)
        response.headers["Content-Security-Policy-Report-Only"] = _CSP_REPORT_ONLY

        # Referrer-Policy: no leak su navigation cross-origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response
