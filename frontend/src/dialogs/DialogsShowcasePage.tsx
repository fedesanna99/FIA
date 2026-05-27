/**
 * DialogsShowcasePage · v2.8.0 Phase 6.1 mockup-driven
 *
 * Showcase dei 4 dialog del design system: Node/Element · Load/Constraint
 * · Mesh parametric · New Model. Replica condensata di Dialogs.html.
 *
 * Route: /design/dialogs (showcase only, NON used in production flows —
 * i dialog reali sono in components/dialogs/ legacy che vanno refactored
 * separatamente in iter futuri).
 */
import { useState } from "react";
import { Box, Cog, FileText, X } from "lucide-react";

import "../styles/dialogs.css";


type DialogState = "node" | "load" | "mesh" | "new";


export function DialogsShowcasePage(): JSX.Element {
  const [active, setActive] = useState<DialogState>("node");

  return (
    <div className="dlg-stage">
      {/* BG mock studio */}
      <div className="dlg-bg" aria-hidden="true">
        <div className="bg-topbar" />
        <div className="bg-mid">
          <div className="bg-rail" />
          <div className="bg-viewport">
            <svg viewBox="0 0 800 360">
              <g opacity="0.15" stroke="var(--border)" strokeWidth="0.5">
                <line x1="0" y1="60" x2="800" y2="60" />
                <line x1="0" y1="180" x2="800" y2="180" />
                <line x1="0" y1="300" x2="800" y2="300" />
                <line x1="100" y1="0" x2="100" y2="360" />
                <line x1="400" y1="0" x2="400" y2="360" />
                <line x1="700" y1="0" x2="700" y2="360" />
              </g>
              <line x1="100" y1="180" x2="700" y2="180" stroke="var(--ink)" strokeWidth="6" opacity="0.40" />
              <circle cx="100" cy="180" r="4" fill="var(--ink)" opacity="0.4" />
              <circle cx="700" cy="180" r="4" fill="var(--ink)" opacity="0.4" />
            </svg>
          </div>
          <div className="bg-panel" />
        </div>
      </div>

      <nav className="dlg-switcher">
        {([
          ["node", "Node / Element"],
          ["load", "Load · Constraint"],
          ["mesh", "Mesh wizard"],
          ["new", "New Model"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={active === key ? "dlg-tab is-active" : "dlg-tab"}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="dlg-backdrop" />

      {active === "node" && <NodeDialog />}
      {active === "load" && <LoadDialog />}
      {active === "mesh" && <MeshWizardDialog />}
      {active === "new" && <NewModelDialog />}
    </div>
  );
}


// ── 1. Node / Element dialog ────────────────────────────────────────────

function NodeDialog(): JSX.Element {
  const [activeTab, setActiveTab] = useState<"coord" | "dof" | "loads" | "adv">("coord");

  return (
    <div className="dialog">
      <header className="d-head">
        <div className="d-head-l">
          <div className="d-icon" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
            <Box size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span className="eyebrow">EDIT · NODO ATTIVO</span>
            <h2>Modifica Nodo · <span className="d-tag">N5</span></h2>
          </div>
        </div>
        <button type="button" className="d-close" aria-label="Chiudi">
          <X size={14} strokeWidth={2} />
        </button>
      </header>

      <nav className="d-tabs">
        {(["coord", "dof", "loads", "adv"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={t === activeTab ? "d-tab is-active" : "d-tab"}
            onClick={() => setActiveTab(t)}
          >
            {t === "coord" ? "Coordinate" : t === "dof" ? "DOF · Vincoli" : t === "loads" ? "Carichi nodali" : "Avanzato"}
          </button>
        ))}
      </nav>

      <div className="d-body">
        <section className="d-section">
          <span className="eyebrow">POSIZIONE · GLOBALE</span>
          <div className="coord-grid">
            <label className="d-field">
              <span className="d-field-label">X</span>
              <div className="d-input d-input-x">
                <input type="text" defaultValue="2.400" />
                <span className="d-unit">m</span>
              </div>
            </label>
            <label className="d-field">
              <span className="d-field-label">Y</span>
              <div className="d-input d-input-y">
                <input type="text" defaultValue="0.000" />
                <span className="d-unit">m</span>
              </div>
            </label>
            <label className="d-field">
              <span className="d-field-label">Z</span>
              <div className="d-input d-input-z">
                <input type="text" defaultValue="0.000" />
                <span className="d-unit">m</span>
              </div>
            </label>
          </div>
        </section>

        <section className="d-section">
          <span className="eyebrow">GRADI DI LIBERTÀ · VINCOLI</span>
          <div className="dof-grid">
            {(["ux", "uy", "uz", "rx", "ry", "rz"] as const).map((d, i) => (
              <div key={d} className={i < 2 ? "dof-tile is-on" : "dof-tile"}>
                <span className="dof-tile-label">{d.toUpperCase()}</span>
                <span>{i < 2 ? "fix" : "free"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="d-foot">
        <div className="d-foot-l">
          <span className="d-foot-meta">Ultima mutation 14:32:18 · CRN</span>
        </div>
        <button type="button" className="btn-secondary">Annulla</button>
        <button type="button" className="btn-primary">Salva modifiche</button>
      </footer>
    </div>
  );
}


// ── 2. Load / Constraint dialog ─────────────────────────────────────────

function LoadDialog(): JSX.Element {
  return (
    <div className="dialog">
      <header className="d-head">
        <div className="d-head-l">
          <div className="d-icon" style={{ background: "var(--bg-coral)", color: "var(--coral)" }}>
            <FileText size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span className="eyebrow">EDIT · CARICO DISTRIBUITO</span>
            <h2>Carico · <span className="d-tag">EL 1-10</span></h2>
          </div>
        </div>
        <button type="button" className="d-close" aria-label="Chiudi">
          <X size={14} strokeWidth={2} />
        </button>
      </header>

      <div className="d-body">
        <section className="d-section">
          <span className="eyebrow">INTENSITÀ</span>
          <label className="d-field">
            <span className="d-field-label">q (intensità)</span>
            <div className="d-input">
              <input type="text" defaultValue="10.0" />
              <span className="d-unit">kN/m</span>
            </div>
          </label>
          <label className="d-field">
            <span className="d-field-label">Direzione</span>
            <div className="d-input">
              <select defaultValue="-Z">
                <option>−Z (gravità)</option>
                <option>−Y</option>
                <option>+X</option>
              </select>
            </div>
          </label>
        </section>

        <section className="d-section">
          <span className="eyebrow">COMBINAZIONE SLU</span>
          <label className="d-field">
            <span className="d-field-label">Coefficient γ</span>
            <div className="d-input">
              <select defaultValue="1.35">
                <option>γG = 1.35 (permanenti)</option>
                <option>γQ = 1.50 (variabili)</option>
              </select>
            </div>
          </label>
        </section>
      </div>

      <footer className="d-foot">
        <button type="button" className="btn-secondary">Annulla</button>
        <button type="button" className="btn-primary">Applica carico</button>
      </footer>
    </div>
  );
}


// ── 3. Mesh parametric wizard ───────────────────────────────────────────

function MeshWizardDialog(): JSX.Element {
  return (
    <div className="dialog dialog-wide">
      <header className="d-head">
        <div className="d-head-l">
          <div className="d-icon" style={{ background: "var(--bg-purple)", color: "var(--purple)" }}>
            <Cog size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span className="eyebrow eyebrow-purple">WIZARD · MESH PARAMETRICA</span>
            <h2>Genera mesh · <span className="d-tag">Lineare</span></h2>
          </div>
        </div>
        <button type="button" className="d-close" aria-label="Chiudi">
          <X size={14} strokeWidth={2} />
        </button>
      </header>

      <div className="d-body">
        <section className="d-section">
          <span className="eyebrow">FORMA · LINEARE (beam)</span>
          <div className="coord-grid">
            <label className="d-field">
              <span className="d-field-label">Lunghezza · L</span>
              <div className="d-input">
                <input type="text" defaultValue="6.00" />
                <span className="d-unit">m</span>
              </div>
            </label>
            <label className="d-field">
              <span className="d-field-label">Sotto-divisione</span>
              <div className="d-input">
                <input type="text" defaultValue="10" />
                <span className="d-unit">elem</span>
              </div>
            </label>
            <label className="d-field">
              <span className="d-field-label">Origine</span>
              <div className="d-input">
                <input type="text" defaultValue="(0, 0, 0)" />
                <span className="d-unit">m</span>
              </div>
            </label>
          </div>
        </section>

        <section className="d-section">
          <span className="eyebrow">PREVIEW · OUTPUT</span>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: 0 }}>
            Genererà <b>10 beam</b> · <b>11 nodi</b> · spaziatura uniforme 0.60 m
            lungo X. Sezione e materiale prendono il default attivo (IPE 300 · S355).
          </p>
        </section>
      </div>

      <footer className="d-foot">
        <div className="d-foot-l">
          <span className="d-foot-meta">Step 1/1 · validato</span>
        </div>
        <button type="button" className="btn-secondary">Annulla</button>
        <button type="button" className="btn-primary">Genera mesh</button>
      </footer>
    </div>
  );
}


// ── 4. New Model dialog ─────────────────────────────────────────────────

function NewModelDialog(): JSX.Element {
  return (
    <div className="dialog dialog-new">
      <header className="d-head">
        <div className="d-head-l">
          <div className="d-icon" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
            <FileText size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span className="eyebrow eyebrow-accent">NUOVO MODELLO · SETUP</span>
            <h2>Crea un nuovo modello FEA Pro</h2>
          </div>
        </div>
        <button type="button" className="d-close" aria-label="Chiudi">
          <X size={14} strokeWidth={2} />
        </button>
      </header>

      <div className="d-body">
        <section className="d-section">
          <span className="eyebrow">METADATA</span>
          <label className="d-field">
            <span className="d-field-label">Nome modello</span>
            <div className="d-input">
              <input type="text" defaultValue="Trave bi-appoggiata UC1" style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }} />
            </div>
          </label>
          <label className="d-field">
            <span className="d-field-label">Sistema unità</span>
            <div className="d-input">
              <select defaultValue="SI">
                <option>SI · kN, m, MPa</option>
                <option>IS · lb, ft, psi</option>
              </select>
            </div>
          </label>
        </section>

        <section className="d-section">
          <span className="eyebrow">SISTEMA COORDINATO</span>
          <div className="coord-grid">
            {(["Cartesiano", "Cilindrico", "Sferico"] as const).map((s, i) => (
              <div key={s} className={i === 0 ? "dof-tile is-on" : "dof-tile"}>
                <span className="dof-tile-label">{s.slice(0, 3).toUpperCase()}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="d-foot">
        <div className="d-foot-l">
          <span className="d-foot-meta">3 step di setup · 1/3</span>
        </div>
        <button type="button" className="btn-secondary">Annulla</button>
        <button type="button" className="btn-primary">Avanti →</button>
      </footer>
    </div>
  );
}
