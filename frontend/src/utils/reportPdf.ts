import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FEAModel } from "../types/model";
import type { StaticResults, ModalResults } from "../types/results";

interface ReportPayload {
  model: FEAModel;
  staticResults?: StaticResults | null;
  modalResults?: ModalResults | null;
  viewportPng?: string;
}

export function generateReport({ model, staticResults, modalResults, viewportPng }: ReportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("FEA Pro — Report di analisi", margin, y);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString("it-IT"), margin, y);
  y += 20;

  doc.setDrawColor(180);
  doc.line(margin, y, W - margin, y);
  y += 14;

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Modello", margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const modelRows: [string, string][] = [
    ["Nome", model.name],
    ["Tipo", model.is_3d ? "3D spaziale" : "2D piano"],
    ["Nodi", String(model.nodes.length)],
    ["Elementi", String(model.elements.length)],
    ["Carichi", String(model.loads.length)],
    ["Vincoli", String(model.constraints.length)],
  ];
  if (model.description) modelRows.push(["Descrizione", model.description]);

  autoTable(doc, {
    startY: y,
    head: [["Parametro", "Valore"]],
    body: modelRows,
    theme: "striped",
    headStyles: { fillColor: [0, 212, 255] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4 },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  if (viewportPng) {
    if (y > 600) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Vista 3D", margin, y);
    y += 12;
    try {
      const imgW = W - 2 * margin;
      const imgH = imgW * 0.5625;
      doc.addImage(viewportPng, "PNG", margin, y, imgW, imgH);
      y += imgH + 14;
    } catch { /* ignore image errors */ }
  }

  if (staticResults) {
    if (y > 720) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Analisi statica", margin, y);
    y += 16;

    autoTable(doc, {
      startY: y,
      head: [["Grandezza", "Valore"]],
      body: [
        ["GdL totali", String(staticResults.n_dofs)],
        ["Max spostamento", `${(staticResults.max_displacement * 1000).toFixed(4)} mm`],
        ["Max tensione σ", `${(staticResults.max_stress / 1e6).toFixed(3)} MPa`],
        ["Tempo solver", `${staticResults.solve_time_ms.toFixed(1)} ms`],
      ],
      theme: "striped",
      headStyles: { fillColor: [0, 212, 255] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 4 },
    });
    y = (doc as any).lastAutoTable.finalY + 14;

    const topDisp = [...staticResults.displacements]
      .sort((a, b) => Math.abs(b.uy) + Math.abs(b.ux) + Math.abs(b.uz)
                     - (Math.abs(a.uy) + Math.abs(a.ux) + Math.abs(a.uz)))
      .slice(0, 12);
    autoTable(doc, {
      startY: y,
      head: [["Nodo", "uₓ [mm]", "uᵧ [mm]", "u_z [mm]"]],
      body: topDisp.map((d) => [
        String(d.node_id),
        (d.ux * 1000).toFixed(3),
        (d.uy * 1000).toFixed(3),
        (d.uz * 1000).toFixed(3),
      ]),
      theme: "grid",
      headStyles: { fillColor: [42, 96, 153] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3 },
    });
    y = (doc as any).lastAutoTable.finalY + 14;

    if (staticResults.reactions.length > 0) {
      if (y > 720) { doc.addPage(); y = margin; }
      autoTable(doc, {
        startY: y,
        head: [["Vincolo (nodo)", "Fx [kN]", "Fy [kN]", "Fz [kN]"]],
        body: staticResults.reactions.map((r) => [
          String(r.node_id),
          (r.fx / 1000).toFixed(3),
          (r.fy / 1000).toFixed(3),
          (r.fz / 1000).toFixed(3),
        ]),
        theme: "grid",
        headStyles: { fillColor: [0, 255, 136] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 3 },
      });
      y = (doc as any).lastAutoTable.finalY + 20;
    }
  }

  if (modalResults) {
    if (y > 700) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Analisi modale", margin, y);
    y += 16;
    autoTable(doc, {
      startY: y,
      head: [["Modo", "f [Hz]", "T [s]", "ω [rad/s]", "Mₓ eff [kg]"]],
      body: modalResults.modes.map((m) => [
        String(m.mode),
        m.frequency_hz.toFixed(4),
        m.period.toFixed(4),
        m.omega.toFixed(2),
        m.effective_mass_x.toFixed(1),
      ]),
      theme: "grid",
      headStyles: { fillColor: [255, 102, 204] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3 },
    });
  }

  doc.save(`${model.name.replace(/\s+/g, "_")}_report.pdf`);
}

export function viewportCanvasDataUrl(): string | undefined {
  const canvas = document.querySelector(".absolute canvas") as HTMLCanvasElement | null;
  if (!canvas) return undefined;
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}
