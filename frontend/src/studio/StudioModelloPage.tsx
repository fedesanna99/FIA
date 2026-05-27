/**
 * StudioModelloPage · v2.7.4 Phase 5.1 mockup-driven
 *
 * Replica mockup-faithful di ui_kits/webapp_desktop/Studio Modello.html (640 righe)
 * usando StudioShell + Tree sidebar + Viewport SVG + Panel Modello.
 *
 * MVP v2.7.4: contenuti hardcoded mockup-faithful. Backend integration
 * (useModelStore/useMeshGenerate) lasciata per iter v2.7.4.x.
 *
 * Route: /studio/modello dentro AuthGate.
 */
import { useState } from "react";
import {
  Box, ChevronRight, Info, Maximize2, Minimize2, Minus, Plus, Search, X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { StudioShell } from "./StudioShell";
import { useFirstModelId } from "./useFirstModelId";
import { parametricMeshApi, type ParametricMeshRequest } from "../api/mesh";
import { toast } from "../store/toastStore";

import "../styles/studio.css";


// ── Mockup data (hardcoded UC1 dump) ────────────────────────────────────

type ShapeKey = "linear" | "quad" | "tri" | "lshape" | "tshape" | "circle" | "ring" | "box";

interface ShapeDef {
  key: ShapeKey;
  label: string;
  meta: string;
  pill?: "NEW";
}

const SHAPES: readonly ShapeDef[] = [
  { key: "linear", label: "Lineare",  meta: "beam · truss" },
  { key: "quad",   label: "Quad",     meta: "shell Q4" },
  { key: "tri",    label: "Triangle", meta: "tri T3" },
  { key: "lshape", label: "L-shape",  meta: "",            pill: "NEW" },
  { key: "tshape", label: "T-shape",  meta: "",            pill: "NEW" },
  { key: "circle", label: "Cerchio",  meta: "",            pill: "NEW" },
  { key: "ring",   label: "Anello",   meta: "",            pill: "NEW" },
  { key: "box",    label: "Box solida", meta: "solid H8" },
];


// ── Page ────────────────────────────────────────────────────────────────

export function StudioModelloPage(): JSX.Element {
  const [activeShape, setActiveShape] = useState<ShapeKey>("linear");
  const [activeTab, setActiveTab] = useState<"albero" | "mesh" | "sezioni" | "schema">("mesh");

  return (
    <StudioShell active="modello" workspaceState="Modello · Mesh">

      {/* ─── TREE (sub-rail Modello) ─── */}
      <ModelloTree />

      {/* ─── VIEWPORT ─── */}
      <ModelloViewport />

      {/* ─── PANEL Modello ─── */}
      <ModelloPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeShape={activeShape}
        setActiveShape={setActiveShape}
      />

    </StudioShell>
  );
}


// ── Tree sub-rail ───────────────────────────────────────────────────────

function ModelloTree(): JSX.Element {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    nodi: true,
    beam: true,
    carichi: false,
    vincoli: false,
    sezioni: false,
    materiali: false,
  });

  const toggleGroup = (k: string) => setOpenGroups((s) => ({ ...s, [k]: !s[k] }));

  return (
    <aside className="s-tree" aria-label="Albero modello">
      <header className="tree-head">
        <span className="eyebrow">Modello · Albero</span>
        <button type="button" className="tree-collapse" aria-label="Comprimi tutto" onClick={() => setOpenGroups({})}>
          <Minimize2 size={12} />
        </button>
      </header>

      <div className="tree-body">

        {/* Nodi */}
        <div className={openGroups.nodi ? "tree-group is-open" : "tree-group"}>
          <button type="button" className="tree-row tree-folder" onClick={() => toggleGroup("nodi")}>
            <CaretIcon />
            <CircleIcon />
            <span className="tree-name">Nodi</span>
            <span className="tree-count">11</span>
          </button>
          <div className="tree-children">
            <button type="button" className="tree-row">
              <span className="tree-id">N1</span> (0.0, 0.0, 0.0) <span className="tree-tag tag-pin">CRN</span>
            </button>
            <button type="button" className="tree-row"><span className="tree-id">N2</span> (0.6, 0.0, 0.0)</button>
            <button type="button" className="tree-row"><span className="tree-id">N3</span> (1.2, 0.0, 0.0)</button>
            <button type="button" className="tree-row"><span className="tree-id">N4</span> (1.8, 0.0, 0.0)</button>
            <button type="button" className="tree-row"><span className="tree-id">N5</span> (2.4, 0.0, 0.0)</button>
            <button type="button" className="tree-row"><span className="tree-id">N6</span> (3.0, 0.0, 0.0)</button>
            <button type="button" className="tree-row"><span className="tree-id">N7</span> (3.6, 0.0, 0.0)</button>
            <button type="button" className="tree-row tree-more">+ 4 nodi nascosti…</button>
          </div>
        </div>

        {/* Beam IPE 300 */}
        <div className={openGroups.beam ? "tree-group is-open" : "tree-group"}>
          <button type="button" className="tree-row tree-folder" onClick={() => toggleGroup("beam")}>
            <CaretIcon />
            <BeamIcon />
            <span className="tree-name">Beam · IPE 300</span>
            <span className="tree-count">10</span>
          </button>
          <div className="tree-children">
            <button type="button" className="tree-row"><span className="tree-id">EL 1</span> N1 → N2</button>
            <button type="button" className="tree-row"><span className="tree-id">EL 2</span> N2 → N3</button>
            <button type="button" className="tree-row"><span className="tree-id">EL 3</span> N3 → N4</button>
            <button type="button" className="tree-row"><span className="tree-id">EL 4</span> N4 → N5</button>
            <button type="button" className="tree-row is-selected">
              <span className="tree-id">EL 5</span> N5 → N6
              <span className="tree-tag tag-sel">SEL</span>
            </button>
            <button type="button" className="tree-row tree-more">+ 5 elementi…</button>
          </div>
        </div>

        {/* Carichi */}
        <div className={openGroups.carichi ? "tree-group is-open" : "tree-group"}>
          <button type="button" className="tree-row tree-folder" onClick={() => toggleGroup("carichi")}>
            <CaretIcon />
            <ArrowDownIcon />
            <span className="tree-name">Carichi</span>
            <span className="tree-count">1</span>
          </button>
        </div>

        {/* Vincoli */}
        <div className={openGroups.vincoli ? "tree-group is-open" : "tree-group"}>
          <button type="button" className="tree-row tree-folder" onClick={() => toggleGroup("vincoli")}>
            <CaretIcon />
            <TriangleIcon />
            <span className="tree-name">Vincoli</span>
            <span className="tree-count">2</span>
          </button>
        </div>

        {/* Sezioni */}
        <div className={openGroups.sezioni ? "tree-group is-open" : "tree-group"}>
          <button type="button" className="tree-row tree-folder" onClick={() => toggleGroup("sezioni")}>
            <CaretIcon />
            <RectIcon />
            <span className="tree-name">Sezioni</span>
            <span className="tree-count">1</span>
          </button>
        </div>

        {/* Materiali */}
        <div className={openGroups.materiali ? "tree-group is-open" : "tree-group"}>
          <button type="button" className="tree-row tree-folder" onClick={() => toggleGroup("materiali")}>
            <CaretIcon />
            <CrossIcon />
            <span className="tree-name">Materiali</span>
            <span className="tree-count">1</span>
          </button>
        </div>

      </div>

      <div className="tree-toolbar">
        <button type="button" className="tool-pill"><Plus size={11} strokeWidth={2.4} /> Nodo</button>
        <button type="button" className="tool-pill"><Plus size={11} strokeWidth={2.4} /> Elemento</button>
        <button type="button" className="tool-pill"><Plus size={11} strokeWidth={2.4} /> Mesh…</button>
      </div>
    </aside>
  );
}


// ── Viewport SVG + HUD ──────────────────────────────────────────────────

function ModelloViewport(): JSX.Element {
  return (
    <section className="s-viewport">
      <div className="vp-grid" />
      <div className="vp-grid-major" />

      <div className="vp-canvas">
        <svg viewBox="0 0 960 480" preserveAspectRatio="xMidYMid meet" style={{ width: "78%", maxWidth: "920px" }}>
          {/* Span dim */}
          <g fontFamily="JetBrains Mono" fontSize="11" fill="var(--ink-dim)">
            <line x1="100" y1="80" x2="820" y2="80" stroke="var(--ink-faint)" strokeWidth="1"/>
            <line x1="100" y1="75" x2="100" y2="85" stroke="var(--ink-faint)" strokeWidth="1"/>
            <line x1="820" y1="75" x2="820" y2="85" stroke="var(--ink-faint)" strokeWidth="1"/>
            <rect x="430" y="70" width="60" height="20" fill="var(--bg-viewport)"/>
            <text x="460" y="84" textAnchor="middle" fontWeight="600" fill="var(--ink-muted)">L = 6.00 m</text>
          </g>

          {/* Distributed load (subtle) */}
          <g color="var(--coral)" opacity="0.55">
            <line x1="100" y1="140" x2="820" y2="140" stroke="currentColor" strokeWidth="1.4"/>
            <g stroke="currentColor" strokeWidth="1">
              {[160, 280, 400, 520, 640, 760].map((x) => (
                <line key={x} x1={x} y1="142" x2={x} y2="232"/>
              ))}
            </g>
            <text x="120" y="135" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" fill="currentColor">q = 10.0 kN/m</text>
          </g>

          {/* Selected element halo (EL 5) */}
          <rect x="384" y="220" width="76" height="50" rx="6" fill="rgba(8,145,178,0.08)" stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="4 3"/>

          {/* Beam */}
          <line x1="100" y1="245" x2="820" y2="245" stroke="var(--ink)" strokeWidth="11" strokeLinecap="butt"/>

          {/* Nodes */}
          <g fill="var(--bg-panel)" stroke="var(--ink)" strokeWidth="2">
            <circle cx="100" cy="245" r="6"/>
            <circle cx="172" cy="245" r="4"/>
            <circle cx="244" cy="245" r="4"/>
            <circle cx="316" cy="245" r="4"/>
            <circle cx="388" cy="245" r="5" fill="var(--accent)" stroke="var(--accent)"/>
            <circle cx="460" cy="245" r="5" fill="var(--accent)" stroke="var(--accent)"/>
            <circle cx="532" cy="245" r="4"/>
            <circle cx="604" cy="245" r="4"/>
            <circle cx="676" cy="245" r="4"/>
            <circle cx="748" cy="245" r="4"/>
            <circle cx="820" cy="245" r="6"/>
          </g>

          {/* All node labels */}
          <g fontFamily="JetBrains Mono" fontSize="9" fill="var(--ink-dim)" textAnchor="middle">
            <text x="100" y="270">N1</text>
            <text x="172" y="270">N2</text>
            <text x="244" y="270">N3</text>
            <text x="316" y="270">N4</text>
            <text x="388" y="270" fill="var(--accent)" fontWeight="700">N5</text>
            <text x="460" y="270" fill="var(--accent)" fontWeight="700">N6</text>
            <text x="532" y="270">N7</text>
            <text x="604" y="270">N8</text>
            <text x="676" y="270">N9</text>
            <text x="748" y="270">N10</text>
            <text x="820" y="270">N11</text>
          </g>

          {/* EL 5 label (selected) */}
          <g transform="translate(424 215)">
            <rect x="-22" y="-12" width="44" height="20" rx="4" fill="var(--bg-panel)" stroke="var(--accent)" strokeWidth="1.2"/>
            <text x="0" y="2" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" fill="var(--accent)">EL 5</text>
          </g>

          {/* Supports */}
          <g transform="translate(100 252)" color="var(--ink-muted)">
            <polygon points="0,0 -14,20 14,20" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="-20" y1="24" x2="20" y2="24" stroke="currentColor" strokeWidth="1.5"/>
            <g stroke="currentColor" strokeWidth="1">
              <line x1="-14" y1="24" x2="-20" y2="32"/>
              <line x1="-7" y1="24" x2="-13" y2="32"/>
              <line x1="0" y1="24" x2="-6" y2="32"/>
              <line x1="7" y1="24" x2="1" y2="32"/>
              <line x1="14" y1="24" x2="8" y2="32"/>
            </g>
            <text x="0" y="48" fontFamily="JetBrains Mono" fontSize="10" fontWeight="700" textAnchor="middle" fill="currentColor" letterSpacing="0.10em">CERNIERA</text>
          </g>

          <g transform="translate(820 252)" color="var(--ink-muted)">
            <polygon points="0,0 -14,16 14,16" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="-7" cy="22" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="7" cy="22" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="-20" y1="27" x2="20" y2="27" stroke="currentColor" strokeWidth="1.5"/>
            <g stroke="currentColor" strokeWidth="1">
              <line x1="-14" y1="27" x2="-20" y2="35"/>
              <line x1="-7" y1="27" x2="-13" y2="35"/>
              <line x1="0" y1="27" x2="-6" y2="35"/>
              <line x1="7" y1="27" x2="1" y2="35"/>
              <line x1="14" y1="27" x2="8" y2="35"/>
            </g>
            <text x="0" y="50" fontFamily="JetBrains Mono" fontSize="10" fontWeight="700" textAnchor="middle" fill="currentColor" letterSpacing="0.10em">CARRELLO</text>
          </g>

          {/* Local axes hint at EL 5 */}
          <g transform="translate(424 200)" fontFamily="JetBrains Mono" fontSize="9">
            <line x1="0" y1="0" x2="14" y2="0" stroke="#DC2626" strokeWidth="1.4"/>
            <polygon points="14,0 11,-2 11,2" fill="#DC2626"/>
            <text x="18" y="3" fill="#DC2626" fontWeight="700">x</text>
            <line x1="0" y1="0" x2="0" y2="-14" stroke="#22C55E" strokeWidth="1.4"/>
            <polygon points="0,-14 -2,-11 2,-11" fill="#22C55E"/>
            <text x="3" y="-15" fill="#22C55E" fontWeight="700">y</text>
          </g>
        </svg>
      </div>

      {/* Selection breadcrumb */}
      <div className="vp-selection">
        <span className="vp-sel-tag">EL 5</span>
        <span>Beam · IPE 300 · S355</span>
        <span className="vp-sel-meta">N5 → N6 · L = 0.60 m</span>
        <button type="button" className="vp-sel-close" aria-label="Deseleziona">
          <X size={11} strokeWidth={2.4} />
        </button>
      </div>

      {/* HUD controls top-right */}
      <div className="vp-hud vp-controls">
        <button type="button" className="vp-ctrl on"><Box size={12} /> Persp</button>
        <button type="button" className="vp-ctrl"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> Ortho</button>
        <span className="vp-sep" />
        <button type="button" className="vp-ctrl on">Solid</button>
        <button type="button" className="vp-ctrl">Wire</button>
        <button type="button" className="vp-ctrl on">Grid</button>
      </div>

      {/* Gizmo */}
      <div className="vp-hud vp-gizmo">
        <svg width="76" height="76" viewBox="0 0 80 80">
          <g transform="translate(40 40)">
            <line x1="0" y1="0" x2="0" y2="-26" stroke="#0891B2" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="0" cy="-30" r="8" fill="#0891B2"/>
            <text x="0" y="-27" fontFamily="JetBrains Mono" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">Z</text>
            <line x1="0" y1="0" x2="22" y2="13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="26" cy="15" r="8" fill="#EF4444"/>
            <text x="26" y="18" fontFamily="JetBrains Mono" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">X</text>
            <line x1="0" y1="0" x2="-22" y2="13" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="-26" cy="15" r="8" fill="#22C55E"/>
            <text x="-26" y="18" fontFamily="JetBrains Mono" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">Y</text>
            <circle cx="0" cy="0" r="2.5" fill="var(--ink)"/>
          </g>
        </svg>
      </div>

      {/* Ruler bottom-left */}
      <div className="vp-hud vp-ruler">
        <span>1 m</span>
        <span className="ruler-bar" />
        <span>Zoom 100%</span>
      </div>

      {/* Zoom controls bottom-center */}
      <div className="vp-hud vp-zoom">
        <button type="button" aria-label="Fit"><Maximize2 size={14} /></button>
        <span className="vp-sep" />
        <button type="button" aria-label="Zoom -"><Minus size={14} /></button>
        <span className="vp-zoom-val">100%</span>
        <button type="button" aria-label="Zoom +"><Plus size={14} /></button>
        <span className="vp-sep" />
        <button type="button" aria-label="Pan"><Search size={14} /></button>
      </div>
    </section>
  );
}


// ── Panel Modello (tabs + Mesh wizard) ──────────────────────────────────

interface PanelProps {
  activeTab: "albero" | "mesh" | "sezioni" | "schema";
  setActiveTab: (t: "albero" | "mesh" | "sezioni" | "schema") => void;
  activeShape: ShapeKey;
  setActiveShape: (s: ShapeKey) => void;
}

function ModelloPanel(props: PanelProps): JSX.Element {
  const { activeTab, setActiveTab, activeShape, setActiveShape } = props;
  const { modelId, isLoading: modelsLoading } = useFirstModelId();
  const qc = useQueryClient();

  // v2.9.0 Sprint B M1.1: wire "Genera mesh" al backend
  // POST /api/models/{id}/mesh/parametric con default rectangle 6x0.5m
  // (proxy mockup: trave bi-appoggiata IPE 300 lineare 10 elementi).
  const meshMutation = useMutation({
    mutationFn: async (req: ParametricMeshRequest) => {
      if (!modelId) throw new Error("no-model");
      return parametricMeshApi.generate(modelId, req);
    },
    onSuccess: (data) => {
      toast("success",`Mesh generata: ${data.added_nodes} nodi, ${data.added_elements} elementi`);
      qc.invalidateQueries({ queryKey: ["models"] });
    },
    onError: (err: Error) => {
      if (err.message === "no-model") {
        toast("error","Apri prima un modello dalla gallery Templates");
      } else {
        toast("error",`Errore mesh: ${err.message}`);
      }
    },
  });

  const onGenerateMesh = () => {
    meshMutation.mutate({
      shape: "rectangle",
      params: { b: 6.0, h: 0.5 },
      h: 0.6,
      element_type: "tri3",
      material_id: "default-s355",
    });
  };

  return (
    <aside className="s-panel">
      <header className="sp-head">
        <div className="sp-head-row">
          <div className="sp-icon"><Box size={16} strokeWidth={1.8} /></div>
          <h2>Modello</h2>
          <button type="button" className="sp-help" aria-label="Aiuto">?</button>
        </div>
        <p className="sp-desc">Costruisci la struttura: geometria, mesh, sezioni, materiali.</p>
      </header>

      <nav className="sp-tabs">
        <button type="button" className={activeTab === "albero" ? "sp-tab is-active" : "sp-tab"} onClick={() => setActiveTab("albero")}>
          Albero<span className="tab-count">24</span>
        </button>
        <button type="button" className={activeTab === "mesh" ? "sp-tab is-active" : "sp-tab"} onClick={() => setActiveTab("mesh")}>
          Mesh
        </button>
        <button type="button" className={activeTab === "sezioni" ? "sp-tab is-active" : "sp-tab"} onClick={() => setActiveTab("sezioni")}>
          Sezioni
        </button>
        <button type="button" className={activeTab === "schema" ? "sp-tab is-active" : "sp-tab"} onClick={() => setActiveTab("schema")}>
          Schema
        </button>
      </nav>

      <div className="sp-body">

        {/* MESH WIZARD */}
        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Mesh parametrica · NEW</span>
            <span className="badge-new">v2.4</span>
          </div>

          <div className="mesh-shape-picker">
            {SHAPES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={s.key === activeShape ? "shape-tile is-active" : "shape-tile"}
                onClick={() => setActiveShape(s.key)}
              >
                <ShapeIcon shape={s.key} />
                <span>{s.label}</span>
                {s.meta && <span className="shape-meta">{s.meta}</span>}
                {s.pill === "NEW" && <span className="shape-pill">NEW</span>}
              </button>
            ))}
          </div>

          {/* Mesh params (linear active) */}
          <div className="mesh-params">
            <div className="param-row">
              <div className="param-field">
                <label className="param-label">Lunghezza · L</label>
                <div className="param-input">
                  <input type="text" defaultValue="6.00" inputMode="decimal" />
                  <span className="unit">m</span>
                </div>
              </div>
              <div className="param-field">
                <label className="param-label">Sotto-divisione</label>
                <div className="param-input">
                  <input type="text" defaultValue="10" inputMode="decimal" />
                  <span className="unit">elem</span>
                </div>
              </div>
            </div>
            <div className="param-row">
              <div className="param-field">
                <label className="param-label">Origine</label>
                <div className="param-input">
                  <input type="text" defaultValue="(0, 0, 0)" />
                  <span className="unit">m</span>
                </div>
              </div>
              <div className="param-field">
                <label className="param-label">Direzione</label>
                <div className="param-input">
                  <input type="text" defaultValue="(1, 0, 0)" />
                  <span className="unit">vec</span>
                </div>
              </div>
            </div>
            <div className="param-info">
              <Info size={12} />
              <span>10 beam · 11 nodi · spaziatura uniforme 0.60 m</span>
            </div>
            <button
              type="button"
              className="btn-primary btn-block"
              onClick={onGenerateMesh}
              disabled={meshMutation.isPending || modelsLoading}
            >
              <Plus size={12} strokeWidth={2.4} />
              {meshMutation.isPending ? "Generazione…" : "Genera mesh"}
            </button>
          </div>
        </section>

        {/* Schema avanzato */}
        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Schema avanzato · NEW</span>
            <button type="button" className="sp-section-action">Documentazione</button>
          </div>
          <p className="sp-section-text">
            Editor per parametri non-standard ora <b>esposti da UI</b>: niente più JSON manuale.
          </p>

          <div className="schema-list">
            <SchemaRow icon={<WinklerIcon />} iconBg="var(--bg-info)" iconColor="var(--accent)"
              title="Beam su suolo elastico"
              desc="winkler_k · suolo continuo · spring distribuito" />
            <SchemaRow icon={<ReleaseIcon />} iconBg="var(--bg-purple)" iconColor="var(--purple)"
              title="Release cerniera interna"
              desc="Rilascia momento all'inizio/fine elemento" />
            <SchemaRow icon={<ArrowDownIcon />} iconBg="var(--bg-coral)" iconColor="var(--coral)"
              title="Vincolo solo compressione"
              desc="compression_only — non resiste a trazione" />
            <SchemaRow icon={<SpringIcon />} iconBg="var(--bg-success)" iconColor="var(--success)"
              title="Spring puntuale"
              desc="spring_k 6×6 · accoppia DOF · per BC reali" />
          </div>
        </section>

        {/* Sezione + Materiale corrente */}
        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Sezione · Materiale di default</span>
            <button type="button" className="sp-section-action">Catalogo</button>
          </div>

          <div className="section-card">
            <div className="section-card-l">
              <svg viewBox="0 0 60 80" width="48" height="64">
                <rect x="10" y="5" width="40" height="6" fill="var(--ink)"/>
                <rect x="27" y="5" width="6" height="70" fill="var(--ink)"/>
                <rect x="10" y="69" width="40" height="6" fill="var(--ink)"/>
              </svg>
            </div>
            <div className="section-card-r">
              <h5>IPE 300 · acciaio S355</h5>
              <dl className="section-kv">
                <dt>h × b</dt><dd>300 × 150 mm</dd>
                <dt>A</dt><dd>53.81 cm²</dd>
                <dt>I_y</dt><dd>8356 cm⁴</dd>
                <dt>W_pl,y</dt><dd>628.4 cm³</dd>
                <dt>fyk</dt><dd>355 MPa</dd>
                <dt>E</dt><dd>210 000 MPa</dd>
              </dl>
            </div>
          </div>
        </section>

      </div>
    </aside>
  );
}


// ── Sub-components ──────────────────────────────────────────────────────

function SchemaRow({ icon, iconBg, iconColor, title, desc }: {
  icon: JSX.Element; iconBg: string; iconColor: string; title: string; desc: string;
}): JSX.Element {
  return (
    <button type="button" className="schema-row">
      <div className="schema-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div className="schema-body">
        <h5>{title}</h5>
        <p>{desc}</p>
      </div>
      <span className="schema-cta"><ChevronRight size={11} strokeWidth={2.4} /></span>
    </button>
  );
}

function CaretIcon() {
  return (
    <svg className="tree-caret" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 4 18 12 6 20"/>
    </svg>
  );
}
function CircleIcon() {
  return (
    <svg className="tree-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="22" y1="12" x2="18" y2="12"/>
      <line x1="6" y1="12" x2="2" y2="12"/>
    </svg>
  );
}
function BeamIcon() {
  return (
    <svg className="tree-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8h20M2 16h20M6 8v8M18 8v8M10 8v8M14 8v8"/>
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg className="tree-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  );
}
function TriangleIcon() {
  return (
    <svg className="tree-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 22 2 22 12 2"/>
    </svg>
  );
}
function RectIcon() {
  return (
    <svg className="tree-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg className="tree-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20"/>
    </svg>
  );
}

function ShapeIcon({ shape }: { shape: ShapeKey }): JSX.Element {
  switch (shape) {
    case "linear":
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <line x1="6" y1="14" x2="30" y2="14"/>
          <circle cx="6" cy="14" r="2" fill="currentColor"/>
          <circle cx="30" cy="14" r="2" fill="currentColor"/>
        </svg>
      );
    case "quad":
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="6" y="4" width="24" height="20"/>
          <line x1="14" y1="4" x2="14" y2="24"/>
          <line x1="22" y1="4" x2="22" y2="24"/>
          <line x1="6" y1="11" x2="30" y2="11"/>
          <line x1="6" y1="17" x2="30" y2="17"/>
        </svg>
      );
    case "tri":
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <polygon points="18,4 30,24 6,24"/>
          <line x1="18" y1="4" x2="18" y2="24"/>
          <line x1="6" y1="24" x2="30" y2="24"/>
        </svg>
      );
    case "lshape":
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 14h6v6H4zM4 14v-6h6m0 6h6v6H10m0-6v-6h6m0 6h6v6H16m0-6v-6h6v6"/>
        </svg>
      );
    case "tshape":
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 4h24v8H22v12h-8V12H6V4z"/>
        </svg>
      );
    case "circle":
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="18" cy="14" r="10"/>
          <line x1="8" y1="14" x2="28" y2="14"/>
          <line x1="18" y1="4" x2="18" y2="24"/>
        </svg>
      );
    case "ring":
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="18" cy="14" r="10"/>
          <circle cx="18" cy="14" r="5"/>
        </svg>
      );
    case "box":
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="28" height="20" rx="2"/>
          <line x1="4" y1="14" x2="32" y2="14"/>
          <line x1="18" y1="4" x2="18" y2="24"/>
          <rect x="11" y="9" width="14" height="10" strokeDasharray="2 2"/>
        </svg>
      );
  }
}

function WinklerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>
    </svg>
  );
}
function ReleaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="12" r="3"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  );
}
function SpringIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v12M21 10v12M7 12c0-2 1-3 5-3s5 1 5 3M3 10h18M5 4l7 6 7-6"/>
    </svg>
  );
}
