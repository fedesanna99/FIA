"""
Parser e utility per accelerogrammi sismici.

Formati supportati:
    - PEER NGA West / NGA West2 (.AT2)
        Header di ~4 righe testuali, poi blocco "NPTS=..., DT=..." e n valori
        di accelerazione (typically uno per riga o N per riga, in g).
    - Plain CSV (t, a)   — fallback, 2 colonne separate da virgola/spazio.
    - ESM (.ascii)       — header ASCII con campi key/value, dati 1 colonna.

Output:
    AccelerogramRecord — dataclass con metadati + lista [(t, a)] in m/s².
    Convenzione: t in secondi, a in m/s² (NON in g).
"""
from __future__ import annotations
from dataclasses import dataclass, field
from pathlib import Path
import re

_G = 9.80665  # m/s²


@dataclass
class AccelerogramRecord:
    """Record di accelerogramma normalizzato."""
    name: str
    dt: float                              # passo temporale [s]
    npts: int                              # numero di punti
    samples: list[float] = field(default_factory=list)  # accelerazioni [m/s²]
    units: str = "m/s^2"                   # unità degli `samples`
    pga: float = 0.0                       # peak ground acceleration [m/s²]
    source: str = ""                       # formato sorgente (PEER, ESM, CSV)
    meta: dict[str, str] = field(default_factory=dict)

    def time_history(self) -> list[tuple[float, float]]:
        """Restituisce la time-history come [(t, a)] in m/s²."""
        return [(i * self.dt, a) for i, a in enumerate(self.samples)]

    def duration(self) -> float:
        return (self.npts - 1) * self.dt if self.npts > 0 else 0.0


def _read_text(path: str | Path) -> list[str]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File non trovato: {path}")
    return p.read_text(encoding="utf-8", errors="ignore").splitlines()


def parse_peer_at2(path: str | Path) -> AccelerogramRecord:
    """Parser PEER NGA .AT2.

    Convenzioni:
        - Le prime 3-4 righe sono header testuale.
        - La 4ª riga contiene "NPTS= NNN, DT= 0.0050 SEC, ..." (case-insensitive).
        - Dati in g (accelerazione di gravità).
    """
    lines = _read_text(path)
    if len(lines) < 5:
        raise ValueError("File troppo corto per essere PEER NGA")

    # Cerca header con NPTS / DT
    npts = None
    dt = None
    header_line = -1
    for i, line in enumerate(lines[:6]):
        m_npts = re.search(r"NPTS\s*=\s*(\d+)", line, re.IGNORECASE)
        m_dt = re.search(r"DT\s*=\s*([0-9.eE+-]+)", line, re.IGNORECASE)
        if m_npts and m_dt:
            npts = int(m_npts.group(1))
            dt = float(m_dt.group(1))
            header_line = i
            break

    if npts is None or dt is None:
        raise ValueError("Header PEER NGA non riconosciuto (manca NPTS o DT)")

    # I dati partono dalla riga successiva all'header
    samples_g: list[float] = []
    for line in lines[header_line + 1:]:
        line = line.strip()
        if not line:
            continue
        tokens = re.split(r"[\s,]+", line)
        for tok in tokens:
            if not tok:
                continue
            try:
                samples_g.append(float(tok))
            except ValueError:
                # Linea non numerica: ignora (probabilmente footer commento)
                continue

    if len(samples_g) < npts:
        raise ValueError(
            f"Dati insufficienti: attesi {npts}, trovati {len(samples_g)}"
        )
    # Tronca a npts esatti
    samples_g = samples_g[:npts]
    # Converti da g a m/s²
    samples = [a * _G for a in samples_g]
    name = Path(path).stem

    return AccelerogramRecord(
        name=name, dt=dt, npts=npts, samples=samples,
        units="m/s^2",
        pga=max(abs(a) for a in samples) if samples else 0.0,
        source="PEER",
        meta={"header": lines[header_line]},
    )


def parse_csv_accelerogram(
    path: str | Path,
    *,
    units: str = "m/s^2",
    skip_header: int = 0,
) -> AccelerogramRecord:
    """Parser CSV/TSV semplice (t, a) — utile per file custom.

    Args:
        units      : 'm/s^2' (default) o 'g' (auto-converte).
        skip_header: numero di righe da saltare in testa.
    """
    lines = _read_text(path)[skip_header:]
    ts: list[float] = []
    accs: list[float] = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        toks = re.split(r"[\s,;]+", line)
        if len(toks) < 2:
            continue
        try:
            ts.append(float(toks[0]))
            accs.append(float(toks[1]))
        except ValueError:
            continue
    if len(ts) < 2:
        raise ValueError("CSV non contiene almeno 2 righe di dati")
    dt = ts[1] - ts[0]
    # Verifica passo uniforme (entro tolleranza)
    if any(abs((ts[i + 1] - ts[i]) - dt) > 1e-6 for i in range(len(ts) - 1)):
        # Non uniforme — il caller potrebbe avere bisogno di resampling
        pass
    if units.lower() == "g":
        accs = [a * _G for a in accs]
    name = Path(path).stem
    return AccelerogramRecord(
        name=name, dt=dt, npts=len(accs), samples=accs,
        units="m/s^2",
        pga=max(abs(a) for a in accs),
        source="CSV",
    )


def parse_esm_ascii(path: str | Path) -> AccelerogramRecord:
    """Parser ESM ascii (Engineering Strong-Motion).

    Header: righe "KEY: VALUE", concluso da una riga vuota o da inizio dati.
    Campi rilevanti: SAMPLING_INTERVAL_S, NDATA, UNITS (cm/s^2 standard).
    """
    lines = _read_text(path)
    meta: dict[str, str] = {}
    data_start = -1
    for i, line in enumerate(lines):
        m = re.match(r"^([A-Z0-9_]+)\s*[:=]\s*(.*?)\s*$", line)
        if m:
            meta[m.group(1).upper()] = m.group(2)
        else:
            # Possibile inizio dati: prova a parsare come numero
            try:
                float(line.strip())
                data_start = i
                break
            except ValueError:
                continue
    if data_start < 0:
        raise ValueError("ESM: dati non trovati")

    dt_s = float(meta.get("SAMPLING_INTERVAL_S", meta.get("DT", "0.01")))
    npts = int(meta.get("NDATA", meta.get("NPTS", "0")))
    units = meta.get("UNITS", "cm/s^2").lower()
    factor = 0.01 if "cm" in units else (_G if units == "g" else 1.0)

    samples: list[float] = []
    for line in lines[data_start:]:
        line = line.strip()
        if not line:
            continue
        try:
            samples.append(float(line) * factor)
        except ValueError:
            continue
    if npts == 0:
        npts = len(samples)
    samples = samples[:npts]
    name = Path(path).stem
    return AccelerogramRecord(
        name=name, dt=dt_s, npts=npts, samples=samples,
        units="m/s^2",
        pga=max(abs(a) for a in samples) if samples else 0.0,
        source="ESM",
        meta=meta,
    )


def parse_accelerogram(path: str | Path) -> AccelerogramRecord:
    """Auto-detect del formato basato sull'estensione e sul contenuto."""
    p = Path(path)
    ext = p.suffix.lower()
    if ext == ".at2":
        return parse_peer_at2(p)
    if ext in (".csv", ".tsv", ".txt"):
        # Probabile CSV; se inizia con NPTS/DT è PEER mascherato
        first = _read_text(p)[:5]
        if any("NPTS" in l.upper() and "DT" in l.upper() for l in first):
            return parse_peer_at2(p)
        return parse_csv_accelerogram(p)
    if ext in (".ascii", ".asc"):
        return parse_esm_ascii(p)
    # Fallback: prova PEER, poi CSV
    try:
        return parse_peer_at2(p)
    except Exception:
        return parse_csv_accelerogram(p)
