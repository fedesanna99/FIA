"""Validation report endpoint (Sprint 1 — D2)."""
from __future__ import annotations

import html as _html
import os
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse

from validation.benchmarks import Benchmark, get_benchmarks


router = APIRouter()


@dataclass
class BenchmarkResult:
    id: str
    family: str
    description: str
    target_value: float
    target_unit: str
    tolerance_pct: float
    actual_value: float
    error_pct: float
    passed: bool
    reference_url: str | None = None


_REPORT_CACHE: dict[str, Any] = {"ts": 0.0, "results": None, "ttl": None}


def _cache_ttl_s() -> int:
    try:
        return int(os.environ.get("FEAPRO_VALIDATION_REPORT_TTL", "3600"))
    except ValueError:
        return 3600


def _run_one(b: Benchmark) -> BenchmarkResult:
    try:
        actual = float(b.actual_value_fn())
    except Exception as exc:  # noqa: BLE001
        return BenchmarkResult(
            id=b.id, family=b.family, description=b.description,
            target_value=b.target_value, target_unit=b.target_unit,
            tolerance_pct=b.tolerance_pct, actual_value=float("nan"),
            error_pct=float("inf"), passed=False,
            reference_url=f"ERROR: {exc}",
        )
    if abs(b.target_value) < 1e-30:
        err_pct = abs(actual) * 100
    else:
        err_pct = abs(actual - b.target_value) / abs(b.target_value) * 100
    return BenchmarkResult(
        id=b.id, family=b.family, description=b.description,
        target_value=b.target_value, target_unit=b.target_unit,
        tolerance_pct=b.tolerance_pct, actual_value=actual,
        error_pct=err_pct, passed=err_pct <= b.tolerance_pct + 1e-9,
        reference_url=b.reference_url,
    )


def _run_all() -> list[BenchmarkResult]:
    return [_run_one(b) for b in get_benchmarks()]


def _format_value(v: float) -> str:
    if v != v:  # NaN
        return "NaN"
    if v == 0:
        return "0"
    av = abs(v)
    if 1e-3 <= av < 1e6:
        return f"{v:.4g}"
    return f"{v:.4e}"


def _render_html(results: list[BenchmarkResult], generated_at: float) -> str:
    n_total = len(results)
    n_passed = sum(1 for r in results if r.passed)
    by_family: dict[str, list[BenchmarkResult]] = defaultdict(list)
    for r in results:
        by_family[r.family].append(r)

    family_sections = []
    for fam in sorted(by_family.keys()):
        rows = []
        for r in by_family[fam]:
            badge_cls = "ok" if r.passed else "fail"
            badge_lbl = "PASS" if r.passed else "FAIL"
            ref = ""
            if r.reference_url:
                if r.reference_url.startswith("ERROR:"):
                    ref = f'<span class="err">{_html.escape(r.reference_url)}</span>'
                else:
                    ref = (
                        f'<a href="{_html.escape(r.reference_url)}" '
                        f'target="_blank" rel="noopener">ref</a>'
                    )
            rows.append(
                f"<tr>"
                f"<td><code>{_html.escape(r.id)}</code></td>"
                f"<td>{_html.escape(r.description)}</td>"
                f"<td class='num'>{_format_value(r.target_value)} {_html.escape(r.target_unit)}</td>"
                f"<td class='num'>{_format_value(r.actual_value)} {_html.escape(r.target_unit)}</td>"
                f"<td class='num'>{r.error_pct:.2f}% / {r.tolerance_pct:.1f}%</td>"
                f"<td><span class='badge {badge_cls}'>{badge_lbl}</span></td>"
                f"<td>{ref}</td>"
                f"</tr>"
            )
        family_sections.append(
            f"<section><h2>{_html.escape(fam)}</h2>"
            f"<table><thead><tr>"
            f"<th>ID</th><th>Description</th><th>Target</th><th>Actual</th>"
            f"<th>Error / Tol</th><th>Status</th><th>Ref</th>"
            f"</tr></thead><tbody>{''.join(rows)}</tbody></table>"
            f"</section>"
        )

    css = """
    body { font-family: -apple-system, Segoe UI, sans-serif; max-width: 1100px;
           margin: 1rem auto; padding: 0 1rem; color: #111; }
    h1 { border-bottom: 2px solid #333; padding-bottom: .3rem; }
    h2 { margin-top: 1.5rem; color: #1a3a5c; }
    table { border-collapse: collapse; width: 100%; margin: .5rem 0 1rem; }
    th, td { padding: .35rem .55rem; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f1f4f9; }
    .num { font-family: ui-monospace, monospace; text-align: right; }
    .badge { padding: .12rem .5rem; border-radius: 4px; font-weight: 600;
             font-size: .85em; }
    .badge.ok { background: #22a34a; color: white; }
    .badge.fail { background: #c0392b; color: white; }
    .err { color: #c0392b; font-size: .85em; }
    .summary { padding: .8rem 1rem; background: #f0f7ec; border-left: 4px solid #22a34a;
               margin-bottom: 1rem; }
    .summary.bad { background: #fbecec; border-left-color: #c0392b; }
    .footer { color: #777; font-size: .85em; margin-top: 1.5rem;
              border-top: 1px solid #eee; padding-top: .6rem; }
    @media print { .badge.ok { background: #fff; color: #22a34a;
                                border: 1px solid #22a34a; } }
    """
    summary_cls = "summary" if n_passed == n_total else "summary bad"
    summary = (
        f'<div class="{summary_cls}">'
        f"<strong>{n_passed}/{n_total} benchmark passati</strong> "
        f"alle {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(generated_at))}"
        f"</div>"
    )

    body = (
        f"<h1>FEA Pro - Validation Report</h1>"
        f"{summary}"
        + "".join(family_sections)
        + f'<div class="footer">FEA Pro v1.3.0 - Sprint 1. '
          f"Cache TTL: {_cache_ttl_s()} s.</div>"
    )

    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>FEA Pro - Validation Report</title>"
        f"<style>{css}</style></head><body>{body}</body></html>"
    )


def _get_cached_results() -> tuple[list[BenchmarkResult], float]:
    now = time.time()
    ttl = _cache_ttl_s()
    if (
        _REPORT_CACHE["results"] is not None
        and _REPORT_CACHE.get("ttl") == ttl
        and (now - _REPORT_CACHE["ts"]) < ttl
    ):
        return _REPORT_CACHE["results"], _REPORT_CACHE["ts"]
    results = _run_all()
    _REPORT_CACHE["results"] = results
    _REPORT_CACHE["ts"] = now
    _REPORT_CACHE["ttl"] = ttl
    return results, now


@router.get("/report", response_class=HTMLResponse)
def validation_report() -> HTMLResponse:
    results, ts = _get_cached_results()
    return HTMLResponse(content=_render_html(results, ts))


@router.get("/report.json")
def validation_report_json() -> JSONResponse:
    results, ts = _get_cached_results()
    return JSONResponse({
        "generated_at": ts,
        "n_total": len(results),
        "n_passed": sum(1 for r in results if r.passed),
        "results": [r.__dict__ for r in results],
    })


def invalidate_cache_for_tests() -> None:
    _REPORT_CACHE["results"] = None
    _REPORT_CACHE["ts"] = 0.0
    _REPORT_CACHE["ttl"] = None
