"""
Generatore di relazione tecnica PDF parametrica (reportlab).

Struttura del report:
    1. Header                  : titolo, modello, data, autore
    2. Sezione 1: Modello       : nodi, elementi (conteggi e tabella)
    3. Sezione 2: Carichi        : tabella loads
    4. Sezione 3: Vincoli        : tabella constraints
    5. Sezione 4: Risultati statici (opz.) : freccia max, n_dofs, top 10 nodi
    6. Sezione 5: Modi (opz.)    : f_n, periodo, partecipazione
    7. Footer                   : pagina X di N

Stili: A4 portrait, margini 2cm, Helvetica 9pt base.
"""
from __future__ import annotations
from pathlib import Path
from datetime import datetime
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)

from schemas import FEAModel
from schemas.results import StaticResults, ModalResults


_HEADER_BG = colors.HexColor("#305496")
_ROW_ALT = colors.HexColor("#F2F2F2")


def _make_styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(
        name="H1",
        parent=base["Heading1"],
        textColor=colors.white,
        backColor=_HEADER_BG,
        leftIndent=0, rightIndent=0,
        spaceBefore=4, spaceAfter=8,
        leading=22, fontSize=18,
        borderPadding=(6, 6, 6, 6),
    ))
    base.add(ParagraphStyle(
        name="H2",
        parent=base["Heading2"],
        textColor=_HEADER_BG,
        fontSize=14, leading=18,
        spaceBefore=12, spaceAfter=6,
    ))
    base.add(ParagraphStyle(
        name="Body9",
        parent=base["BodyText"],
        fontSize=9, leading=12,
    ))
    return base


def _table_style() -> TableStyle:
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _ROW_ALT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ])


def _model_summary_table(model: FEAModel) -> Table:
    rows = [
        ["Campo", "Valore"],
        ["Model ID", model.id],
        ["Nome", model.name or ""],
        ["Descrizione", model.description or ""],
        ["Unità", model.units],
        ["3D", "Sì" if model.is_3d else "No"],
        ["N° nodi", str(len(model.nodes))],
        ["N° elementi", str(len(model.elements))],
        ["N° vincoli", str(len(model.constraints))],
        ["N° carichi", str(len(model.loads))],
    ]
    t = Table(rows, colWidths=[5 * cm, 11 * cm])
    t.setStyle(_table_style())
    return t


def _nodes_table(model: FEAModel, max_rows: int = 50) -> Table:
    rows = [["id", "x", "y", "z", "label"]]
    for n in model.nodes[:max_rows]:
        rows.append([str(n.id), f"{n.x:.3f}", f"{n.y:.3f}", f"{n.z:.3f}",
                      n.label or ""])
    if len(model.nodes) > max_rows:
        rows.append([f"... +{len(model.nodes) - max_rows} righe", "", "", "", ""])
    t = Table(rows, colWidths=[1.5 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm, 7 * cm])
    t.setStyle(_table_style())
    return t


def _elements_table(model: FEAModel, max_rows: int = 50) -> Table:
    rows = [["id", "type", "nodes", "material", "section"]]
    for e in model.elements[:max_rows]:
        rows.append([
            str(e.id), e.type.value,
            ", ".join(str(n) for n in e.nodes),
            e.material_id, e.section_id or "",
        ])
    if len(model.elements) > max_rows:
        rows.append([f"... +{len(model.elements) - max_rows} righe", "", "", "", ""])
    t = Table(rows, colWidths=[1.5 * cm, 2 * cm, 4 * cm, 4 * cm, 4.5 * cm])
    t.setStyle(_table_style())
    return t


def _loads_table(model: FEAModel) -> Table:
    if not model.loads:
        return Table([["Nessun carico applicato"]],
                      colWidths=[16 * cm])
    rows = [["id", "type", "target", "fy", "qy", "mz", "label"]]
    for l in model.loads:
        rows.append([str(l.id), l.type.value, str(l.target_id),
                      f"{l.fy:.2f}", f"{l.qy:.2f}", f"{l.mz:.2f}",
                      l.label or ""])
    t = Table(rows, colWidths=[1.2 * cm, 2 * cm, 1.5 * cm, 2.3 * cm,
                                  2.3 * cm, 2.3 * cm, 4.4 * cm])
    t.setStyle(_table_style())
    return t


def _constraints_table(model: FEAModel) -> Table:
    if not model.constraints:
        return Table([["Nessun vincolo applicato"]],
                      colWidths=[16 * cm])
    rows = [["id", "type", "node", "compression_only", "label"]]
    for c in model.constraints:
        rows.append([str(c.id), c.type.value, str(c.node_id),
                      "Sì" if c.compression_only else "No",
                      c.label or ""])
    t = Table(rows, colWidths=[1.5 * cm, 2.5 * cm, 2 * cm, 3 * cm, 7 * cm])
    t.setStyle(_table_style())
    return t


def _static_results_section(results: StaticResults, top_n: int = 10):
    elements = []
    summary = [
        ["max displacement", f"{results.max_displacement:.4e} m"],
        ["max stress", f"{results.max_stress:.4e} Pa"],
        ["n DOFs", str(results.n_dofs)],
        ["solve time", f"{results.solve_time_ms:.1f} ms"],
    ]
    t = Table([["Metrica", "Valore"]] + summary,
              colWidths=[5 * cm, 11 * cm])
    t.setStyle(_table_style())
    elements.append(t)
    elements.append(Spacer(1, 0.3 * cm))

    # Top N displacements by magnitude
    top = sorted(
        results.displacements,
        key=lambda d: (d.ux * d.ux + d.uy * d.uy + d.uz * d.uz),
        reverse=True,
    )[:top_n]
    if top:
        rows = [["node_id", "ux", "uy", "uz"]]
        for d in top:
            rows.append([str(d.node_id),
                          f"{d.ux:.3e}", f"{d.uy:.3e}", f"{d.uz:.3e}"])
        tt = Table(rows, colWidths=[3 * cm, 4.3 * cm, 4.3 * cm, 4.3 * cm])
        tt.setStyle(_table_style())
        elements.append(tt)
    return elements


def _modal_results_section(results: ModalResults):
    rows = [["Modo", "f [Hz]", "T [s]", "ω [rad/s]",
              "Px", "Py", "Pz"]]
    for m in results.modes[:10]:
        rows.append([
            str(m.mode), f"{m.frequency_hz:.3f}", f"{m.period:.3f}",
            f"{m.omega:.2f}",
            f"{m.participation_x:.2f}",
            f"{m.participation_y:.2f}",
            f"{m.participation_z:.2f}",
        ])
    t = Table(rows, colWidths=[1.5 * cm, 2.3 * cm, 2.3 * cm, 2.5 * cm,
                                  2.5 * cm, 2.5 * cm, 2.5 * cm])
    t.setStyle(_table_style())
    return [t]


def generate_report(
    model: FEAModel,
    file_path: str | Path,
    *,
    static_results: Optional[StaticResults] = None,
    modal_results: Optional[ModalResults] = None,
    author: str = "FEA Pro",
    title: Optional[str] = None,
) -> Path:
    """Genera il PDF della relazione e ritorna il path.

    Args:
        model            : FEAModel
        file_path        : path .pdf di output
        static_results   : opz., aggiunge sezione statica
        modal_results    : opz., aggiunge sezione modale
        author           : autore
        title            : titolo (default: "Relazione FEA — <model.name>")
    """
    file_path = Path(file_path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    styles = _make_styles()
    doc = SimpleDocTemplate(
        str(file_path), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title=title or f"FEA Report — {model.name or model.id}",
        author=author,
    )
    story = []
    full_title = title or f"Relazione FEA — {model.name or model.id}"
    story.append(Paragraph(full_title, styles["H1"]))
    story.append(Paragraph(
        f"Generato il {datetime.now().strftime('%d/%m/%Y %H:%M')} "
        f"da {author}.",
        styles["Body9"],
    ))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("1. Riassunto modello", styles["H2"]))
    story.append(_model_summary_table(model))
    story.append(Spacer(1, 0.5 * cm))

    if model.nodes:
        story.append(Paragraph("2. Nodi", styles["H2"]))
        story.append(_nodes_table(model))
        story.append(Spacer(1, 0.5 * cm))

    if model.elements:
        story.append(Paragraph("3. Elementi", styles["H2"]))
        story.append(_elements_table(model))
        story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("4. Vincoli", styles["H2"]))
    story.append(_constraints_table(model))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("5. Carichi", styles["H2"]))
    story.append(_loads_table(model))
    story.append(Spacer(1, 0.5 * cm))

    if static_results is not None:
        story.append(PageBreak())
        story.append(Paragraph("6. Risultati analisi statica", styles["H2"]))
        story.extend(_static_results_section(static_results))

    if modal_results is not None:
        story.append(PageBreak())
        story.append(Paragraph("7. Risultati analisi modale", styles["H2"]))
        story.extend(_modal_results_section(modal_results))

    doc.build(story)
    return file_path
