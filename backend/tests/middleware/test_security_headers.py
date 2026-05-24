"""
Regression test per bug #17 (audit v2.3.5).

Verifica che tutte le risposte includano i 5 security headers richiesti:
HSTS + X-Frame + X-Content-Type + CSP report-only + Referrer-Policy.
"""
from fastapi.testclient import TestClient

from main import app


def _client() -> TestClient:
    return TestClient(app)


def test_hsts_header_present():
    """Strict-Transport-Security forza HTTPS per 1 anno."""
    r = _client().get("/api/health")
    hsts = r.headers.get("Strict-Transport-Security")
    assert hsts is not None
    assert "max-age=31536000" in hsts
    assert "includeSubDomains" in hsts


def test_x_frame_options_deny():
    """X-Frame-Options DENY blocca embedding (clickjacking)."""
    r = _client().get("/api/health")
    assert r.headers.get("X-Frame-Options") == "DENY"


def test_x_content_type_options_nosniff():
    """X-Content-Type-Options nosniff blocca MIME confusion."""
    r = _client().get("/api/health")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"


def test_csp_report_only_present():
    """Content-Security-Policy-Report-Only definito con report-uri."""
    r = _client().get("/api/health")
    csp = r.headers.get("Content-Security-Policy-Report-Only")
    assert csp is not None
    assert "default-src 'self'" in csp
    assert "report-uri /api/csp-report" in csp
    assert "frame-ancestors 'none'" in csp


def test_referrer_policy_strict_origin():
    """Referrer-Policy: strict-origin-when-cross-origin (no info leak)."""
    r = _client().get("/api/health")
    assert r.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_csp_report_endpoint_accepts_violation():
    """POST /api/csp-report accetta JSON violation senza esplodere."""
    client = _client()
    r = client.post(
        "/api/csp-report",
        json={"csp-report": {"document-uri": "https://example.com", "blocked-uri": "inline"}},
    )
    assert r.status_code == 200
    assert r.json().get("status") == "received"


def test_csp_report_endpoint_accepts_empty_body():
    """POST /api/csp-report con body non-JSON non solleva 500."""
    client = _client()
    r = client.post("/api/csp-report", content=b"garbage")
    assert r.status_code == 200
