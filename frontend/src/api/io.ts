/**
 * API I/O — import/export DXF, IFC, XLSX, PDF + catalogo accelerogrammi.
 * Tutte le route sotto `/api/io/*`.
 */
import { api } from "./client";
import type { FEAModel } from "../types/model";

// ── Import ───────────────────────────────────────────────────────────────────

export interface ImportResponse {
  model: FEAModel;
  warnings: string[];
}

/** Import DXF (LINE/POLYLINE → BEAM2D/BEAM3D). Vedi backend `core/io/dxf_importer.py`. */
export async function importDxf(file: File, opts?: {
  material_id?: string;
  section_id?: string;
  /** Mapping layer DXF → material_id (BL-8). */
  layer_material_map?: Record<string, string>;
  /** Mapping layer DXF → section_id (BL-8). */
  layer_section_map?: Record<string, string>;
  /** Tolleranza dedupe nodi (default 1e-6 m). */
  tol?: number;
}): Promise<ImportResponse> {
  const fd = new FormData();
  fd.append("file", file);
  if (opts?.material_id) fd.append("material_id", opts.material_id);
  if (opts?.section_id)  fd.append("section_id",  opts.section_id);
  if (opts?.tol != null) fd.append("tol",         String(opts.tol));
  if (opts?.layer_material_map)
    fd.append("layer_material_map", JSON.stringify(opts.layer_material_map));
  if (opts?.layer_section_map)
    fd.append("layer_section_map", JSON.stringify(opts.layer_section_map));
  const r = await api.post<ImportResponse>("/api/io/import/dxf", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
}

/** Import IFC4 (IfcBeam/IfcColumn/IfcMember). Vedi backend `core/io/ifc_importer.py`. */
export async function importIfc(file: File): Promise<ImportResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await api.post<ImportResponse>("/api/io/import/ifc", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
}

// ── Export server-side ───────────────────────────────────────────────────────

/** Scarica come Blob l'export server (DXF/IFC/XLSX/PDF). */
async function downloadBlob(url: string, filename: string): Promise<void> {
  const r = await api.get<Blob>(url, { responseType: "blob" });
  const blob = r.data;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export const exportApi = {
  /** Export DXF con layer FEA_NODES, FEA_BEAMS, FEA_SHELLS, FEA_CONSTRAINTS, FEA_LOADS. */
  dxf: (modelId: string, modelName: string) =>
    downloadBlob(`/api/io/export/${modelId}/dxf`, `${modelName}.dxf`),

  /** Export IFC4 con gerarchia Project/Site/Building/Storey. */
  ifc: (modelId: string, modelName: string) =>
    downloadBlob(`/api/io/export/${modelId}/ifc`, `${modelName}.ifc`),

  /** Export Excel multi-sheet (5-8 sheet: Summary, Nodes, Elements, Loads, Constraints, Displacements, Reactions, ElementForces, Modes). */
  xlsx: (modelId: string, modelName: string, opts?: { include_static?: boolean; include_modal?: boolean }) => {
    const q = new URLSearchParams();
    if (opts?.include_static) q.set("include_static", "true");
    if (opts?.include_modal)  q.set("include_modal", "true");
    const qs = q.toString() ? `?${q}` : "";
    return downloadBlob(`/api/io/export/${modelId}/xlsx${qs}`, `${modelName}.xlsx`);
  },

  /** Export PDF report parametrico reportlab — 7 sezioni con tabelle stilizzate. */
  pdf: (modelId: string, modelName: string, opts?: { include_static?: boolean; include_modal?: boolean }) => {
    const q = new URLSearchParams();
    if (opts?.include_static) q.set("include_static", "true");
    if (opts?.include_modal)  q.set("include_modal", "true");
    const qs = q.toString() ? `?${q}` : "";
    return downloadBlob(`/api/io/export/${modelId}/pdf${qs}`, `${modelName}.pdf`);
  },
};

// ── Catalogo accelerogrammi (FASE 13) ────────────────────────────────────────

export interface AccelerogramMeta {
  name: string;
  filename: string;
  dt: number;
  npts: number;
  duration_s: number;
  pga_m_s2: number;
  source: "PEER" | "ESM" | "CSV" | "SYNTHETIC";
}

export interface AccelerogramData extends AccelerogramMeta {
  /** Time-history come array di tuple [t, a]. */
  time_history: [number, number][];
}

export interface SyntheticAccelOptions {
  /** Algoritmo: Kanai-Tajimi o Boore (white-noise filtrato). */
  algorithm: "kanai_tajimi" | "boore";
  /** Durata totale [s]. */
  duration: number;
  /** Passo temporale [s]. */
  dt: number;
  /** Frequenza dominante del filtro [Hz]. */
  omega_g_hz?: number;
  /** Damping del filtro. */
  zeta_g?: number;
  /** PGA target [m/s²]. */
  pga_target?: number;
  /** Seed PRNG per riproducibilità. */
  seed?: number;
}

export const accelerogramsApi = {
  /** Lista catalogo accelerogrammi disponibili (PEER NGA + ESM + sintetici). */
  list: () =>
    api.get<{ items: AccelerogramMeta[] }>("/api/io/accelerograms")
       .then(r => r.data.items),

  /** Scarica singolo accelerogramma con time-history completa. */
  get: (filename: string) =>
    api.get<AccelerogramData>(`/api/io/accelerograms/${encodeURIComponent(filename)}`)
       .then(r => r.data),

  /** Genera sintetico Kanai-Tajimi o Boore + Saragoni-Hart envelope. */
  synthetic: (opts: SyntheticAccelOptions) =>
    api.post<AccelerogramData>("/api/io/accelerograms/synthetic", opts)
       .then(r => r.data),
};
