"""
Test I/O DXF — round-trip integrity.

Strategia:
    Per ogni geometria di prova, esportiamo in DXF, reimportiamo, e
    verifichiamo che il numero di nodi/elementi sia conservato e che le
    coordinate dei nodi coincidano (a meno di permutazione di id).
"""
from __future__ import annotations
import tempfile
from pathlib import Path

import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.io import import_dxf, export_dxf


def _coord_set(model: FEAModel) -> set[tuple[float, float, float]]:
    """Set di coordinate (per confronto invariante a id remapping)."""
    return {(round(n.x, 6), round(n.y, 6), round(n.z, 6)) for n in model.nodes}


def _seg_set(model: FEAModel) -> set[frozenset]:
    """Set di segmenti (frozenset di coordinate dei 2 endpoint)."""
    nbyid = {n.id: n for n in model.nodes}
    out = set()
    for e in model.elements:
        if len(e.nodes) >= 2:
            p1 = nbyid[e.nodes[0]]
            p2 = nbyid[e.nodes[1]]
            k1 = (round(p1.x, 6), round(p1.y, 6), round(p1.z, 6))
            k2 = (round(p2.x, 6), round(p2.y, 6), round(p2.z, 6))
            out.add(frozenset({k1, k2}))
    return out


class TestDXFRoundTripBasic:
    def test_single_beam_round_trip(self, tmp_path: Path):
        m = FEAModel(
            id="rt1", name="single", is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=4, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[], loads=[],
        )
        p = tmp_path / "one.dxf"
        export_dxf(m, p)
        assert p.exists() and p.stat().st_size > 0

        m2 = import_dxf(p)
        assert len(m2.nodes) == 2
        assert len(m2.elements) == 1
        assert _coord_set(m) == _coord_set(m2)
        assert _seg_set(m) == _seg_set(m2)

    def test_chain_3_nodes_2_elements(self, tmp_path: Path):
        m = FEAModel(
            id="rt2", name="chain", is_3d=False,
            nodes=[Node(id=i, x=2.5 * i, y=0, z=0) for i in range(1, 4)],
            elements=[
                Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                        material_id="steel_s355", section_id="ipe_300"),
                Element(id=2, type=ElementType.BEAM2D, nodes=[2, 3],
                        material_id="steel_s355", section_id="ipe_300"),
            ],
            constraints=[], loads=[],
        )
        p = tmp_path / "chain.dxf"
        export_dxf(m, p)
        m2 = import_dxf(p)
        # Il nodo condiviso 2 va deduplicato → 3 nodi, 2 segmenti
        assert len(m2.nodes) == 3
        assert len(m2.elements) == 2
        assert _coord_set(m) == _coord_set(m2)
        assert _seg_set(m) == _seg_set(m2)

    def test_3d_frame_round_trip(self, tmp_path: Path):
        # Portale 3D semplice: 4 colonne + 1 trave
        m = FEAModel(
            id="rt3", name="frame3d", is_3d=True,
            nodes=[
                Node(id=1, x=0, y=0, z=0),
                Node(id=2, x=0, y=0, z=3),
                Node(id=3, x=4, y=0, z=3),
                Node(id=4, x=4, y=0, z=0),
            ],
            elements=[
                Element(id=1, type=ElementType.BEAM3D, nodes=[1, 2],
                        material_id="steel_s355", section_id="hea_200"),
                Element(id=2, type=ElementType.BEAM3D, nodes=[2, 3],
                        material_id="steel_s355", section_id="ipe_300"),
                Element(id=3, type=ElementType.BEAM3D, nodes=[3, 4],
                        material_id="steel_s355", section_id="hea_200"),
            ],
            constraints=[], loads=[],
        )
        p = tmp_path / "frame.dxf"
        export_dxf(m, p)
        m2 = import_dxf(p, force_3d=True)
        assert m2.is_3d is True
        assert len(m2.nodes) == 4
        assert len(m2.elements) == 3
        assert _coord_set(m) == _coord_set(m2)
        assert _seg_set(m) == _seg_set(m2)


class TestDXFImportRobustness:
    def test_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            import_dxf("/no/such/path/nope.dxf")

    def test_default_material_and_section(self, tmp_path: Path):
        m = FEAModel(
            id="rt4", name="dummy", is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[], loads=[],
        )
        p = tmp_path / "x.dxf"
        export_dxf(m, p)
        m2 = import_dxf(p, material_id="steel_s275", section_id="ipe_200")
        assert all(e.material_id == "steel_s275" for e in m2.elements)
        assert all(e.section_id == "ipe_200" for e in m2.elements)

    def test_z_autodetect_3d(self, tmp_path: Path):
        """Con z != 0 e force_3d=None, deve riconoscere is_3d=True."""
        m = FEAModel(
            id="rt5", name="z", is_3d=True,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=0, y=0, z=5)],
            elements=[Element(id=1, type=ElementType.BEAM3D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[], loads=[],
        )
        p = tmp_path / "z.dxf"
        export_dxf(m, p)
        m2 = import_dxf(p)  # autodetect
        assert m2.is_3d is True
        assert m2.elements[0].type == ElementType.BEAM3D

    def test_planar_autodetect_2d(self, tmp_path: Path):
        """Con z=0 ovunque, autodetect deve dare is_3d=False."""
        m = FEAModel(
            id="rt6", name="plan", is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=3, y=2, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[], loads=[],
        )
        p = tmp_path / "plan.dxf"
        export_dxf(m, p)
        m2 = import_dxf(p)
        assert m2.is_3d is False
        assert m2.elements[0].type == ElementType.BEAM2D


class TestDXFExportContentAcceptance:
    def test_exporter_creates_layers(self, tmp_path: Path):
        """Verifica che il DXF prodotto contenga i layer attesi."""
        import ezdxf
        m = FEAModel(
            id="lay", name="lay", is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
            loads=[Load(id=1, type=LoadType.NODAL, target_id=2, fy=-1000.0)],
        )
        p = tmp_path / "layers.dxf"
        export_dxf(m, p)

        doc = ezdxf.readfile(str(p))
        layer_names = {l.dxf.name for l in doc.layers}
        assert "FEA_NODES" in layer_names
        assert "FEA_BEAMS" in layer_names
        assert "FEA_CONSTRAINTS" in layer_names
        assert "FEA_LOADS" in layer_names

    def test_exporter_writes_lines(self, tmp_path: Path):
        """Conta che il DXF contenga esattamente N LINE entità."""
        import ezdxf
        m = FEAModel(
            id="ln", name="ln", is_3d=False,
            nodes=[Node(id=i, x=i, y=0, z=0) for i in range(1, 5)],
            elements=[
                Element(id=i, type=ElementType.BEAM2D, nodes=[i, i + 1],
                        material_id="steel_s355", section_id="ipe_300")
                for i in range(1, 4)
            ],
            constraints=[], loads=[],
        )
        p = tmp_path / "lines.dxf"
        export_dxf(m, p)
        doc = ezdxf.readfile(str(p))
        n_lines = sum(1 for _ in doc.modelspace().query("LINE"))
        assert n_lines == 3, f"Atteso 3 LINE, trovati {n_lines}"


# ────────────────────────────────────────────────────────────────────────────
# BL-8 · Layer DXF → material/section mapping
# ────────────────────────────────────────────────────────────────────────────

class TestDXFLayerMapping:
    """L'utente può associare un layer DXF a un materiale/sezione specifici."""

    def _make_two_layer_dxf(self, path: Path) -> None:
        """Crea a mano un DXF con 2 LINE su 2 layer distinti."""
        import ezdxf
        doc = ezdxf.new(dxfversion="R2010")
        doc.layers.add(name="COLONNE", color=1)
        doc.layers.add(name="TRAVI_LEGNO", color=4)
        msp = doc.modelspace()
        msp.add_line((0.0, 0.0, 0.0), (0.0, 3.0, 0.0), dxfattribs={"layer": "COLONNE"})
        msp.add_line((0.0, 3.0, 0.0), (4.0, 3.0, 0.0), dxfattribs={"layer": "TRAVI_LEGNO"})
        doc.saveas(str(path))

    def test_layer_material_map_applied(self, tmp_path: Path):
        p = tmp_path / "two_layer.dxf"
        self._make_two_layer_dxf(p)

        m = import_dxf(
            p,
            material_id="steel_s355",  # default per layer fuori mappatura
            section_id="ipe_300",
            layer_material_map={
                "COLONNE":     "steel_s355",
                "TRAVI_LEGNO": "timber_c24",
            },
            layer_section_map={
                "COLONNE":     "hea_240",
                "TRAVI_LEGNO": "rect_200x300",
            },
        )
        # 2 segmenti → 2 elementi
        assert len(m.elements) == 2
        mats = {e.material_id for e in m.elements}
        secs = {e.section_id for e in m.elements}
        assert mats == {"steel_s355", "timber_c24"}
        assert secs == {"hea_240", "rect_200x300"}

    def test_layer_map_fallback_to_default(self, tmp_path: Path):
        """Layer non in mappa → usa material_id/section_id di default."""
        p = tmp_path / "two_layer.dxf"
        self._make_two_layer_dxf(p)

        m = import_dxf(
            p,
            material_id="steel_s275",
            section_id="ipe_200",
            layer_material_map={"COLONNE": "steel_s355"},  # solo 1 layer mappato
        )
        # Trova l'elemento sul layer TRAVI_LEGNO → dovrebbe avere default
        # (Non possiamo distinguere per layer dopo import; controlliamo solo
        # che entrambi i material_id consentiti compaiano.)
        mats = {e.material_id for e in m.elements}
        assert mats == {"steel_s355", "steel_s275"}, (
            f"Atteso mix mappato/default, ottenuto: {mats}"
        )
        # Section: nessuna mappa → tutti default
        assert all(e.section_id == "ipe_200" for e in m.elements)

    def test_no_map_uses_defaults_everywhere(self, tmp_path: Path):
        """Senza mappa, tutti gli elementi ricevono i default."""
        p = tmp_path / "two_layer.dxf"
        self._make_two_layer_dxf(p)
        m = import_dxf(p, material_id="steel_s355", section_id="ipe_300")
        assert all(e.material_id == "steel_s355" for e in m.elements)
        assert all(e.section_id == "ipe_300" for e in m.elements)
