/**
 * MobileShowcasePage · v2.8.0 Phase 6.3 mockup-driven
 *
 * Showcase mobile redesign: 3 stati (Viewer + Inspector / Results KPIs / Home).
 * Replica condensata di Mobile.html con phone-frame demo.
 *
 * Route: /design/mobile (showcase only — il mobile reale dell'app
 * usa il responsive del sito web; questo file mostra la VISION mobile).
 */
import { useState } from "react";
import { ArrowLeft, BarChart3, Box, ChevronRight, Cog, FileText, ListChecks, MoreHorizontal, Package, Shuffle } from "lucide-react";

import "../styles/mobile-showcase.css";


type MobileState = "viewer" | "results" | "home";


export function MobileShowcasePage(): JSX.Element {
  const [state, setState] = useState<MobileState>("viewer");

  return (
    <div className="mob-stage">
      <nav className="mob-switcher">
        {([
          ["viewer", "Viewer + Inspector"],
          ["results", "Results KPIs"],
          ["home", "Home"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={k === state ? "ms-tab is-active" : "ms-tab"}
            onClick={() => setState(k)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mob-grid">
        <div className="phone">
          {/* iOS Status bar */}
          <div className="ph-status">
            <span className="ph-time">14:32</span>
            <div className="ph-notch" />
            <div className="ph-icons">
              <span style={{ fontSize: 11, fontWeight: 700 }}>•••</span>
              <span style={{ fontSize: 11 }}>📶</span>
              <span style={{ fontSize: 11 }}>🔋</span>
            </div>
          </div>

          {state === "viewer" && <ViewerScreen />}
          {state === "results" && <ResultsScreen />}
          {state === "home" && <HomeScreen />}

          <TabBar state={state} />
        </div>
      </div>
    </div>
  );
}


function ViewerScreen(): JSX.Element {
  return (
    <>
      <header className="ph-topbar">
        <button type="button" className="ph-iconbtn" aria-label="Indietro">
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className="ph-title-stack">
          <span className="ph-eyebrow">UC1 · MODELLO</span>
          <h1 className="ph-title">Trave bi-appoggiata</h1>
        </div>
        <button type="button" className="ph-iconbtn" aria-label="Altro">
          <MoreHorizontal size={18} strokeWidth={2} />
        </button>
      </header>

      <div className="ph-trust-row">
        <span className="ph-trust">
          <span className="ph-trust-dot" />
          PRELIMINARY
        </span>
        <span className="ph-saved">salvato 14:32</span>
      </div>

      <div className="ph-viewport">
        <div className="ph-vp-grid" />
        <svg viewBox="0 0 320 240" className="ph-svg">
          {/* Load */}
          <g stroke="var(--coral)" strokeWidth="1" opacity="0.8">
            <line x1="40" y1="60" x2="280" y2="60" strokeWidth="1.4" />
            {[60, 100, 140, 180, 220, 260].map((x) => (
              <line key={x} x1={x} y1="62" x2={x} y2="100" />
            ))}
            <text x="40" y="50" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill="var(--coral)">q=10 kN/m</text>
          </g>

          {/* Beam */}
          <line x1="40" y1="120" x2="280" y2="120" stroke="var(--ink)" strokeWidth="6" />

          {/* Nodes */}
          <g fill="var(--bg-panel)" stroke="var(--ink)" strokeWidth="2">
            <circle cx="40" cy="120" r="5" />
            {[80, 120, 200, 240].map((x) => <circle key={x} cx={x} cy="120" r="3" />)}
            <circle cx="160" cy="120" r="4" fill="var(--accent)" stroke="var(--accent)" />
            <circle cx="280" cy="120" r="5" />
          </g>

          {/* Supports */}
          <g transform="translate(40 125)" stroke="var(--ink-muted)" strokeWidth="1.5" fill="none">
            <polygon points="0,0 -10,14 10,14" />
            <line x1="-14" y1="17" x2="14" y2="17" />
          </g>
          <g transform="translate(280 125)" stroke="var(--ink-muted)" strokeWidth="1.5" fill="none">
            <polygon points="0,0 -10,12 10,12" />
            <circle cx="-5" cy="16" r="1.8" />
            <circle cx="5" cy="16" r="1.8" />
            <line x1="-14" y1="20" x2="14" y2="20" />
          </g>

          {/* Span dim */}
          <text x="160" y="180" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fontWeight="700" fill="var(--ink-muted)">L = 6.00 m</text>
        </svg>
      </div>
    </>
  );
}


function ResultsScreen(): JSX.Element {
  return (
    <>
      <header className="ph-topbar">
        <button type="button" className="ph-iconbtn"><ArrowLeft size={18} strokeWidth={2} /></button>
        <div className="ph-title-stack">
          <span className="ph-eyebrow">UC1 · RISULTATI</span>
          <h1 className="ph-title">Statica lineare</h1>
        </div>
        <button type="button" className="ph-iconbtn"><MoreHorizontal size={18} strokeWidth={2} /></button>
      </header>

      <div className="ph-kpis">
        <div className="ph-kpi ph-kpi-tone-accent">
          <span className="ph-kpi-k">M_max</span>
          <span className="ph-kpi-v">45.0<small>kNm</small></span>
        </div>
        <div className="ph-kpi ph-kpi-tone-ok">
          <span className="ph-kpi-k">δ_max</span>
          <span className="ph-kpi-v">9.61<small>mm</small></span>
        </div>
        <div className="ph-kpi">
          <span className="ph-kpi-k">V_max</span>
          <span className="ph-kpi-v">30.0<small>kN</small></span>
        </div>
        <div className="ph-kpi ph-kpi-tone-accent">
          <span className="ph-kpi-k">UR EC3</span>
          <span className="ph-kpi-v">0.24</span>
        </div>
        <div className="ph-kpi" style={{ gridColumn: "1 / -1" }}>
          <span className="ph-kpi-k">GOVERNING · LTB · EL 5</span>
          <span className="ph-kpi-v" style={{ fontSize: 14 }}>EC3 §6.3.2 · χ_LT = 0.995</span>
        </div>
      </div>
    </>
  );
}


function HomeScreen(): JSX.Element {
  return (
    <div className="ph-home">
      <div className="ph-home-hero">
        <span className="ph-eyebrow" style={{ color: "var(--accent)" }}>BUONGIORNO · FEDERICO</span>
        <h2>Da dove ricominci oggi?</h2>
        <p>3 progetti in lavorazione · ultima sessione su UC1.</p>
      </div>

      <div className="ph-home-tiles">
        <button type="button" className="ph-home-tile">
          <div className="ph-home-tile-icon" style={{ background: "rgba(8,145,178,0.10)", color: "var(--accent)" }}>
            <Package size={20} strokeWidth={1.8} />
          </div>
          <div className="ph-home-tile-body">
            <h3>Nuovo modello vuoto</h3>
            <p>3 step di setup</p>
          </div>
          <ChevronRight size={16} style={{ color: "var(--ink-dim)" }} />
        </button>

        <button type="button" className="ph-home-tile">
          <div className="ph-home-tile-icon" style={{ background: "rgba(83,74,183,0.10)", color: "var(--purple)" }}>
            <FileText size={20} strokeWidth={1.8} />
          </div>
          <div className="ph-home-tile-body">
            <h3>Apri un template</h3>
            <p>9 modelli ricorrenti</p>
          </div>
          <ChevronRight size={16} style={{ color: "var(--ink-dim)" }} />
        </button>

        <button type="button" className="ph-home-tile">
          <div className="ph-home-tile-icon" style={{ background: "rgba(180,83,9,0.10)", color: "var(--warn)" }}>
            <ListChecks size={20} strokeWidth={1.8} />
          </div>
          <div className="ph-home-tile-body">
            <h3>Segui un percorso</h3>
            <p>Onboarding step-by-step</p>
          </div>
          <ChevronRight size={16} style={{ color: "var(--ink-dim)" }} />
        </button>
      </div>
    </div>
  );
}


function TabBar({ state }: { state: MobileState }): JSX.Element {
  return (
    <div className="ph-tabbar">
      <button type="button" className={state === "home" ? "ph-tab is-active" : "ph-tab"}>
        <Package size={18} strokeWidth={1.8} />
        Home
      </button>
      <button type="button" className={state === "viewer" ? "ph-tab is-active" : "ph-tab"}>
        <Box size={18} strokeWidth={1.8} />
        Modello
      </button>
      <button type="button" className="ph-tab">
        <Cog size={18} strokeWidth={1.8} />
        Analisi
      </button>
      <button type="button" className={state === "results" ? "ph-tab is-active" : "ph-tab"}>
        <BarChart3 size={18} strokeWidth={1.8} />
        Risultati
      </button>
      <button type="button" className="ph-tab">
        <Shuffle size={18} strokeWidth={1.8} />
        I/O
      </button>
    </div>
  );
}
