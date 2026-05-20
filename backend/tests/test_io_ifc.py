"""
Test I/O IFC — round-trip integrity.

Strategia analoga a DXF: export → re-import, verifica nodi e segmenti.
"""
from __future__ import annotations
from pathlib import Path

import pytest

from schemas import FEAModel, Node, Element, ElementType
from core.io import import_ifc, export_ifc


def _coord_set(model: FEAModel) -> set[tuple[float, float, float]]:
    return {(round(n.x, 4), round(n.y, 4), round(n.z, 4)) for n in model.nodes}


def _seg_set(model: FEAModel) -> set[frozenset]:
    nbyid = {n.id: n for n in model.nodes}
    out = set()
    for e in model.elements:
        if len(e.nodes) >= 2:
            p1 = nbyid[e.nodes[0]]
            p2 = nbyid[e.nodes[1]]
            k1 = (round(p1.x, 4), round(p1.y, 4), round(p1.z, 4))
            k2 = (round(p2.x, 4), round(p2.y, 4), round(p2.z, 4))
            out.add(frozenset({k1, k2}))
    return out


class TestIFCRoundTripBasic:
    def test_single_beam_round_trip(self, tmp_path: Path):
        m = FEAModel(
            id="i1", name="single", is_3d=True,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=4, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM3D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[], loads=[],
        )
        p = tmp_path / "one.ifc"
        export_ifc(m, p)
        assert p.exists() and p.stat().st_size > 0

        m2 = import_ifc(p)
        assert m2.is_3d is True
        assert len(m2.nodes) == 2
        assert len(m2.elements) == 1
        assert _coord_set(m) == _coord_set(m2)
        assert _seg_set(m) == _seg_set(m2)

    def test_chain_3d_with_column_and_beam(self, tmp_path: Path):
        """Portale 3D: 2 colonne + 1 trave."""
        m = FEAModel(
            id="i2", name="portal", is_3d=True,
            nodes=[
                Node(id=1, x=0, y=0, z=0),
                Node(id=2, x=0, y=0, z=3),
                Node(id=3, x=5, y=0, z=3),
                Node(id=4, x=5, y=0, z=0),
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
        p = tmp_path / "portal.ifc"
        export_ifc(m, p)
        m2 = import_ifc(p)
        assert len(m2.nodes) == 4
        assert len(m2.elements) == 3
        assert _coord_set(m) == _coord_set(m2)
        assert _seg_set(m) == _seg_set(m2)

    def test_truss_exports_as_member(self, tmp_path: Path):
        """TRUSS3D → IfcMember; re-import lo mappa comunque su BEAM3D."""
        m = FEAModel(
            id="i3", name="truss", is_3d=True,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=2, y=2, z=0)],
            elements=[Element(id=1, type=ElementType.TRUSS3D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[], loads=[],
        )
        p = tmp_path / "truss.ifc"
        export_ifc(m, p)
        m2 = import_ifc(p)
        assert len(m2.elements) == 1
        # Re-import su BEAM3D (default per ogni IfcMember/IfcBeam)
        assert m2.elements[0].type == ElementType.BEAM3D


class TestIFCImportRobustness:
    def test_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            import_ifc("/no/such/path/no.ifc")

    def test_default_overrides_propagated(self, tmp_path: Path):
        m = FEAModel(
            id="i4", name="d", is_3d=True,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM3D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[], loads=[],
        )
        p = tmp_path / "x.ifc"
        export_ifc(m, p)
        m2 = import_ifc(p, material_id="steel_s420", section_id="heb_200")
        assert all(e.material_id == "steel_s420" for e in m2.elements)
        assert all(e.section_id == "heb_200" for e in m2.elements)


class TestIFCFileStructure:
    def test_export_creates_project_hierarchy(self, tmp_path: Path):
        """Verifica che l'IFC scritto contenga IfcProject/Building/Storey."""
        import ifcopenshell
        m = FEAModel(
            id="i5", name="h", is_3d=True,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM3D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[], loads=[],
        )
        p = tmp_path / "h.ifc"
        export_ifc(m, p)
        ifc = ifcopenshell.open(str(p))
        assert len(ifc.by_type("IfcProject")) == 1
        assert len(ifc.by_type("IfcBuilding")) >= 1
        assert len(ifc.by_type("IfcBuildingStorey")) >= 1
        assert len(ifc.by_type("IfcBeam")) == 1
