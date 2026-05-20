"""
Modulo I/O — import/export verso formati BIM/CAD esterni.

Supportati:
    - DXF (AutoCAD 2000+)        via ezdxf
    - IFC (IFC4 schema)          via ifcopenshell

Convenzione round-trip:
    Un FEAModel esportato in DXF/IFC e poi reimportato deve produrre
    lo stesso numero di nodi/elementi (a meno di rinumerazione) e la
    stessa connettività topologica. Le proprietà non rappresentabili
    nel formato esterno (materiali custom, vincoli SPRING con
    compression_only, carichi, ecc.) vanno persi e vanno rigenerati
    lato utente.
"""
from .dxf_importer import import_dxf
from .dxf_exporter import export_dxf
from .ifc_importer import import_ifc
from .ifc_exporter import export_ifc
from .excel_export import export_excel
from .pdf_report import generate_report as export_pdf

__all__ = [
    "import_dxf", "export_dxf",
    "import_ifc", "export_ifc",
    "export_excel",
    "export_pdf",
]
