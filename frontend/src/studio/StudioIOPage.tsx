/**
 * StudioIOPage · v2.7.7 Phase 5.4 mockup-driven
 *
 * I/O & Collab hub: Dropzone import + recent imports + tool cards
 * (Export/Compare/Auto-detect/AI Copilot) + collab live strip.
 * Replica condensata di Studio IO.html.
 *
 * Route: /studio/io. Layout no-tree 3-col, ma main occupa colonne 2-3 full.
 */
import { useState } from "react";
import {
  ArrowDown, ArrowRight, ArrowUp, Bug, CheckCircle2, ChevronRight, Download, Search,
  Shuffle, Sparkles, Upload, Users,
} from "lucide-react";

import { StudioShell } from "./StudioShell";

import "../styles/studio.css";
import "../styles/studio-io.css";


type IOTab = "import" | "export" | "compare" | "autodetect" | "ai" | "collab";

interface RecentImport { format: string; name: string; when: string; native?: boolean }
const RECENT: readonly RecentImport[] = [
  { format: "JSON", name: "UC1_backup_14-15.json", when: "ieri", native: true },
  { format: "DXF", name: "portale_2D_vento.dxf", when: "3 giorni" },
  { format: "XLSX", name: "carichi_neve_calabria.xlsx", when: "5 giorni" },
];

interface ExportFmt { fmt: string; name: string; meta: string; cls?: string }
const EXPORTS: readonly ExportFmt[] = [
  { fmt: "PDF", name: "Report completo", meta: "reportlab · 7 sezioni", cls: "fc-tag-pdf" },
  { fmt: "XLSX", name: "Excel multi-sheet", meta: "openpyxl · 5–8 sheet", cls: "fc-tag-xlsx" },
  { fmt: "DXF", name: "CAD strutturato", meta: "FEA_* layers" },
  { fmt: "IFC", name: "BIM 4 / IFC 4", meta: "storey + axis" },
];

interface AutoDetectItem { name: string; result: string; tone: "ok" | "warn" | "info"; pip: string }
const AUTODETECT: readonly AutoDetectItem[] = [
  { name: "Nodi duplicati", result: "0 trovati", tone: "ok", pip: "✓" },
  { name: "Nodi coincidenti", result: "0 trovati", tone: "ok", pip: "✓" },
  { name: "Elementi orfani", result: "2 trovati", tone: "warn", pip: "!" },
  { name: "Vincoli labili", result: "stabile", tone: "ok", pip: "✓" },
  { name: "Mesh quality", result: "aspect 1.0", tone: "info", pip: "i" },
];

interface Collab { initials: string; name: string; meta: string; action: string; time: string; bg: string; isMe?: boolean }
const COLLAB: readonly Collab[] = [
  { initials: "FS", name: "Federico Sanna", meta: "Modello · ultima mutation 14:32:18", action: "Sta modificando", time: "ora", bg: "#0891B2", isMe: true },
  { initials: "MR", name: "Marco Rossi", meta: "Verifiche · EL 5 detail open", action: "Sta visualizzando", time: "2m fa", bg: "#534AB7" },
  { initials: "LB", name: "Laura Bianchi", meta: "Analisi · solver param", action: "Inattivo", time: "15m fa", bg: "#B45309" },
];


export function StudioIOPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<IOTab>("import");

  return (
    <StudioShell active="io" workspaceState="I/O · Hub" midLayout="no-tree">
      <main className="io-main">

        <div className="io-head">
          <span className="eyebrow eyebrow-accent">WORKSPACE · I/O &amp; COLLAB</span>
          <h1 className="io-title">Import · Export · Compare · AI · Collab</h1>
          <p className="io-sub">
            Tutto ciò che entra ed esce dal modello, più gli strumenti di confronto, l'AI Copilot e la collaborazione live con il team.
          </p>
        </div>

        <nav className="io-tabs">
          {(["import", "export", "compare", "autodetect", "ai", "collab"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={t === activeTab ? "io-tab is-active" : "io-tab"}
              onClick={() => setActiveTab(t)}
            >
              {labelForTab(t)}
            </button>
          ))}
        </nav>

        {/* Import section: dropzone + recent */}
        <div className="io-grid">
          <article className="io-card io-card-wide io-dropzone">
            <div className="dz-icon">
              <Upload size={36} strokeWidth={1.6} />
            </div>
            <div className="dz-body">
              <h3>Trascina qui un file</h3>
              <p>
                Oppure <a href="#scegli" onClick={(e) => e.preventDefault()}>scegli dal disco</a>. Supportati:{" "}
                <b>.json</b> (modello FEA Pro), <b>.dxf</b> (CAD), <b>.ifc</b> (BIM), <b>.xlsx</b> (tabellare).
              </p>
              <div className="dz-formats">
                <span className="format-chip"><span className="fc-tag fc-tag-native">JSON</span>FEA Pro</span>
                <span className="format-chip"><span className="fc-tag">DXF</span>AutoCAD</span>
                <span className="format-chip"><span className="fc-tag">IFC</span>BIM 4</span>
                <span className="format-chip"><span className="fc-tag">XLSX</span>Tabellare</span>
              </div>
            </div>
          </article>

          <article className="io-card">
            <header className="io-card-head">
              <div className="io-card-icon" style={{ background: "var(--bg-info)", color: "var(--accent)" }}>
                <Download size={18} strokeWidth={1.8} />
              </div>
              <div className="io-card-info">
                <h4>Import recenti</h4>
                <span className="io-card-meta">Ultimi 7 giorni</span>
              </div>
            </header>
            <div className="recent-imports">
              {RECENT.map((r) => (
                <div key={r.name} className="ri-row">
                  <span className={r.native ? "ri-tag fc-tag-native" : "ri-tag"}>{r.format}</span>
                  <span className="ri-name">{r.name}</span>
                  <span className="ri-when">{r.when}</span>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Tools row */}
        <div className="io-tools">

          {/* Export */}
          <article className="tool-card">
            <header className="tool-head">
              <div className="tool-icon" style={{ background: "var(--bg-success)", color: "var(--success)" }}>
                <Download size={20} strokeWidth={1.8} />
              </div>
              <div>
                <h3>Export</h3>
                <p>PDF · XLSX · DXF · IFC · JSON</p>
              </div>
            </header>
            <div className="tool-list">
              {EXPORTS.map((e) => (
                <button key={e.fmt} type="button" className="tool-list-item">
                  <span className={`tli-fmt ${e.cls ?? ""}`}>{e.fmt}</span>
                  <span className="tli-name">{e.name}</span>
                  <span className="tli-meta">{e.meta}</span>
                </button>
              ))}
            </div>
          </article>

          {/* Compare A/B */}
          <article className="tool-card">
            <header className="tool-head">
              <div className="tool-icon" style={{ background: "var(--bg-purple)", color: "var(--purple)" }}>
                <Shuffle size={20} strokeWidth={1.8} />
              </div>
              <div>
                <h3>Compare A/B</h3>
                <p>Diff strutturale + Δ% risultati</p>
              </div>
            </header>
            <div className="compare-snap">
              <div className="cs-row">
                <span className="cs-pip cs-pip-a">A</span>
                <div className="cs-info">
                  <span className="cs-name">Current · IPE 300</span>
                  <span className="cs-meta">14:32 · oggi</span>
                </div>
              </div>
              <span className="cs-vs">vs</span>
              <div className="cs-row">
                <span className="cs-pip cs-pip-b">B</span>
                <div className="cs-info">
                  <span className="cs-name">Pre-LTB · IPE 270</span>
                  <span className="cs-meta">13:18 · ieri</span>
                </div>
              </div>
            </div>
            <div className="compare-deltas">
              <div className="cd-row">
                <span className="cd-k">δ_max</span>
                <span><ArrowUp size={10} strokeWidth={3} /></span>
                <span className="cd-v cd-v-pos">+12.3%</span>
              </div>
              <div className="cd-row">
                <span className="cd-k">σ_max</span>
                <span><ArrowDown size={10} strokeWidth={3} /></span>
                <span className="cd-v cd-v-neg">−8.4%</span>
              </div>
              <div className="cd-row">
                <span className="cd-k">UR EC3</span>
                <span><ArrowRight size={10} strokeWidth={3} /></span>
                <span className="cd-v cd-v-zero">0.24 = 0.24</span>
              </div>
            </div>
            <button type="button" className="btn-secondary btn-sm tool-card-cta">
              Apri confronto completo
              <ArrowRight size={11} strokeWidth={2} />
            </button>
          </article>

          {/* Auto-detect */}
          <article className="tool-card">
            <header className="tool-head">
              <div className="tool-icon" style={{ background: "var(--bg-warn)", color: "var(--warn)" }}>
                <Bug size={20} strokeWidth={1.8} />
              </div>
              <div>
                <h3>Auto-detect</h3>
                <p>5 detector · fix automatici</p>
              </div>
            </header>
            <div className="autodetect-list">
              {AUTODETECT.map((a) => (
                <div key={a.name} className={`ad-row ad-${a.tone}`}>
                  <span className="ad-pip">{a.pip}</span>
                  <span className="ad-name">{a.name}</span>
                  <span className="ad-result">{a.result}</span>
                </div>
              ))}
            </div>
            <button type="button" className="btn-primary btn-sm tool-card-cta">
              <CheckCircle2 size={11} strokeWidth={2.4} />
              Applica 2 fix
            </button>
          </article>

          {/* AI Copilot */}
          <article className="tool-card tool-card-ai">
            <header className="tool-head">
              <div className="tool-icon" style={{ background: "linear-gradient(135deg, var(--accent), var(--purple))", color: "#FFFFFF" }}>
                <Sparkles size={20} strokeWidth={1.8} />
              </div>
              <div>
                <h3>AI Copilot</h3>
                <p>Q&amp;A · spiegazioni · ottimizzazione</p>
              </div>
              <span className="badge-new">CONTEXT</span>
            </header>
            <p className="sp-section-text">
              <b>Spiegami perché UR_max è su EL 5</b> — EL 5 sta tra N5 e N6, mezzeria della trave (x=3.0m).
              Il momento <code>M = qL²/8 = 45 kNm</code> è massimo lì, ed essendo zona libera da ritegni
              laterali, la verifica LTB (χ_LT) attiva la governing condition.
            </p>
            <button type="button" className="btn-secondary btn-sm tool-card-cta">
              <Search size={11} strokeWidth={1.8} />
              Chiedi al Copilot · ⌘K
            </button>
          </article>

        </div>

        {/* Collab strip */}
        <div className="collab-strip">
          <header className="collab-head">
            <div>
              <span className="eyebrow">COLLABORAZIONE LIVE</span>
              <h3>Persone connesse al modello</h3>
            </div>
            <button type="button" className="btn-secondary btn-sm">
              <Users size={11} />
              Invita collaboratore
            </button>
          </header>
          <div className="collab-list">
            {COLLAB.map((c) => (
              <div key={c.initials} className="collab-row">
                <span className="collab-avatar" style={{ background: c.bg }}>{c.initials}</span>
                <div className="collab-info">
                  <span className="collab-name">
                    {c.name}
                    {c.isMe && <span className="me-chip">tu</span>}
                  </span>
                  <span className="collab-meta">{c.meta}</span>
                </div>
                <span className="collab-action">
                  <span className="action-dot" />
                  <span>{c.action}</span>
                </span>
                <span className="collab-time">{c.time}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      <IOPanel />
    </StudioShell>
  );
}


function labelForTab(t: IOTab): string {
  switch (t) {
    case "import": return "Import";
    case "export": return "Export";
    case "compare": return "Compare A/B";
    case "autodetect": return "Auto-detect";
    case "ai": return "AI Copilot";
    case "collab": return "Collab live";
  }
}


function IOPanel(): JSX.Element {
  return (
    <aside className="s-panel">
      <header className="sp-head">
        <div className="sp-head-row">
          <div className="sp-icon"><Shuffle size={16} strokeWidth={1.8} /></div>
          <h2>I/O · Hub</h2>
          <button type="button" className="sp-help">?</button>
        </div>
        <p className="sp-desc">Cronologia, statistiche, opzioni avanzate import/export.</p>
      </header>

      <nav className="sp-tabs">
        <button type="button" className="sp-tab is-active">Cronologia</button>
        <button type="button" className="sp-tab">Mappature</button>
        <button type="button" className="sp-tab">Opzioni</button>
      </nav>

      <div className="sp-body">
        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Storia I/O · 30 giorni</span>
          </div>
          <p className="sp-section-text">
            <b>12 import</b> · 8 export · 3 compare A/B run. Spazio utilizzato <b>4.7 MB</b> / 100 MB (free tier).
          </p>
        </section>

        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Endpoint backend</span>
          </div>
          <p className="sp-section-text">
            POST <code>/api/import/dxf</code> · <code>/api/import/ifc</code> · <code>/api/export/*</code> ·
            <code>/api/compare</code> · <code>/api/autodetect</code>.
          </p>
        </section>

        <section className="sp-section">
          <div className="sp-section-head">
            <span className="eyebrow">Quick action</span>
          </div>
          <button type="button" className="btn-primary btn-block">
            <Download size={12} strokeWidth={2.4} />
            Esporta report PDF
          </button>
        </section>
      </div>
    </aside>
  );
}
