"""
Test parser accelerogrammi (PEER NGA, CSV, ESM) + generatori sintetici.
"""
from __future__ import annotations
import math
from pathlib import Path

import pytest

from core.io.accelerogram import (
    AccelerogramRecord,
    parse_peer_at2, parse_csv_accelerogram, parse_esm_ascii, parse_accelerogram,
)
from core.io.synthetic_accel import (
    kanai_tajimi_accelerogram, boore_white_noise_accelerogram,
)


_BACKEND = Path(__file__).resolve().parent.parent
_DATA_DIR = _BACKEND / "data" / "accelerograms"

# v2.3.2 fix CI: i file `synth_*.AT2` vivono in `backend/data/` che è
# gitignored (vedi memory worktree_data_dir.md). I test che li usano
# vengono skippati quando il file non c'è (es. su runner CI fresh).
# In locale, dopo aver copiato la cartella data/ dal repo principale,
# i test girano normalmente.
_KT_FILE = _DATA_DIR / "synth_kt_5hz.AT2"
_NR_FILE = _DATA_DIR / "synth_northridge_like.AT2"
_SKIP_REASON = "Accelerogram fixture file mancante (data/ gitignored)"
needs_kt = pytest.mark.skipif(not _KT_FILE.exists(), reason=_SKIP_REASON)
needs_nr = pytest.mark.skipif(not _NR_FILE.exists(), reason=_SKIP_REASON)


class TestPEERParser:
    @needs_kt
    def test_parse_synthetic_kt_5hz(self):
        f = _DATA_DIR / "synth_kt_5hz.AT2"
        assert f.exists(), "File catalogo deve esistere"
        rec = parse_peer_at2(f)
        assert rec.npts == 1000
        assert rec.dt == pytest.approx(0.01)
        assert rec.source == "PEER"
        assert rec.pga > 0
        assert rec.duration() == pytest.approx(9.99, rel=1e-3)

    @needs_nr
    def test_parse_synthetic_northridge_like(self):
        f = _DATA_DIR / "synth_northridge_like.AT2"
        assert f.exists()
        rec = parse_peer_at2(f)
        assert rec.npts == 2000
        assert rec.dt == pytest.approx(0.005)
        # PGA in m/s² (i dati erano in g, scalati × g)
        assert rec.pga > 0.5  # ≥ ~0.05g

    def test_unknown_header_raises(self, tmp_path: Path):
        f = tmp_path / "bad.AT2"
        f.write_text("HEADER 1\nHEADER 2\nHEADER 3\nHEADER 4\n1.0 2.0 3.0\n")
        with pytest.raises(ValueError):
            parse_peer_at2(f)

    def test_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            parse_peer_at2("/no/such/file.AT2")


class TestCSVParser:
    def test_simple_csv(self, tmp_path: Path):
        f = tmp_path / "acc.csv"
        f.write_text("0.0, 0.0\n0.01, 1.5\n0.02, -1.0\n0.03, 0.5\n")
        rec = parse_csv_accelerogram(f)
        assert rec.npts == 4
        assert rec.dt == pytest.approx(0.01)
        assert rec.samples[1] == pytest.approx(1.5)

    def test_csv_in_g_converts_to_m_s2(self, tmp_path: Path):
        f = tmp_path / "g.csv"
        f.write_text("0.0 0.0\n0.01 1.0\n0.02 0.5\n")
        rec = parse_csv_accelerogram(f, units="g")
        # 1.0 g = 9.80665 m/s²
        assert rec.samples[1] == pytest.approx(9.80665, rel=1e-3)

    def test_csv_with_comments(self, tmp_path: Path):
        f = tmp_path / "c.csv"
        f.write_text("# commento\n# t   a\n0.0 0.0\n0.01 1.0\n")
        rec = parse_csv_accelerogram(f)
        assert rec.npts == 2


class TestESMParser:
    def test_minimal_esm(self, tmp_path: Path):
        f = tmp_path / "esm.ascii"
        f.write_text(
            "EVENT_NAME: TEST\n"
            "STATION_CODE: ABC\n"
            "SAMPLING_INTERVAL_S: 0.005\n"
            "NDATA: 4\n"
            "UNITS: cm/s^2\n"
            "100.0\n"
            "-50.0\n"
            "25.0\n"
            "-10.0\n"
        )
        rec = parse_esm_ascii(f)
        assert rec.npts == 4
        assert rec.dt == 0.005
        # 100 cm/s² = 1 m/s²
        assert rec.samples[0] == pytest.approx(1.0)
        assert rec.meta["EVENT_NAME"] == "TEST"


class TestAutoDetect:
    @needs_kt
    def test_at2_routed_to_peer(self):
        f = _DATA_DIR / "synth_kt_5hz.AT2"
        rec = parse_accelerogram(f)
        assert rec.source == "PEER"

    def test_csv_routed_to_csv(self, tmp_path: Path):
        f = tmp_path / "x.csv"
        f.write_text("0 0\n0.01 1.0\n")
        rec = parse_accelerogram(f)
        assert rec.source == "CSV"


class TestKanaiTajimi:
    def test_pga_normalization_exact(self):
        target_pga = 3.0
        rec = kanai_tajimi_accelerogram(pga=target_pga, dt=0.01, duration=10.0, seed=1)
        assert rec.pga == pytest.approx(target_pga, rel=1e-6)

    def test_reproducibility_with_seed(self):
        r1 = kanai_tajimi_accelerogram(pga=2.0, dt=0.01, duration=5.0, seed=42)
        r2 = kanai_tajimi_accelerogram(pga=2.0, dt=0.01, duration=5.0, seed=42)
        assert r1.samples == r2.samples

    def test_different_seeds_different_output(self):
        r1 = kanai_tajimi_accelerogram(pga=2.0, dt=0.01, duration=5.0, seed=1)
        r2 = kanai_tajimi_accelerogram(pga=2.0, dt=0.01, duration=5.0, seed=2)
        # Almeno qualche campione diverso
        diffs = sum(1 for a, b in zip(r1.samples, r2.samples) if a != b)
        assert diffs > 100

    def test_envelope_decay(self):
        """Dopo t2, l'envelope decade — i campioni in fondo devono essere
        sostanzialmente più piccoli del picco."""
        rec = kanai_tajimi_accelerogram(
            pga=2.0, dt=0.01, duration=15.0,
            t1=1.0, t2=8.0, seed=1,
        )
        peak_window = max(abs(a) for a in rec.samples[100:800])  # ~ fase stazionaria
        tail_window = max(abs(a) for a in rec.samples[-100:])    # ultimi 1s
        assert tail_window < 0.5 * peak_window


class TestBooreWhiteNoise:
    def test_pga_normalization(self):
        rec = boore_white_noise_accelerogram(pga=2.5, dt=0.01, duration=5.0, seed=1)
        assert rec.pga == pytest.approx(2.5, rel=1e-6)


class TestSyntheticAreUsableInSolver:
    """Verifica che gli accelerogrammi sintetici siano accettati dal SeismicTimeHistorySolver."""
    def test_seismic_th_consumes_synthetic(self):
        from schemas import (
            FEAModel, Node, Element, Load, Constraint,
            ElementType, LoadType, ConstraintType,
        )
        from core.solver import SeismicTimeHistorySolver
        # SDOF semplificato
        m = FEAModel(
            id="t", name="t", is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=0, y=2, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
            loads=[Load(id=1, type=LoadType.NODAL_MASS, target_id=2, mass=2000)],
        )
        rec = kanai_tajimi_accelerogram(pga=2.0, dt=0.02, duration=4.0, seed=7)
        r = SeismicTimeHistorySolver(
            m, {"X": rec.time_history()},
            dt=0.02, t_end=4.0, damping_xi=0.05,
        ).solve()
        assert r.max_displacement > 0
