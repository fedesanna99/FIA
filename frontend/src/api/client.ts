import axios from "axios";
import type { FEAModel, Node, Element, Load, Constraint } from "../types/model";
import type { Material, Section } from "../types/material";
import type { StaticResults, ModalResults, DynamicResults } from "../types/results";
import { toast } from "../store/toastStore";
import { translateAxiosError } from "../lib/apiErrors";

const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// REQUEST interceptor (alpha.14): allega il JWT bearer se l'utente e' loggato.
// Letto direttamente da localStorage per evitare import circolari con authStore
// (che importa axios indirettamente via api/auth.ts).
api.interceptors.request.use((config) => {
  try {
    const raw = window.localStorage.getItem("auth-store");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    /* ignore: SSR/test env senza localStorage */
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const url = String(err?.config?.url ?? "");
    const method = String(err?.config?.method ?? "get").toLowerCase();
    // v1.6.1 T1 · BUG-1: network error puro (backend irraggiungibile, DNS,
    // CORS preflight fallito). Gia' coperto dal banner "Backend/database
    // non disponibile" nella Dashboard. Niente toast per non sommergere
    // l'utente all'avvio con 3 errori generici sovrapposti.
    if (!err.response) {
      return Promise.reject(err);
    }
    // 401 su endpoint authenticated: il token e' scaduto/invalido. Pulisci
    // lo store cosi' la UI redirige a login. Tocca farlo qui per evitare
    // di mostrare toast 401 ripetuti.
    if (status === 401) {
      try {
        const raw = window.localStorage.getItem("auth-store");
        if (raw) {
          const parsed = JSON.parse(raw) as { state?: { token?: string } };
          if (parsed?.state?.token) {
            window.localStorage.setItem(
              "auth-store",
              JSON.stringify({ state: { token: "", user: null }, version: 0 }),
            );
            // Forza re-render delle componenti che leggono dallo store:
            window.dispatchEvent(new Event("storage"));
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (status && status >= 400 && shouldToastHttpError(method, url)) {
      // v1.6 S0 · B05: traduzione errori in italiano umano. Prima il toast
      // mostrava `HTTP 422: [object Object]` quando il body era strutturato.
      // Ora translateAxiosError mappa i kind backend riconosciuti
      // (missing_constraints, singular_matrix, ...) a messaggi leggibili.
      const { title, description } = translateAxiosError(status, err?.response?.data);
      toast("error", description ? `${title} · ${description}` : title);
    }
    return Promise.reject(err);
  },
);

function shouldToastHttpError(method: string, url: string): boolean {
  if (method !== "get") return true;

  // Dashboard bootstrap: questi fallimenti sono gia' comunicati dal banner
  // "Backend/database non disponibile". Evita stack di toast generici quando
  // si lavora volutamente senza database/API.
  if (url === "/api/models/" || url === "/api/models") return false;
  if (/^\/api\/quotas\/[^/]+$/.test(url)) return false;
  if (url === "/api/health") return false;
  if (url === "/api/materials") return false;
  if (url === "/api/sections") return false;
  if (url === "/api/io/accelerograms") return false;
  // v1.6.1 T1 · BUG-1: estensione whitelist per endpoint di boot/polling
  // che hanno UI dedicata (login flow, jobs chip, quota card) e non
  // devono generare toast generici a freddo.
  if (url === "/api/auth/me") return false;
  if (url === "/api/jobs" || url === "/api/jobs/") return false;
  if (/^\/api\/jobs\/[^/]+$/.test(url)) return false;
  if (/^\/api\/billing\/quota(\/.*)?$/.test(url)) return false;

  return true;
}

export interface ValidationIssue {
  level: "info" | "warning" | "error";
  message: string;
  entity_type: string | null;
  entity_id: number | null;
}

export interface ValidationReport {
  model_id: string;
  n_issues: number;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
}

export const modelsApi = {
  list: () => api.get<FEAModel[]>("/api/models/").then(r => r.data),
  get: (id: string) => api.get<FEAModel>(`/api/models/${id}`).then(r => r.data),
  create: (req: { name: string; description?: string; is_3d: boolean }) =>
    api.post<FEAModel>("/api/models/", req).then(r => r.data),
  update: (id: string, model: FEAModel) =>
    api.put<FEAModel>(`/api/models/${id}`, model).then(r => r.data),
  delete: (id: string) => api.delete(`/api/models/${id}`).then(r => r.data),
  importJson: (payload: FEAModel) =>
    api.post<FEAModel>("/api/models/import", payload).then(r => r.data),
  duplicate: (id: string) =>
    api.post<FEAModel>(`/api/models/${id}/duplicate`).then(r => r.data),
  validate: (id: string) =>
    api.get<ValidationReport>(`/api/models/${id}/validate`).then(r => r.data),

  meshLine: (id: string, req: {
    p0: [number, number, number]; p1: [number, number, number];
    n_div: number; material_id: string; section_id: string; element_type: string;
  }) => api.post(`/api/models/${id}/mesh/line`, req).then(r => r.data),
  meshShell: (id: string, req: {
    p0: [number, number, number]; p1: [number, number, number];
    p2: [number, number, number]; p3: [number, number, number];
    nx: number; ny: number; material_id: string; section_id: string;
  }) => api.post(`/api/models/${id}/mesh/shell`, req).then(r => r.data),
  meshTri: (id: string, req: {
    p0: [number, number, number]; p1: [number, number, number];
    p2: [number, number, number]; p3: [number, number, number];
    nx: number; ny: number; material_id: string; section_id: string;
  }) => api.post(`/api/models/${id}/mesh/tri`, req).then(r => r.data),
  meshBox: (id: string, req: {
    origin: [number, number, number]; sizes: [number, number, number];
    nx: number; ny: number; nz: number; material_id: string;
  }) => api.post(`/api/models/${id}/mesh/box`, req).then(r => r.data),

  addNode: (modelId: string, node: Node) =>
    api.post<Node>(`/api/models/${modelId}/nodes`, node).then(r => r.data),
  updateNode: (modelId: string, nodeId: number, node: Node) =>
    api.put<Node>(`/api/models/${modelId}/nodes/${nodeId}`, node).then(r => r.data),
  deleteNode: (modelId: string, nodeId: number) =>
    api.delete(`/api/models/${modelId}/nodes/${nodeId}`).then(r => r.data),

  addElement: (modelId: string, element: Element) =>
    api.post<Element>(`/api/models/${modelId}/elements`, element).then(r => r.data),
  updateElement: (modelId: string, elementId: number, element: Element) =>
    api.put<Element>(`/api/models/${modelId}/elements/${elementId}`, element).then(r => r.data),
  deleteElement: (modelId: string, elementId: number) =>
    api.delete(`/api/models/${modelId}/elements/${elementId}`).then(r => r.data),

  addLoad: (modelId: string, load: Load) =>
    api.post<Load>(`/api/models/${modelId}/loads`, load).then(r => r.data),
  updateLoad: (modelId: string, loadId: number, load: Load) =>
    api.put<Load>(`/api/models/${modelId}/loads/${loadId}`, load).then(r => r.data),
  deleteLoad: (modelId: string, loadId: number) =>
    api.delete(`/api/models/${modelId}/loads/${loadId}`).then(r => r.data),

  addConstraint: (modelId: string, c: Constraint) =>
    api.post<Constraint>(`/api/models/${modelId}/constraints`, c).then(r => r.data),
  updateConstraint: (modelId: string, cId: number, c: Constraint) =>
    api.put<Constraint>(`/api/models/${modelId}/constraints/${cId}`, c).then(r => r.data),
  deleteConstraint: (modelId: string, cId: number) =>
    api.delete(`/api/models/${modelId}/constraints/${cId}`).then(r => r.data),
};

export interface FFTSpectrum {
  frequencies: number[];
  amplitudes: number[];
  phases: number[];
  dominant_hz: number;
}

export interface ResponseSpectrum {
  periods: number[];
  Sd: number[];
  Sv: number[];
  Sa: number[];
  damping_ratio?: number;
}

export interface BucklingResults {
  analysis_type: "buckling";
  model_id: string;
  n_modes: number;
  load_factors: number[];
  critical_factor: number;
  solve_time_ms: number;
  message?: string;
}

export const analysisApi = {
  static: (modelId: string, req: { include_self_weight?: boolean; g?: number } = {}) =>
    api.post<StaticResults>(`/api/analysis/static/${modelId}`, req).then(r => r.data),
  modal: (modelId: string, req: { n_modes?: number } = {}) =>
    api.post<ModalResults>(`/api/analysis/modal/${modelId}`, req).then(r => r.data),
  dynamic: (modelId: string, req: {
    dt?: number; t_end?: number; beta?: number; gamma?: number;
    rayleigh_alpha?: number; rayleigh_beta?: number;
    save_every?: number; store_nodes?: number[];
  } = {}) => api.post<DynamicResults>(`/api/analysis/dynamic/${modelId}`, req).then(r => r.data),
  buckling: (modelId: string, req: { n_modes?: number } = {}) =>
    api.post<BucklingResults>(`/api/analysis/buckling/${modelId}`, req).then(r => r.data),
  rayleigh: (req: { f1_hz: number; f2_hz: number; damping_ratio?: number }) =>
    api.post<{ alpha: number; beta: number; omega1: number; omega2: number; damping_ratio: number }>(
      "/api/analysis/rayleigh", req
    ).then(r => r.data),
  fft: (modelId: string, req: { node_id: number; component?: string }) =>
    api.post<FFTSpectrum>(`/api/analysis/fft/${modelId}`, req).then(r => r.data),
  responseSpectrum: (modelId: string, req: { node_id: number; component?: string; damping_ratio?: number }) =>
    api.post<ResponseSpectrum>(`/api/analysis/response_spectrum/${modelId}`, req).then(r => r.data),
  getResults: <T = unknown>(modelId: string, type: "static" | "modal" | "dynamic" | "buckling") =>
    api.get<T>(`/api/analysis/results/${modelId}/${type}`).then(r => r.data),
};

// ── EC3 Verification ─────────────────────────────────────────────────────────

export interface EC3ElementVerification {
  element_id: number;
  section_id: string;
  material_id: string;
  L: number;
  section_class: number | null;
  N_Ed: number;
  M_Ed: number;
  V_Ed: number;
  N_Rd: number | null;
  M_c_Rd: number | null;
  V_c_Rd: number | null;
  N_b_Rd: number | null;
  M_b_Rd: number | null;
  UR_resistance: number;
  UR_buckling: number | null;
  UR_LTB: number | null;
  UR_serviceability: number | null;
  UR_max: number;
  governing: string;
  status: "OK" | "FAIL";
  notes: string;
}

export interface EC3VerifyResponse {
  model_id: string;
  n_elements_checked: number;
  n_failures: number;
  results: EC3ElementVerification[];
}

export const verifyApi = {
  ec3: (modelId: string, req: { gamma_M0?: number; gamma_M1?: number; serviceability_category?: string } = {}) =>
    api.post<EC3VerifyResponse>(`/api/verify/ec3/${modelId}`, req).then(r => r.data),
};


export const materialsApi = {
  list: () => api.get<Material[]>("/api/materials").then(r => r.data),
  listSections: () => api.get<Section[]>("/api/sections").then(r => r.data),
  addSection: (s: Section) => api.post<Section>("/api/sections", s).then(r => r.data),
  deleteSection: (id: string) => api.delete(`/api/sections/${id}`).then(r => r.data),
  addMaterial: (m: Material) => api.post<Material>("/api/materials", m).then(r => r.data),
};

export function openProgressSocket(
  modelId: string,
  onMessage: (p: { progress: number; message: string }) => void,
): WebSocket {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const ws = new WebSocket(`${proto}://${host}/ws/analysis/${modelId}`);
  ws.onmessage = (ev) => {
    try { onMessage(JSON.parse(ev.data)); } catch { /* ignore */ }
  };
  return ws;
}
