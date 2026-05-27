/**
 * PercorsoUC1Page · v2.7.3 Phase 4.3b mockup-driven
 *
 * Stepper guidato a 6 step per il Use Case 1 (Trave bi-appoggiata).
 * Replica esatta di `ui_kits/webapp_desktop/Percorso UC1.html` (482 righe)
 * + `percorso-uc1.css` (785 righe) namespaced sotto `.puc *` wrapper.
 *
 * Step canonici (allineati al PercorsoStepper legacy):
 *   1. Geometria   (L, sezione, materiale)
 *   2. Vincoli     (cerniera + carrello)
 *   3. Carichi     (q distribuito 10 kN/m -Z)
 *   4. Solve       (lancia analisi statica)
 *   5. Verify EC3  (UR LTB ~0.24)
 *   6. Export      (PDF report)
 *
 * Layout: Topbar (56px) + Stepper strip + Main grid (Coach 380px ·
 * Canvas flex-1 · Inspector 380px).
 *
 * MVP v2.7.3: contenuti coach + inspector + expected results sono
 * hardcoded mockup-faithful. Il click "Avanti" avanza lo stato `step`
 * ma non chiama ancora il backend (TODO: integrare con useRunAnalysis
 * dal PercorsiBeamWizard legacy nel prossimo iter v2.7.3.x).
 *
 * Route: /percorsi/uc1 (montato in main.tsx dentro AuthGate).
 * Exit: Link a Dashboard ("/").
 */
import { Fragment, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";

import "../styles/percorso-uc1.css";


// ── Step model ──────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface StepDef {
  num: Step;
  numLabel: string;   // "01" "02" ecc
  title: string;
}

const STEPS: readonly StepDef[] = [
  { num: 1, numLabel: "01", title: "Geometria" },
  { num: 2, numLabel: "02", title: "Vincoli" },
  { num: 3, numLabel: "03", title: "Carichi" },
  { num: 4, numLabel: "04", title: "Solve" },
  { num: 5, numLabel: "05", title: "Verify EC3" },
  { num: 6, numLabel: "06", title: "Export" },
];


// ── Page ────────────────────────────────────────────────────────────────

export function PercorsoUC1Page(): JSX.Element {
  // Default step 3 come da mockup (Carichi attivo, 01-02 done).
  const [step, setStep] = useState<Step>(3);

  // Form state per il form "Nuovo carico distribuito" (mockup hardcoded).
  const [loadType, setLoadType] = useState("dist-uniform");
  const [intensity, setIntensity] = useState("10.0");
  const [direction, setDirection] = useState<"+X" | "+Y" | "+Z" | "-X" | "-Y" | "-Z">("-Z");
  const [slu, setSlu] = useState("gG135");

  // Mocked existing loads (vuoto come da mockup).
  const [loads, _setLoads] = useState<unknown[]>([]);

  const stepDef = STEPS[step - 1];
  const progressPct = Math.round(((step - 1) / 6) * 100);

  return (
    <div className="puc percorso">

      {/* ╔═══════════ TOPBAR ═══════════╗ */}
      <header className="p-topbar">
        <Link className="p-brand" to="/">
          <span className="p-brand-square">F</span>
          <span className="p-brand-name">FEA Pro</span>
        </Link>

        <div className="p-breadcrumb">
          <Link to="/">Home</Link>
          <span className="p-bc-sep">/</span>
          <Link to="/templates">Percorsi</Link>
          <span className="p-bc-sep">/</span>
          <span className="p-bc-now">UC1 · Trave bi-appoggiata</span>
        </div>

        <Link className="p-exit" to="/">
          <X size={14} />
          Salva ed esci
        </Link>
      </header>

      {/* ╔═══════════ STEPPER STRIP ═══════════╗ */}
      <div className="p-stepper-wrap">
        <div className="p-stepper">
          {STEPS.map((s, idx) => {
            const isDone = s.num < step;
            const isActive = s.num === step;
            const cls = isDone ? "p-step is-done" : isActive ? "p-step is-active" : "p-step";
            return (
              <Fragment key={s.num}>
                <button
                  type="button"
                  className={cls}
                  onClick={() => setStep(s.num)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="p-step-bullet">
                    {isDone ? <Check size={14} strokeWidth={3} /> : <span>{s.num}</span>}
                  </div>
                  <div className="p-step-info">
                    <span className="p-step-num">
                      {s.numLabel}{isActive ? " · In corso" : ""}
                    </span>
                    <span className="p-step-title">{s.title}</span>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={s.num < step ? "p-step-line is-done" : "p-step-line"}
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        <div className="p-progress">
          <div className="p-progress-bar">
            <span style={{ width: `${progressPct}%` }} />
          </div>
          <span className="p-progress-meta">
            Avanzamento <b>{step - 1}/6</b> · ~5 min al solver
          </span>
        </div>
      </div>

      {/* ╔═══════════ MAIN ═══════════╗ */}
      <main className="p-main">

        {/* LEFT · COACH */}
        <CoachAside step={step} setStep={setStep} />

        {/* CENTER · CANVAS */}
        <CanvasCenter step={step} />

        {/* RIGHT · INSPECTOR */}
        <InspectorAside
          loadType={loadType}
          setLoadType={setLoadType}
          intensity={intensity}
          setIntensity={setIntensity}
          direction={direction}
          setDirection={setDirection}
          slu={slu}
          setSlu={setSlu}
          loadsCount={loads.length}
        />

      </main>
    </div>
  );
}


// ── Coach panel (left) ──────────────────────────────────────────────────

function CoachAside({ step, setStep }: { step: Step; setStep: (s: Step) => void }): JSX.Element {
  // Step 3 hardcoded mockup-faithful. Per altri step, mostro placeholder
  // narrativo (Phase 4.3b MVP — espandere nei prossimi iter).
  if (step !== 3) {
    return (
      <aside className="p-coach">
        <div className="coach-card">
          <header className="coach-head">
            <span className="eyebrow eyebrow-accent">
              STEP {String(step).padStart(2, "0")} · {STEPS[step - 1].title.toUpperCase()}
            </span>
            <h1 className="coach-title">{STEPS[step - 1].title}</h1>
            <p className="coach-sub">
              Contenuto coach per lo step <b>{STEPS[step - 1].title}</b>. Da espandere
              nei prossimi iter v2.7.3.x con le sezioni mockup-driven per ciascuno
              step (1, 2, 4, 5, 6).
            </p>
          </header>
          <div className="coach-nav">
            <button
              className="btn-secondary"
              onClick={() => setStep(Math.max(1, step - 1) as Step)}
              disabled={step === 1}
            >
              <ArrowLeft size={12} />
              Indietro
            </button>
            <button
              className="btn-primary"
              onClick={() => setStep(Math.min(6, step + 1) as Step)}
              disabled={step === 6}
            >
              Avanti
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="p-coach">
      <div className="coach-card">
        <header className="coach-head">
          <span className="eyebrow eyebrow-accent">STEP 3 · CARICHI</span>
          <h1 className="coach-title">Aggiungi il carico distribuito sulla trave</h1>
          <p className="coach-sub">
            Il carico verticale uniformemente distribuito è il più frequente nelle strutture
            civili: peso proprio dell'impalcato, sovraccarico d'esercizio, neve. Lo applichiamo
            sull'<b>intera lunghezza della trave</b> verso il basso (gravità).
          </p>
        </header>

        <div className="coach-section">
          <span className="eyebrow">COSA FARE</span>
          <ol className="coach-list">
            <li><b>Seleziona</b> la trave nel canvas (è già evidenziata).</li>
            <li>Clicca <span className="kbd-pill">+ Aggiungi carico</span> nel pannello a destra.</li>
            <li>Inserisci <span className="value-pill">q = 10 kN/m</span> con direzione <span className="value-pill">-Z</span>.</li>
            <li>Avanti <span className="kbd-pill">→</span> per passare al solver.</li>
          </ol>
        </div>

        <div className="coach-section">
          <span className="eyebrow">PERCHÉ</span>
          <p className="coach-section-body">
            10 kN/m simula un impalcato civile da circa <b>1.0 kN/m² × 10 m di influenza</b>.
            Per validare il tuo modello, mantieni questo valore standard: i risultati attesi
            saranno <code>M_max ≈ 45 kNm</code>, <code>δ_max ≈ 9.6 mm</code>.
          </p>
        </div>

        <div className="coach-section coach-formula">
          <span className="eyebrow">FORMULA · TRAVE BI-APPOGGIATA</span>
          <div className="formula-block">
            <div className="formula-row">
              <span className="formula-lhs">M<sub>max</sub></span>
              <span className="formula-eq">=</span>
              <span className="formula-rhs">q L² / 8</span>
              <span className="formula-eval">= 45.0 kNm</span>
            </div>
            <div className="formula-row">
              <span className="formula-lhs">δ<sub>max</sub></span>
              <span className="formula-eq">=</span>
              <span className="formula-rhs">5 q L⁴ / (384 E I)</span>
              <span className="formula-eval">≈ 9.61 mm</span>
            </div>
          </div>
        </div>

        <div className="coach-section coach-tip">
          <div className="tip-icon">
            <Lightbulb size={14} />
          </div>
          <div className="tip-body">
            <strong>Suggerimento</strong>
            <p>
              Se il carico è in <b>kN/m</b> non in <b>N/mm</b>, FEA Pro converte automaticamente.
              Per ora i kN/m sono lo standard EC italiano.
            </p>
          </div>
        </div>

        <div className="coach-nav">
          <button className="btn-secondary" onClick={() => setStep(2)}>
            <ArrowLeft size={12} />
            Step 2
          </button>
          <button className="btn-primary" onClick={() => setStep(4)}>
            Avanti
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}


// ── Canvas (center) ─────────────────────────────────────────────────────

function CanvasCenter({ step }: { step: Step }): JSX.Element {
  // Per ora il canvas SVG è statico (replica mockup esatta).
  const _ = step; // unused, mockup-driven only

  return (
    <section className="p-canvas">
      <div className="canvas-head">
        <div className="canvas-head-l">
          <span className="canvas-id">UC1</span>
          <span className="canvas-title">Trave bi-appoggiata</span>
          <span className="canvas-meta">11 nodi · 10 beam · IPE 300 · S355</span>
        </div>
        <div className="canvas-head-r">
          <button className="seg-btn is-active">Modello</button>
          <button className="seg-btn">Mesh</button>
          <button className="seg-btn">Carichi</button>
        </div>
      </div>

      <div className="canvas-body">
        <div className="canvas-grid" />
        <div className="canvas-grid-major" />

        <svg className="canvas-svg" viewBox="0 0 920 480" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker
              id="puc-arr-down"
              viewBox="0 0 12 12"
              refX="6"
              refY="11"
              markerWidth="9"
              markerHeight="9"
              orient="auto"
            >
              <path
                d="M2 1 L6 11 L10 1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>

          {/* Span dim top */}
          <g fontFamily="JetBrains Mono" fontSize="11" fill="var(--ink-dim)">
            <line x1="100" y1="80" x2="820" y2="80" stroke="var(--ink-faint)" strokeWidth="1" />
            <line x1="100" y1="75" x2="100" y2="85" stroke="var(--ink-faint)" strokeWidth="1" />
            <line x1="820" y1="75" x2="820" y2="85" stroke="var(--ink-faint)" strokeWidth="1" />
            <rect x="430" y="70" width="60" height="20" fill="var(--bg-viewport)" />
            <text x="460" y="84" textAnchor="middle" fontWeight="600" fill="var(--ink-muted)">
              L = 6.00 m
            </text>
          </g>

          {/* Distributed load — current step */}
          <g color="var(--coral)">
            <line x1="100" y1="135" x2="820" y2="135" stroke="currentColor" strokeWidth="2" />
            <g stroke="currentColor" strokeWidth="1.4" markerEnd="url(#puc-arr-down)">
              {[115, 170, 225, 280, 335, 390, 445, 500, 555, 610, 665, 720, 775].map((x) => (
                <line key={x} x1={x} y1="137" x2={x} y2="232" />
              ))}
            </g>
            <rect
              x="380"
              y="108"
              width="160"
              height="26"
              rx="8"
              fill="var(--bg-coral)"
              stroke="var(--coral)"
              strokeWidth="1.2"
            />
            <text
              x="460"
              y="125"
              textAnchor="middle"
              fontFamily="JetBrains Mono"
              fontSize="13"
              fontWeight="700"
              fill="var(--coral)"
            >
              q = 10.0 kN/m  ↓
            </text>
          </g>

          {/* Beam */}
          <line
            x1="100"
            y1="245"
            x2="820"
            y2="245"
            stroke="var(--ink)"
            strokeWidth="12"
            strokeLinecap="butt"
          />

          {/* Nodes */}
          <g fill="var(--bg-panel)" stroke="var(--ink)" strokeWidth="2">
            <circle cx="100" cy="245" r="6" />
            {[172, 244, 316, 388, 460, 532, 604, 676, 748].map((cx) => (
              <circle key={cx} cx={cx} cy="245" r="4" />
            ))}
            <circle cx="820" cy="245" r="6" />
          </g>

          {/* Node labels */}
          <g fontFamily="JetBrains Mono" fontSize="10" fill="var(--ink-dim)" textAnchor="middle">
            <text x="100" y="275">N1</text>
            <text x="460" y="275">N6</text>
            <text x="820" y="275">N11</text>
          </g>

          {/* Left support — cerniera */}
          <g transform="translate(100 252)" color="var(--success)">
            <polygon
              points="0,0 -16,22 16,22"
              fill="var(--bg-success)"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line x1="-22" y1="26" x2="22" y2="26" stroke="currentColor" strokeWidth="2" />
            <g stroke="currentColor" strokeWidth="1.4">
              <line x1="-16" y1="26" x2="-22" y2="34" />
              <line x1="-8" y1="26" x2="-14" y2="34" />
              <line x1="0" y1="26" x2="-6" y2="34" />
              <line x1="8" y1="26" x2="2" y2="34" />
              <line x1="16" y1="26" x2="10" y2="34" />
            </g>
            <text
              x="0"
              y="50"
              fontFamily="JetBrains Mono"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              fill="currentColor"
              letterSpacing="0.10em"
            >
              CERNIERA
            </text>
          </g>

          {/* Right support — carrello */}
          <g transform="translate(820 252)" color="var(--success)">
            <polygon
              points="0,0 -16,18 16,18"
              fill="var(--bg-success)"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="-8" cy="24" r="3" fill="var(--bg-panel)" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="24" r="3" fill="var(--bg-panel)" stroke="currentColor" strokeWidth="1.5" />
            <line x1="-22" y1="30" x2="22" y2="30" stroke="currentColor" strokeWidth="2" />
            <g stroke="currentColor" strokeWidth="1.4">
              <line x1="-16" y1="30" x2="-22" y2="38" />
              <line x1="-8" y1="30" x2="-14" y2="38" />
              <line x1="0" y1="30" x2="-6" y2="38" />
              <line x1="8" y1="30" x2="2" y2="38" />
              <line x1="16" y1="30" x2="10" y2="38" />
            </g>
            <text
              x="0"
              y="54"
              fontFamily="JetBrains Mono"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              fill="currentColor"
              letterSpacing="0.10em"
            >
              CARRELLO
            </text>
          </g>

          {/* Section badge bottom */}
          <g transform="translate(40 410)">
            <rect width="220" height="50" rx="10" fill="var(--bg-panel)" stroke="var(--border)" strokeWidth="1" />
            <text
              x="14"
              y="20"
              fontFamily="JetBrains Mono"
              fontSize="10"
              fontWeight="700"
              letterSpacing="0.10em"
              fill="var(--ink-dim)"
            >
              SEZIONE · MATERIALE
            </text>
            <text x="14" y="40" fontFamily="JetBrains Mono" fontSize="13" fontWeight="700" fill="var(--ink)">
              IPE 300 · S355 (E=210 GPa)
            </text>
          </g>

          {/* Live indicator */}
          <g transform="translate(720 410)">
            <rect width="160" height="50" rx="10" fill="var(--bg-info)" stroke="var(--accent)" strokeWidth="1" />
            <circle cx="20" cy="25" r="5" fill="var(--accent)">
              <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <text
              x="34"
              y="22"
              fontFamily="JetBrains Mono"
              fontSize="10"
              fontWeight="700"
              letterSpacing="0.10em"
              fill="var(--accent)"
            >
              LIVE PREVIEW
            </text>
            <text x="34" y="38" fontFamily="Inter" fontSize="11" fontWeight="500" fill="var(--ink-muted)">
              aggiornato 14:32:18
            </text>
          </g>
        </svg>

        {/* Floating callout pointing to load */}
        <div className="canvas-callout">
          <ArrowRight size={14} />
          <span>Stai aggiungendo questo carico</span>
        </div>

        {/* HUD bottom — ruler + zoom */}
        <div className="canvas-hud canvas-hud-ruler">
          <span>1 m</span>
          <span className="ruler-bar" />
          <span>Zoom 100%</span>
        </div>
      </div>
    </section>
  );
}


// ── Inspector (right) ───────────────────────────────────────────────────

interface InspectorProps {
  loadType: string;
  setLoadType: (v: string) => void;
  intensity: string;
  setIntensity: (v: string) => void;
  direction: "+X" | "+Y" | "+Z" | "-X" | "-Y" | "-Z";
  setDirection: (d: "+X" | "+Y" | "+Z" | "-X" | "-Y" | "-Z") => void;
  slu: string;
  setSlu: (v: string) => void;
  loadsCount: number;
}

function InspectorAside(props: InspectorProps): JSX.Element {
  const { loadType, setLoadType, intensity, setIntensity, direction, setDirection, slu, setSlu, loadsCount } = props;
  const directions: Array<"+X" | "+Y" | "+Z" | "-X" | "-Y" | "-Z"> = ["+X", "+Y", "+Z", "-X", "-Y", "-Z"];

  return (
    <aside className="p-inspector">
      <header className="ins-head">
        <span className="eyebrow">STEP 3 · INPUT</span>
        <h2 className="ins-title">Carichi sulla trave</h2>
      </header>

      {/* Add load form */}
      <div className="ins-card ins-card-add">
        <div className="ins-card-head">
          <span className="eyebrow">NUOVO CARICO DISTRIBUITO</span>
          <span className="ins-card-pill">EL 1–10</span>
        </div>

        <label className="ins-field">
          <span className="ins-field-label">Tipo carico</span>
          <div className="ins-field-input">
            <select value={loadType} onChange={(e) => setLoadType(e.target.value)}>
              <option value="dist-uniform">Distribuito uniforme — q</option>
              <option value="dist-trap">Distribuito trapezoidale</option>
              <option value="point">Forza puntuale — P</option>
              <option value="moment">Momento applicato — M</option>
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </label>

        <div className="ins-field-grid">
          <label className="ins-field">
            <span className="ins-field-label">Intensità · q</span>
            <div className="ins-field-input ins-field-numeric">
              <input
                type="text"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
                inputMode="decimal"
              />
              <span className="unit">kN/m</span>
            </div>
            <span className="ins-field-hint">range tipico: 2–25 kN/m</span>
          </label>
          <label className="ins-field">
            <span className="ins-field-label">Direzione</span>
            <div className="ins-dir">
              {directions.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={d === direction ? "dir-btn is-active" : "dir-btn"}
                  onClick={() => setDirection(d)}
                >
                  {d.replace("-", "−")}
                </button>
              ))}
            </div>
          </label>
        </div>

        <label className="ins-field">
          <span className="ins-field-label">Applicato su</span>
          <div className="ins-applied">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="applied-chip">
                <span className="applied-dot" />
                EL {n}
              </span>
            ))}
            <span className="applied-more">+5 altri</span>
          </div>
          <span className="ins-field-hint">Tutta la trave (10 elementi) — modifica selezione</span>
        </label>

        <label className="ins-field">
          <span className="ins-field-label">Combinazione SLU</span>
          <div className="ins-field-input">
            <select value={slu} onChange={(e) => setSlu(e.target.value)}>
              <option value="gG135">γG = 1.35 (permanenti)</option>
              <option value="gG130">γG = 1.30 (permanenti non strutturali)</option>
              <option value="gQ150">γQ = 1.50 (variabili)</option>
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </label>

        <div className="ins-card-actions">
          <button className="btn-secondary btn-sm">Annulla</button>
          <button className="btn-primary btn-sm">
            <Plus size={12} strokeWidth={2.4} />
            Aggiungi carico
          </button>
        </div>
      </div>

      {/* Existing loads */}
      <div className="ins-section">
        <div className="ins-section-head">
          <span className="eyebrow">CARICHI GIÀ APPLICATI</span>
          <span className="ins-count">{loadsCount}</span>
        </div>
        {loadsCount === 0 ? (
          <div className="ins-empty">
            <Plus size={20} strokeWidth={1.5} />
            <span>
              Nessun carico ancora.
              <br />
              Compila il form sopra per aggiungerne uno.
            </span>
          </div>
        ) : (
          <p className="ins-field-hint">{loadsCount} carichi applicati.</p>
        )}
      </div>

      {/* Expected results */}
      <div className="ins-section">
        <div className="ins-section-head">
          <span className="eyebrow">RISULTATI ATTESI · TEORIA</span>
        </div>
        <div className="ins-expected">
          <ExpRow k="M_max" value="45.0" unit="kNm" sub="@ x = L/2" />
          <ExpRow k="V_max" value="30.0" unit="kN" sub="@ appoggi" />
          <ExpRow k="δ_max" value="9.61" unit="mm" sub="@ x = L/2" />
          <ExpRow k="UR EC3" value="0.24" unit="" sub="governing: LTB" />
        </div>
        <p className="ins-expected-foot">
          Confronterai questi valori con il solver al prossimo step.
        </p>
      </div>
    </aside>
  );
}


function ExpRow({ k, value, unit, sub }: { k: string; value: string; unit: string; sub: string }): JSX.Element {
  return (
    <div className="exp-row">
      <span className="exp-k">{k}</span>
      <span className="exp-v">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <span className="exp-sub">{sub}</span>
    </div>
  );
}
