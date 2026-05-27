/**
 * StudioAnalisiPage · v2.7.5 Phase 5.2 mockup-driven
 *
 * Solver catalog (7 cards) + filter pills + comparison strip + right
 * panel parametri. Replica condensata di ui_kits/webapp_desktop/
 * Studio Analisi.html.
 *
 * Route: /studio/analisi (no sub-rail Tree, grid 3-col mid).
 */
import { useState } from "react";
import { Activity, Cog, Info, Play, Settings, Waves, Wind } from "lucide-react";

import { StudioShell } from "./StudioShell";

import "../styles/studio.css";
import "../styles/studio-analisi.css";


// ── Solver catalog (mockup hardcoded) ───────────────────────────────────

type SolverKey =
  | "static" | "modal" | "newmark" | "buckling"
  | "pushover" | "seismic-th" | "fatigue";

interface SolverDef {
  key: SolverKey;
  title: string;
  formula: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  badge: "PRONTA" | "NEW v2.4";
  stats: ReadonlyArray<readonly [string, string]>;
  isNew?: boolean;
}

const SOLVERS: readonly SolverDef[] = [
  {
    key: "static",
    title: "Statica lineare",
    formula: "K · u = F",
    desc: "Spostamenti, reazioni, sollecitazioni per carichi statici applicati. Risolve un sistema lineare diretto sulla matrice di rigidezza.",
    iconBg: "var(--accent-subtle)", iconColor: "var(--accent)",
    badge: "PRONTA",
    stats: [["Solver", "Direct (LU)"], ["~Stima", "< 1s"], ["DOF", "22"]],
  },
  {
    key: "modal",
    title: "Analisi modale",
    formula: "(K − ω² M) φ = 0",
    desc: "Frequenze e modi propri di vibrazione. Eigenvalue problem risolto con ARPACK (sparse iterative).",
    iconBg: "var(--bg-purple)", iconColor: "var(--purple)",
    badge: "PRONTA",
    stats: [["Solver", "ARPACK"], ["~Stima", "~1.2s"], ["Modi", "6"]],
  },
  {
    key: "newmark",
    title: "Dinamica Newmark",
    formula: "M ü + C u̇ + K u = F(t)",
    desc: "Integrazione temporale step-by-step. Per carichi tempo-dipendenti, impatto, shock.",
    iconBg: "var(--bg-coral)", iconColor: "var(--coral)",
    badge: "PRONTA",
    stats: [["β · γ", "0.25 · 0.50"], ["Δt", "0.01 s"], ["N steps", "500"]],
  },
  {
    key: "buckling",
    title: "Buckling lineare",
    formula: "(K − λ K_G) φ = 0",
    desc: "Carichi critici di instabilità Euleriana. Eigenvalue su matrice geometrica K_G.",
    iconBg: "var(--bg-warn)", iconColor: "var(--warn)",
    badge: "PRONTA",
    stats: [["N critici", "4"], ["~Stima", "~0.8s"], ["Method", "Subspace"]],
  },
  {
    key: "pushover",
    title: "Push-over non lineare",
    formula: "F = α · F₀ · u(α)",
    desc: "Curva capacità taglio-spostamento per analisi sismica avanzata. Carichi laterali incrementali fino al collasso.",
    iconBg: "rgba(83,74,183,0.10)", iconColor: "var(--purple)",
    badge: "NEW v2.4", isNew: true,
    stats: [["Path", "Triangolare"], ["Drift max", "3.5%"], ["~Stima", "~8s"]],
  },
  {
    key: "seismic-th",
    title: "Sismica time-history",
    formula: "M ü + C u̇ + K u = −M a_g(t)",
    desc: "Accelerogrammi reali (PEER/ESM) o sintetici. Computa drift interpiano per verifiche EC8.",
    iconBg: "rgba(180,83,9,0.10)", iconColor: "var(--warn)",
    badge: "NEW v2.4", isNew: true,
    stats: [["Catalogo", "PEER · ESM"], ["Comp", "X · Y · Z"], ["Drift", "✓"]],
  },
  {
    key: "fatigue",
    title: "Fatica · Rainflow",
    formula: "D = Σ nᵢ / Nᵢ (Palmgren-Miner)",
    desc: "Conteggio cicli Rainflow + S-N · stima vita residua. Curve EC3 + EN13001.",
    iconBg: "rgba(220,38,38,0.10)", iconColor: "var(--danger)",
    badge: "NEW v2.4", isNew: true,
    stats: [["Curve", "EC3-1-9"], ["Method", "3-point"], ["N cicli", "~10⁶"]],
  },
];


// ── Page ────────────────────────────────────────────────────────────────

export function StudioAnalisiPage(): JSX.Element {
  const [filter, setFilter] = useState<"all" | "linear" | "nonlinear" | "dynamic" | "new">("all");
  const [activeSolver, setActiveSolver] = useState<SolverKey>("static");

  const filteredSolvers = SOLVERS.filter((s) => {
    if (filter === "all") return true;
    if (filter === "linear") return ["static", "modal", "buckling"].includes(s.key);
    if (filter === "nonlinear") return ["pushover", "fatigue"].includes(s.key);
    if (filter === "dynamic") return ["newmark", "seismic-th"].includes(s.key);
    if (filter === "new") return s.isNew;
    return true;
  });

  return (
    <StudioShell active="analisi" workspaceState="Analisi · Solver" midLayout="no-tree">
      <main className="an-main">

        {/* Header strip */}
        <div className="an-head">
          <div className="an-head-l">
            <span className="eyebrow eyebrow-accent">WORKSPACE · ANALISI</span>
            <h1 className="an-title">Scegli e configura il solver</h1>
            <p className="an-sub">
              10 solver implementati · 7 esposti via UI · select il tipo di analisi da lanciare sul modello attivo.
            </p>
          </div>
          <div className="an-head-r">
            <div className="an-last">
              <span className="eyebrow">ULTIMA ANALISI</span>
              <div className="an-last-row">
                <span className="an-last-type">Statica lineare</span>
                <span className="an-last-meta">14:31:42 · <span style={{ color: "var(--success)", fontWeight: 700 }}>0.84s</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="an-filter">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="Tutti" count={7} />
          <FilterPill active={filter === "linear"} onClick={() => setFilter("linear")} label="Lineari" count={4} />
          <FilterPill active={filter === "nonlinear"} onClick={() => setFilter("nonlinear")} label="Non lineari" count={2} />
          <FilterPill active={filter === "dynamic"} onClick={() => setFilter("dynamic")} label="Dinamiche" count={3} />
          <FilterPill active={filter === "new"} onClick={() => setFilter("new")} label="NEW" count={3} />
        </div>

        {/* Solver catalog */}
        <div className="an-grid">
          {filteredSolvers.map((s) => (
            <SolverCard
              key={s.key}
              s={s}
              selected={activeSolver === s.key}
              onSelect={() => setActiveSolver(s.key)}
            />
          ))}
        </div>

        {/* Compare strip */}
        <div className="an-compare">
          <div className="an-compare-l">
            <span className="eyebrow">CONFRONTO TEMPI</span>
            <h4>Stima esecuzione su questo modello</h4>
          </div>
          <div className="an-bars">
            <BarRow label="Statica" value="0.84s" width={4} color="var(--accent)" />
            <BarRow label="Modale" value="1.2s" width={7} color="var(--purple)" />
            <BarRow label="Buckling" value="0.8s" width={5} color="var(--warn)" />
            <BarRow label="Newmark" value="3.2s" width={18} color="var(--coral)" />
            <BarRow label="Push-over" value="8.4s" width={46} color="var(--purple)" />
            <BarRow label="Time-history" value="14.5s" width={80} color="var(--warn)" />
          </div>
        </div>

      </main>

      {/* Right panel — params */}
      <AnalisiPanel solver={SOLVERS.find((s) => s.key === activeSolver)!} />
    </StudioShell>
  );
}


function FilterPill({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count: number;
}): JSX.Element {
  return (
    <button type="button" className={active ? "filter-pill is-active" : "filter-pill"} onClick={onClick}>
      {label} <span className="filter-count">{count}</span>
    </button>
  );
}


function SolverCard({ s, selected, onSelect }: {
  s: SolverDef; selected: boolean; onSelect: () => void;
}): JSX.Element {
  return (
    <article
      className={`solver-card${selected ? " is-selected" : ""}${s.isNew ? " solver-card-new" : ""}`}
      onClick={onSelect}
    >
      <header className="solver-head">
        <div className="solver-icon" style={{ background: s.iconBg, color: s.iconColor }}>
          {s.isNew ? <Wind size={22} strokeWidth={1.8} /> : <Activity size={22} strokeWidth={1.8} />}
        </div>
        <div className="solver-info">
          <h3>{s.title}</h3>
          <span className="solver-formula">{s.formula}</span>
        </div>
        <span className={`solver-badge ${s.badge === "PRONTA" ? "badge-ready" : "badge-new"}`}>{s.badge}</span>
      </header>
      <p className="solver-desc">{s.desc}</p>
      <div className="solver-meta">
        {s.stats.map(([k, v]) => (
          <span key={k} className="solver-stat">
            <span className="stat-k">{k}</span>
            <span className="stat-v">{v}</span>
          </span>
        ))}
      </div>
      <footer className="solver-foot">
        <button type="button" className="btn-secondary btn-sm">Parametri…</button>
        <button type="button" className="btn-primary btn-sm">
          <Play size={11} fill="currentColor" />
          Esegui
        </button>
      </footer>
    </article>
  );
}


function BarRow({ label, value, width, color }: {
  label: string; value: string; width: number; color: string;
}): JSX.Element {
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${width}%`, background: color }} />
      </div>
      <span className="bar-val">{value}</span>
    </div>
  );
}


function AnalisiPanel({ solver }: { solver: SolverDef }): JSX.Element {
  const [method, setMethod] = useState<"lu" | "iterative">("lu");

  return (
    <aside className="s-panel">
      <header className="sp-head">
        <div className="sp-head-row">
          <div className="sp-icon"><Settings size={16} strokeWidth={1.8} /></div>
          <h2>{solver.title}</h2>
          <button type="button" className="sp-help">?</button>
        </div>
        <p className="sp-desc">Parametri del solver, opzioni di output, log monitor.</p>
      </header>

      <nav className="sp-tabs">
        <button type="button" className="sp-tab is-active">Parametri</button>
        <button type="button" className="sp-tab">Output</button>
        <button type="button" className="sp-tab">Monitor</button>
        <button type="button" className="sp-tab">Log</button>
      </nav>

      <div className="sp-body">

        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Solver</span>
            <span className="badge-info">DIRECT</span>
          </div>

          <label className="an-field">
            <span className="an-field-label">Metodo</span>
            <div className="an-radio">
              <button type="button" className={method === "lu" ? "an-radio-btn is-active" : "an-radio-btn"} onClick={() => setMethod("lu")}>
                LU diretto
              </button>
              <button type="button" className={method === "iterative" ? "an-radio-btn is-active" : "an-radio-btn"} onClick={() => setMethod("iterative")}>
                Iterativo (CG)
              </button>
            </div>
            <span className="an-field-hint">
              LU è raccomandato per modelli &lt; 50k DOF. CG per modelli sparsi grandi.
            </span>
          </label>

          <label className="an-field">
            <span className="an-field-label">Tolleranza</span>
            <div className="an-input">
              <input type="text" defaultValue="1e-9" />
              <span className="an-unit">rel</span>
            </div>
          </label>

          <label className="an-field">
            <span className="an-field-label">Iterazioni max</span>
            <div className="an-input">
              <input type="text" defaultValue="200" inputMode="decimal" />
              <span className="an-unit">N</span>
            </div>
          </label>
        </section>

        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Combinazione SLU attiva</span>
            <span className="badge-info">DEFAULT</span>
          </div>
          <p className="sp-section-text">
            Combinazione fondamentale EC0: <b>1.35 G + 1.50 Q</b>. Personalizza in <code>Combinazioni</code> dal pannello Carichi.
          </p>
        </section>

        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Stima costo · {solver.title}</span>
          </div>
          <div className="cost-card">
            <div className="cost-row">
              <span className="cost-k">Tempo solver</span>
              <span className="cost-v">{solver.stats[1]?.[1]}</span>
            </div>
            <div className="cost-row">
              <span className="cost-k">RAM picco</span>
              <span className="cost-v">12<small>MB</small></span>
            </div>
            <div className="cost-row">
              <span className="cost-k">Output</span>
              <span className="cost-v">u, σ, M, V<small> (default)</small></span>
            </div>
          </div>
          <button type="button" className="btn-primary btn-lg btn-block">
            <Play size={14} fill="currentColor" />
            Esegui {solver.title.toLowerCase()}
          </button>
        </section>

      </div>
    </aside>
  );
}
