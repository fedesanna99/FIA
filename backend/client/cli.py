"""
FEA Pro CLI — argparse interface al Python client.

Esempi:
    python -m client.cli list-models
    python -m client.cli run-static <model-id>
    python -m client.cli run-modal <model-id> --n-modes 5
    python -m client.cli import-dxf path/to/file.dxf
    python -m client.cli export-xlsx <model-id> out.xlsx --include-static
    python -m client.cli verify-ec3 <model-id>
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

from .feapro_client import FEAProClient, FEAProError


def _ok(d) -> str:
    """Pretty-print JSON-serializable result."""
    return json.dumps(d, indent=2, ensure_ascii=False, default=str)


def cmd_list_models(client: FEAProClient, _args) -> int:
    models = client.list_models()
    print(_ok([{"id": m["id"], "name": m.get("name"),
                 "nodes": len(m.get("nodes", [])),
                 "elements": len(m.get("elements", []))} for m in models]))
    return 0


def cmd_get_model(client: FEAProClient, args) -> int:
    print(_ok(client.get_model(args.model_id)))
    return 0


def cmd_run_static(client: FEAProClient, args) -> int:
    r = client.run_static(args.model_id)
    print(_ok({
        "model_id": r.get("model_id"),
        "max_displacement": r.get("max_displacement"),
        "max_stress": r.get("max_stress"),
        "n_dofs": r.get("n_dofs"),
        "solve_time_ms": r.get("solve_time_ms"),
    }))
    return 0


def cmd_run_modal(client: FEAProClient, args) -> int:
    r = client.run_modal(args.model_id, n_modes=args.n_modes)
    print(_ok({
        "n_modes": r.get("n_modes"),
        "modes": [
            {"mode": m["mode"], "freq_hz": m["frequency_hz"],
              "period": m["period"], "px": m["participation_x"],
              "py": m["participation_y"]}
            for m in r.get("modes", [])
        ],
    }))
    return 0


def cmd_import_dxf(client: FEAProClient, args) -> int:
    m = client.import_dxf(args.file)
    print(_ok({"id": m["id"], "name": m.get("name"),
                "nodes": len(m.get("nodes", [])),
                "elements": len(m.get("elements", []))}))
    return 0


def cmd_export_xlsx(client: FEAProClient, args) -> int:
    out = client.export_xlsx(args.model_id, args.out,
                              include_static=args.include_static)
    print(f"Esportato: {out} ({out.stat().st_size} bytes)")
    return 0


def cmd_verify_ec3(client: FEAProClient, args) -> int:
    r = client.verify_ec3(args.model_id)
    print(_ok(r))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="feapro", description="FEA Pro CLI")
    p.add_argument("--url", default="http://localhost:8000",
                    help="Base URL del server (default: localhost:8000)")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list-models", help="Elenca i modelli sul server")

    sp = sub.add_parser("get-model", help="Stampa un modello per id")
    sp.add_argument("model_id")

    sp = sub.add_parser("run-static", help="Esegue analisi statica")
    sp.add_argument("model_id")

    sp = sub.add_parser("run-modal", help="Esegue analisi modale")
    sp.add_argument("model_id")
    sp.add_argument("--n-modes", type=int, default=5)

    sp = sub.add_parser("import-dxf", help="Importa un file DXF")
    sp.add_argument("file")

    sp = sub.add_parser("export-xlsx", help="Esporta in Excel")
    sp.add_argument("model_id")
    sp.add_argument("out")
    sp.add_argument("--include-static", action="store_true")

    sp = sub.add_parser("verify-ec3", help="Verifica EC3")
    sp.add_argument("model_id")

    return p


_DISPATCH = {
    "list-models": cmd_list_models,
    "get-model": cmd_get_model,
    "run-static": cmd_run_static,
    "run-modal": cmd_run_modal,
    "import-dxf": cmd_import_dxf,
    "export-xlsx": cmd_export_xlsx,
    "verify-ec3": cmd_verify_ec3,
}


def main(argv: list[str] | None = None,
         *, client: FEAProClient | None = None) -> int:
    """Entry-point CLI.

    Args:
        argv   : argomenti (None = sys.argv)
        client : client iniettato (utile per test). Se None, ne crea uno
                 nuovo con la URL passata.
    """
    parser = build_parser()
    args = parser.parse_args(argv)

    owns_client = False
    if client is None:
        client = FEAProClient(base_url=args.url)
        owns_client = True
    try:
        handler = _DISPATCH[args.cmd]
        return handler(client, args)
    except FEAProError as e:
        print(f"Errore: {e}", file=sys.stderr)
        return 2
    except FileNotFoundError as e:
        print(f"File non trovato: {e}", file=sys.stderr)
        return 3
    finally:
        if owns_client:
            client.close()


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
