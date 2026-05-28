/**
 * StudioVerifichePage · v2.7.6 Phase 5.3 mockup-driven
 *
 * Eurocodici dashboard: Code tabs (EC2/EC3/EC5/EC8/NTC) + UR_max hero + gauge +
 * UR table per elemento. Replica condensata di Studio Verifiche.html.
 *
 * Route: /studio/verifiche (no-tree layout 3-col).
 */
import { useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";

import { StudioShell } from "./StudioShell";
import { useFirstModelId } from "./useFirstModelId";
import { exportApi } from "../api/io";
import { toast } from "../store/toastStore";
// v3.1 Fase 3: showcase banner (Studio v2 degradate a vetrina).
import { ShowcaseBanner } from "../design-showcase/ShowcaseBanner";

import "../styles/studio.css";
import "../styles/studio-verifiche.css";


type CodeKey = "ec2" | "ec3" | "ec5" | "ec8" | "ntc";

interface CodeDef {
  key: CodeKey;
  mark: string;
  title: string;
  meta: string;
  isNew?: boolean;
  activeUR?: string;
}

const CODES: readonly CodeDef[] = [
  { key: "ec2", mark: "EC2", title: "Calcestruzzo armato", meta: "flex · taglio · sez. rettangolari", isNew: true },
  { key: "ec3", mark: "EC3", title: "Acciaio", meta: "resistance · stability · LTB", activeUR: "0.24" },
  { key: "ec5", mark: "EC5", title: "Legno", meta: "trazione · comp · flex · taglio", isNew: true },
  { key: "ec8", mark: "EC8", title: "Sismica", meta: "spettro · q · drift · zone IT", isNew: true },
  { key: "ntc", mark: "NTC", title: "NTC 2018", meta: "combinazioni SLU · SLE", isNew: true },
];

interface URRow {
  id: string;
  sez: string;
  M_Ed: number;
  V_Ed: number;
  chiLT: number;
  UR_RES: number;
  UR_LTB: number;
  UR_max: number;
  gov: "RES" | "LTB";
  selected?: boolean;
}

const UR_ROWS: readonly URRow[] = [
  { id: "EL 1", sez: "IPE300 · S355", M_Ed: 15.0, V_Ed: 25.0, chiLT: 0.998, UR_RES: 0.080, UR_LTB: 0.080, UR_max: 0.08, gov: "RES" },
  { id: "EL 2", sez: "IPE300 · S355", M_Ed: 25.0, V_Ed: 22.0, chiLT: 0.996, UR_RES: 0.140, UR_LTB: 0.142, UR_max: 0.14, gov: "RES" },
  { id: "EL 3", sez: "IPE300 · S355", M_Ed: 35.0, V_Ed: 18.0, chiLT: 0.996, UR_RES: 0.187, UR_LTB: 0.190, UR_max: 0.19, gov: "RES" },
  { id: "EL 4", sez: "IPE300 · S355", M_Ed: 42.0, V_Ed: 15.0, chiLT: 0.995, UR_RES: 0.224, UR_LTB: 0.225, UR_max: 0.22, gov: "LTB" },
  { id: "EL 5", sez: "IPE300 · S355", M_Ed: 45.0, V_Ed: 15.0, chiLT: 0.995, UR_RES: 0.239, UR_LTB: 0.240, UR_max: 0.24, gov: "LTB", selected: true },
  { id: "EL 6", sez: "IPE300 · S355", M_Ed: 42.0, V_Ed: 15.0, chiLT: 0.995, UR_RES: 0.224, UR_LTB: 0.225, UR_max: 0.22, gov: "LTB" },
  { id: "EL 7", sez: "IPE300 · S355", M_Ed: 35.0, V_Ed: 18.0, chiLT: 0.996, UR_RES: 0.187, UR_LTB: 0.190, UR_max: 0.19, gov: "RES" },
];


// ── Page ────────────────────────────────────────────────────────────────

export function StudioVerifichePage(): JSX.Element {
  const [activeCode, setActiveCode] = useState<CodeKey>("ec3");
  const [filter, setFilter] = useState<"all" | "res" | "ltb" | "shear">("all");
  const { modelId } = useFirstModelId();

  // v2.9.0 Sprint B M1.3: wire "Esporta tabella" al backend
  // GET /api/io/export/{model_id}/xlsx → download Blob.
  const onExportTable = async () => {
    if (!modelId) {
      toast("error","Apri prima un modello dalla gallery Templates");
      return;
    }
    try {
      await exportApi.xlsx(modelId, "verifiche-uc1");
      toast("success","Tabella verifiche esportata in XLSX");
    } catch (err) {
      toast("error",`Errore export: ${(err as Error).message}`);
    }
  };

  return (
    <>
    <ShowcaseBanner pageName="Studio Verifiche" />
    <div style={{ paddingTop: 36 }}>
    <StudioShell active="verifiche" workspaceState="Verifiche · EC3" midLayout="no-tree">
      <main className="ve-main">

        <div className="ve-head">
          <div className="ve-head-l">
            <span className="eyebrow eyebrow-accent">WORKSPACE · VERIFICHE</span>
            <h1 className="ve-title">Verifiche Eurocodici</h1>
            <p className="ve-sub">
              Stati limite ultimi e di esercizio · 5 norme · UR_max, governing check, e dettagli per elemento.
            </p>
          </div>
          <div className="ve-head-r">
            <div className="ve-trust-card">
              <span className="eyebrow">SINTESI</span>
              <div className="trust-line">
                <span className="trust-pip trust-pip-ok">3</span>
                <span className="trust-pip trust-pip-warn">2</span>
                <span className="trust-pip trust-pip-fail">0</span>
                <span className="trust-pip trust-pip-disabled">5</span>
              </div>
              <span className="trust-text">5/10 elementi verificati · 2 borderline · 0 fail</span>
            </div>
          </div>
        </div>

        {/* Codes tabs */}
        <nav className="codes-tabs">
          {CODES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={c.key === activeCode ? "codes-tab is-active" : "codes-tab"}
              onClick={() => setActiveCode(c.key)}
            >
              <div className={`ct-mark ct-mark-${c.key}`}>{c.mark}</div>
              <div className="ct-info">
                <span className="ct-title">{c.title}</span>
                <span className="ct-meta">{c.meta}</span>
              </div>
              {c.isNew ? <span className="badge-new">NEW</span> : c.activeUR ? <span className="ct-ur">UR {c.activeUR}</span> : null}
            </button>
          ))}
        </nav>

        {/* EC3 board */}
        <div className="ec3-board">

          {/* Hero UR_max + gauge + checks grid */}
          <div className="ec3-hero">
            <div className="hero-l">
              <span className="eyebrow">UR_MAX · GLOBALE</span>
              <div className="hero-ur">
                <span className="hero-ur-v">0.24</span>
                <span className="hero-ur-sub">/ 1.00 limite SLU</span>
              </div>
              <div className="hero-gauge">
                <div className="gauge-track">
                  <div className="gauge-fill" style={{ width: "24%" }} />
                </div>
                <div className="gauge-pointer" style={{ left: "24%" }}>
                  <span className="gauge-pointer-v">0.24</span>
                </div>
              </div>
              <div className="hero-meta">
                <span><span className="meta-pip meta-pip-ok" />Sotto soglia · OK</span>
                <span>·</span>
                <span>Governing: <b>LTB · EC3 §6.3.2</b></span>
                <span>·</span>
                <span>Critical: <b>EL 5</b></span>
              </div>
            </div>
            <div className="hero-r">
              <div className="ec-stat">
                <span className="eyebrow">CHECKS</span>
                <div className="ec-stat-grid">
                  <StatCell k="Resistance" v="10/10" tone="ok" />
                  <StatCell k="Stability" v="10/10" tone="ok" />
                  <StatCell k="LTB" v="7/10" tone="warn" />
                  <StatCell k="Shear" v="10/10" tone="ok" />
                  <StatCell k="Interaction" v="10/10" tone="ok" />
                  <StatCell k="SLE δ" v="10/10" tone="ok" />
                </div>
              </div>
            </div>
          </div>

          {/* UR per elemento table */}
          <div className="ec3-section">
            <header className="ec3-section-head">
              <div>
                <span className="eyebrow">UR PER ELEMENTO</span>
                <h3>Utilization ratio per ogni elemento beam</h3>
              </div>
              <div className="ec3-section-actions">
                <div className="seg">
                  {(["all", "res", "ltb", "shear"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={f === filter ? "seg-btn is-active" : "seg-btn"}
                      onClick={() => setFilter(f)}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn-secondary btn-sm" onClick={onExportTable}>Esporta tabella</button>
              </div>
            </header>

            <div className="ur-table">
              <div className="ur-thead">
                <span>ELEM</span>
                <span>SEZ · MAT</span>
                <span>M_Ed [kNm]</span>
                <span>V_Ed [kN]</span>
                <span>χ_LT</span>
                <span>UR_RES</span>
                <span>UR_LTB</span>
                <span>UR_max</span>
                <span>GOV</span>
                <span />
              </div>
              <div className="ur-tbody">
                {UR_ROWS.map((r) => (
                  <div key={r.id} className={r.selected ? "ur-row is-selected" : "ur-row"}>
                    <span className="ur-id">{r.id}</span>
                    <span className="ur-sez">{r.sez}</span>
                    <span className="ur-num">{r.M_Ed.toFixed(1)}</span>
                    <span className="ur-num">{r.V_Ed.toFixed(1)}</span>
                    <span className="ur-num">{r.chiLT.toFixed(3)}</span>
                    <span className="ur-num">{r.UR_RES.toFixed(3)}</span>
                    <span className="ur-num">{r.UR_LTB.toFixed(3)}</span>
                    <span className="ur-vmax">
                      <span className="ur-bar">
                        <span style={{ width: `${r.UR_max * 100}%`, background: r.UR_max < 0.20 ? "var(--success)" : "var(--accent)" }} />
                      </span>
                      <span className="ur-vmax-v">{r.UR_max.toFixed(2)}</span>
                    </span>
                    <span className={`ur-gov gov-${r.gov.toLowerCase()}`}>{r.gov}</span>
                    <span className="ur-actions">
                      <button type="button" aria-label="Dettagli">▸</button>
                    </span>
                  </div>
                ))}
              </div>
              <div className="ur-tfoot">
                <span>Mostrati 7 / 10 elementi</span>
                <a href="#mostratutti" onClick={(e) => e.preventDefault()}>mostra tutti →</a>
              </div>
            </div>
          </div>

        </div>

      </main>

      <VerifichePanel />
    </StudioShell>
    </div>
    </>
  );
}


function StatCell({ k, v, tone }: { k: string; v: string; tone: "ok" | "warn" | "fail" }): JSX.Element {
  return (
    <div className="ec-stat-cell">
      <span className="cell-k">{k}</span>
      <span className={`cell-v ${tone}`}>{v}</span>
    </div>
  );
}


function VerifichePanel(): JSX.Element {
  return (
    <aside className="s-panel">
      <header className="sp-head">
        <div className="sp-head-row">
          <div className="sp-icon"><CheckCircle2 size={16} strokeWidth={1.8} /></div>
          <h2>Dettaglio · EL 5</h2>
          <button type="button" className="sp-help">?</button>
        </div>
        <p className="sp-desc">Verifica LTB · EC3 §6.3.2 · governing check.</p>
      </header>

      <nav className="sp-tabs">
        <button type="button" className="sp-tab is-active">Sintesi</button>
        <button type="button" className="sp-tab">Formula</button>
        <button type="button" className="sp-tab">Combinazioni</button>
      </nav>

      <div className="sp-body">
        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">UR governing · LTB</span>
            <span className="badge-info">EC3 §6.3.2</span>
          </div>
          <div className="cost-card">
            <div className="cost-row">
              <span className="cost-k">UR_LTB</span>
              <span className="cost-v">0.24</span>
            </div>
            <div className="cost-row">
              <span className="cost-k">M_Ed</span>
              <span className="cost-v">45.0<small>kNm</small></span>
            </div>
            <div className="cost-row">
              <span className="cost-k">M_b,Rd</span>
              <span className="cost-v">186.8<small>kNm</small></span>
            </div>
            <div className="cost-row">
              <span className="cost-k">χ_LT</span>
              <span className="cost-v">0.995</span>
            </div>
            <div className="cost-row">
              <span className="cost-k">λ̄_LT</span>
              <span className="cost-v">0.142</span>
            </div>
          </div>
        </section>

        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Margine sicurezza</span>
          </div>
          <p className="sp-section-text">
            UR = 0.24 &lt; 1.00 · margine <b>76%</b>. La sezione IPE 300 in S355 è
            <b> ampiamente sovradimensionata</b> per il carico q = 10 kN/m attuale.
          </p>
          <button type="button" className="btn-primary btn-block">
            <ChevronRight size={12} strokeWidth={2.4} />
            Apri formula completa
          </button>
        </section>
      </div>
    </aside>
  );
}
