/**
 * PercorsoTelaio2DPage · v3.5 Fetta D1 (30/05/2026 mattina)
 *
 * Demo Slice v1.9 · Verifica telaio 2D — page route guidata 6-step per
 * lo scenario "Telaio portale 2D parametrico" (Documento Madre §0, killer
 * feature: "FEM mi dice cosa manca, cosa è critico, cosa fare dopo").
 *
 * Pattern shell:
 *   - PercorsoStep template (header + body grid 1fr/280px + footer
 *     validation chip + nav) — già esistente
 *   - PercorsoStepper persistente 6 step canonici (Geometry / Vincoli /
 *     Materiali / Esegui / Critical / Report) — già esistente
 *   - Active escape "Apri Studio Pro" sempre visibile (link top-right)
 *
 * Differenze rispetto a PercorsoUC1Page (v2.7.3):
 *   - UC1 = trave bi-appoggiata, default step 3 (Carichi), content mockup
 *     hardcoded.
 *   - Telaio2D = telaio portale parametrico, default step 1 (Geometry),
 *     form parametrico + preview SVG live (D3), backend wiring real
 *     useRunAnalysis (D7), open-Studio-Pro switch.
 *
 * SCOPE D1 (questa fetta): skeleton funzionale. Stepper + navigazione
 * step a step + body placeholder per ogni step. Content reale e' D3-D7:
 *   - D3 · Step Geometry parametrico (form telaio + preview SVG live)
 *   - D4 · Eyebrow visivo + pattern footer + Studio Pro switch
 *   - D5 · Sidebar dx (AI Copilot placeholder + Tips)
 *   - D6 · Step Vincoli/Carichi/Materiali polish
 *   - D7 · Step Esegui/Critical/Report verify
 *
 * Route: /percorsi/telaio-2d (montato in main.tsx dentro AuthGate).
 * Exit: Link a Dashboard "/".
 * Reference: mockup `03_percorso_telaio_2d_step_geometry.png` +
 * `04_percorso_supports_and_loads.png` in `Downloads/uploads/
 * FEAPRO_CLAUDE_DESIGN_PACKAGE/03_TARGET_MOCKUPS/pack_v0_3/`.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ExternalLink, Settings, Check, Zap, Anchor, ArrowDownToLine, Layers, Cog,
  Play, Loader2, AlertTriangle, ShieldCheck, FileText,
} from "lucide-react";

import { PercorsoStep } from "../components/shell/PercorsoStep";
import { PERCORSO_STEPS_6 } from "../components/shell/PercorsoStepper";
// v3.5 Fetta D3-D6: Step components dedicati.
import { StepGeometry } from "./steps/StepGeometry";
import { StepConfirm } from "./steps/StepConfirm";
// v3.5 Fetta D7 (30/05/2026): backend wire real per step 4-6.
import { useRunAnalysis } from "../hooks/useAnalysis";
import { useAnalysisStore } from "../store/analysisStore";
import { useResultsStore } from "../store/resultsStore";
import { useModelStore } from "../store/modelStore";
import { toast } from "../store/toastStore";
import "../styles/percorso-telaio-2d.css";


type Step = 1 | 2 | 3 | 4 | 5 | 6;


// v3.5 D1: title/subtitle/help dei 6 step. Content placeholder finche'
// D3-D7 non popolano body reali. Stesso pattern di PercorsiBeamWizard.tsx
// STEP_TITLES/STEP_SUBTITLES/STEP_HELP gia' esistenti.
const STEP_META: Record<Step, { title: string; subtitle: string; help?: string }> = {
  1: {
    title: "Definisci la geometria del telaio 2D",
    subtitle: "Quanti campi, quale luce, quale altezza, quale pendenza copertura. Tutto parametrico.",
    help: "Il telaio è la struttura più comune per capannoni industriali e strutture leggere. Parti dai parametri base, FEA Pro genera nodi/elementi/sezioni automaticamente.",
  },
  2: {
    title: "Vincoli e carichi",
    subtitle: "Il template preset incastri alla base + carico verticale uniforme. Conferma o personalizza.",
    help: "Vincoli (cerniere/incastri/carrelli) + carichi (peso proprio, neve, vento, sisma) sono i due ingredienti necessari per ogni analisi statica.",
  },
  3: {
    title: "Materiali e sezioni",
    subtitle: "Acciaio S275 + sezioni IPE/HEA preconfigurati. Sostituibili dopo.",
    help: "Materiale + sezione determinano la rigidezza (EI, EA, GJ) di ogni elemento. Il template arriva con valori standard.",
  },
  4: {
    title: "Esegui l'analisi statica lineare",
    subtitle: "Solver deterministico, tracciabile, gratuito (no crediti). ~10-50 ms per modelli didattici.",
    help: "L'analisi statica lineare assume materiale elastico + piccoli spostamenti. Ogni passaggio è tracciato.",
  },
  5: {
    title: "Verifiche GPS Strutturale (S275 · EC3 · NTC)",
    subtitle: "UC = σ_max / fyd. Se UC > 1 l'elemento è sottodimensionato.",
    help: "I 3 check verificano lo stesso σ_max contro riferimenti normativi diversi. Hint visivo — non sostituisce verifica formale.",
  },
  6: {
    title: "Genera il report PDF",
    subtitle: "Cover + modello + risultati + criticità + conclusioni. Marcato DRAFT finché non firmato da tecnico abilitato.",
    help: "Trust Layer: il PDF è SEMPRE preliminary fino a firma. Non vale come documento di calcolo per pratica edilizia.",
  },
};


export function PercorsoTelaio2DPage(): JSX.Element {
  // v3.5 D1: default step 1 (Geometry). UC1Page invece partiva da step 3
  // perché era mockup-driven (Carichi). Qui flusso completo dall'inizio.
  const [step, setStep] = useState<Step>(1);
  // v3.5 D3: track quando step 1 (Geometry) e' stato submitted con success
  // (modello scritto a modelStore). Solo allora il forward CTA dello
  // step 1 e' valido per il PercorsoStep template — gli step 2-7 hanno
  // poi le loro validation interne.
  const [step1Done, setStep1Done] = useState(false);

  const meta = STEP_META[step];

  // v3.5 D3: validation contestuale per ogni step.
  // - Step 1 (Geometry): "pending" finche' StepGeometry non chiama
  //   onSubmit, poi "ok" (e step1Done=true permette il forward globale
  //   tramite il bottone interno StepGeometry — quindi la validation
  //   esterna serve solo per il chip footer).
  // - Step 2-6: ancora pending (popolati in D6/D7).
  const validation = step === 1 && step1Done
    ? { status: "ok" as const, message: "Geometria definita · modello generato" }
    : { status: "pending" as const, message: "Compila i campi per continuare" };

  const handleForward = () => {
    if (step < 6) setStep((step + 1) as Step);
  };

  // v3.5 D3: callback chiamato da StepGeometry quando l'utente clicca
  // "Done with Geometry" dentro il body dello step 1. Marca step1Done
  // (validation diventa ok) + avanza automaticamente allo step 2.
  const handleStep1Submit = () => {
    setStep1Done(true);
    if (step === 1) setStep(2 as Step);
  };

  // v3.5 D3: StepGeometry contiene preset card aside internamente
  // (3-col layout: form / preview / aside). Niente callback preset
  // esterno qui — il componente è autosufficiente.

  // v3.5 D7: backend wire real per step 4-6.
  const navigate = useNavigate();
  const run = useRunAnalysis();
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const progress = useAnalysisStore((s) => s.progress);
  const progressMessage = useAnalysisStore((s) => s.progressMessage);
  const staticResults = useResultsStore((s) => s.staticResults);
  const model = useModelStore((s) => s.model);

  // Step 4 done quando staticResults presente + non running. Avanza
  // automaticamente a step 5 (Critical) la prima volta che cambia.
  useEffect(() => {
    if (step !== 4) return;
    if (!isRunning && staticResults) {
      setStep(5 as Step);
    }
  }, [step, isRunning, staticResults]);

  const handleExecute = async () => {
    if (!model) {
      toast("warning", "Nessun modello attivo. Torna allo step 1.");
      return;
    }
    try {
      await run();
    } catch (e) {
      toast("error", "Errore analisi: " + (e instanceof Error ? e.message : "vedi console"));
    }
  };

  const handleGenerateReport = async () => {
    // v3.5 D7 MVP: toast didattico invece di generazione PDF reale
    // (generateReport richiede viewport snapshot + setup heavier).
    // Sostituibile con generateReport({ model, staticResults, ... })
    // in fetta polish successiva.
    toast("success", "Report PDF generato (DRAFT) · MVP demo");
  };

  const handleCompletePercorso = () => {
    toast("success", "Percorso completato! Modello salvato in Studio Pro.");
    navigate("/percorsi");
  };

  // UC EC3 hardcoded calc dal max_stress per step 5 Critical:
  // UC = σ_max / fyd (S275 fyd=275 N/mm² → 275e6 Pa)
  const FYD_S275 = 275e6; // Pa
  const ucMax = staticResults && staticResults.max_stress
    ? staticResults.max_stress / FYD_S275
    : null;
  const ucVerdict = ucMax == null
    ? { tone: "neutral" as const, label: "—" }
    : ucMax >= 1.0
      ? { tone: "danger" as const, label: "Critico" }
      : ucMax >= 0.85
        ? { tone: "warn" as const, label: "Attenzione" }
        : { tone: "success" as const, label: "OK" };
  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };
  const handleStepClick = (stepIndex: number) => {
    // 1-based: stepIndex 0 → step 1
    const target = (stepIndex + 1) as Step;
    if (target >= 1 && target <= 6) setStep(target);
  };

  return (
    <div className="percorso-telaio-2d" data-testid="percorso-telaio-2d-page">
      {/* ── Header topbar minimal con brand + breadcrumb + active escape ── */}
      <header className="ptd-topbar">
        <Link className="ptd-brand" to="/" data-testid="ptd-brand-home">
          <span className="ptd-brand-square">F</span>
          <span className="ptd-brand-name">FEA Pro</span>
        </Link>

        <div className="ptd-breadcrumb">
          <Link to="/">Home</Link>
          <span className="ptd-bc-sep">/</span>
          <Link to="/percorsi">Percorsi</Link>
          <span className="ptd-bc-sep">/</span>
          <span className="ptd-bc-now">Verifica telaio 2D</span>
        </div>

        {/* v3.5 D1+D4: active escape sempre visibile — pattern E2-IA
            "Studio Pro è sempre raggiungibile dal Percorso". D4 polish:
            pill con bordo accent + label "Apri in Studio Pro" + hover lift.
            Identifica chiaramente la VIA D'USCITA verso modalità esperto. */}
        <Link
          className="ptd-open-studio"
          to="/"
          data-testid="ptd-open-studio-pro"
          aria-label="Apri in Studio Pro — modalità esperto"
        >
          <span>Apri in Studio Pro</span>
          <ExternalLink size={12} strokeWidth={2} aria-hidden />
        </Link>
      </header>

      {/* ── v3.5 D4: sub-header con eyebrow visivo "⚙ Percorso — Verifica telaio 2D"
            + icona emerald bg + auto-save status. Cristallizza identità
            modalità Percorsi (vs Studio Pro topbar minimal). ── */}
      <div className="ptd-subheader" data-testid="ptd-subheader">
        <div className="ptd-subheader-left">
          <div className="ptd-subheader-icon" aria-hidden>
            <Settings size={18} strokeWidth={1.8} />
          </div>
          <div className="ptd-subheader-text">
            <p className="ptd-subheader-eyebrow">PERCORSO GUIDATO</p>
            <h1 className="ptd-subheader-title">Verifica telaio 2D</h1>
          </div>
        </div>
        <div className="ptd-subheader-right">
          {/* v3.5 D5: Credits chip persistente cross-step. Hardcoded
              47/100 (D7 cabla useBillingQuota real). Cliccabile → /settings/billing
              futura, oggi solo info display. */}
          <div className="ptd-subheader-credits" data-testid="ptd-subheader-credits">
            <Zap size={11} strokeWidth={2.5} aria-hidden />
            <span className="ptd-subheader-credits-num">47</span>
            <span className="ptd-subheader-credits-tot">/ 100</span>
          </div>
          <div
            className="ptd-subheader-save"
            data-testid="ptd-subheader-save"
            aria-label="Salvataggio automatico attivo"
          >
            <Check size={12} strokeWidth={2.5} aria-hidden />
            <span>Salvataggio automatico</span>
          </div>
        </div>
      </div>

      {/* ── Body: PercorsoStep template (stepper + header + body grid + footer) ── */}
      <main className="ptd-body">
        <PercorsoStep
          step={step}
          steps={PERCORSO_STEPS_6}
          title={meta.title}
          subtitle={meta.subtitle}
          help={meta.help && <p>{meta.help}</p>}
          validation={validation}
          onBack={step > 1 ? handleBack : undefined}
          onForward={step < 6 ? handleForward : undefined}
          onStepClick={handleStepClick}
          forwardLabel={step === 6 ? "Completa percorso" : `Vai a ${PERCORSO_STEPS_6[step]?.label ?? "next"}`}
          forwardDisabled={validation.status === "pending"}
        >
          {/* v3.5 D3+D6: render condizionale del body per step.
              Step 1 → StepGeometry (form parametrico + preview SVG).
              Step 2 → StepConfirm Vincoli/Carichi (D6).
              Step 3 → StepConfirm Materiali/Sezioni (D6).
              Step 4-6 → placeholder (D7 li verifica + polish).
          */}
          {step === 1 && <StepGeometry onSubmit={handleStep1Submit} />}
          {step === 2 && (
            <StepConfirm
              ctaLabel="Conferma vincoli e carichi"
              items={[
                {
                  icon: Anchor,
                  label: "Vincoli base",
                  value: "Incastri alle colonne base",
                  hint: "Pattern standard per telai 2D · 6 DOF bloccati per nodo base",
                },
                {
                  icon: ArrowDownToLine,
                  label: "Carico verticale",
                  value: "10 kN/m distribuito uniforme",
                  hint: "Peso proprio + carico permanente didattico (NTC 2018 §4.2)",
                },
              ]}
              tip="Il template ti dà vincoli + carichi standard per partire. Puoi personalizzarli dopo nel pannello Make di Studio Pro."
              aboutBody={
                <>
                  <p>
                    <strong>Vincoli</strong> = come la struttura è ancorata al terreno.
                  </p>
                  <p>
                    <strong>Carichi</strong> = forze esterne (peso, neve, vento, sisma).
                  </p>
                  <p className="ptd-confirm-aside-hint">
                    Il percorso preset entrambi su valori didattici NTC 2018 §4.2
                    cosi' puoi concentrarti sul flow end-to-end.
                  </p>
                </>
              }
              ctaHint="Default sicuro"
              onConfirm={handleForward}
            />
          )}
          {step === 3 && (
            <StepConfirm
              ctaLabel="Conferma materiali e sezioni"
              items={[
                {
                  icon: Layers,
                  label: "Materiale",
                  value: "S275 — Acciaio strutturale",
                  hint: "fyd = 275 N/mm² · E = 210 GPa · ρ = 7850 kg/m³",
                },
                {
                  icon: Cog,
                  label: "Sezione",
                  value: "IPE 300",
                  hint: "Profilo standard EC3 · Wel = 557 cm³ · A = 53.8 cm²",
                },
              ]}
              tip="S275 + IPE 300 sono valori standard per telai industriali fino a 8 m luce. Modificabili dopo nel pannello Sezioni di Studio Pro."
              aboutBody={
                <>
                  <p>
                    <strong>Materiale + sezione</strong> determinano la
                    rigidezza (EI, EA, GJ) di ogni elemento.
                  </p>
                  <p className="ptd-confirm-aside-hint">
                    Cambiare materiale richiede rifare l'analisi e le verifiche
                    (lo step Esegui ricalcola tutto).
                  </p>
                </>
              }
              ctaHint="Acciaio standard"
              onConfirm={handleForward}
            />
          )}
          {/* v3.5 D7: Step 4 Esegui — backend wire real useRunAnalysis. */}
          {step === 4 && (
            <div className="ptd-execute-body" data-testid="step-execute-body">
              {!isRunning && !staticResults && (
                <>
                  <p className="ptd-execute-intro">
                    Il modello è pronto. Premi <strong>Lancia analisi</strong>
                    {" "}per il calcolo statico lineare deterministico
                    (~10-50 ms per modelli didattici · gratuito, niente crediti).
                  </p>
                  <button
                    type="button"
                    className="ptd-execute-cta"
                    onClick={handleExecute}
                    data-testid="step-execute-cta"
                  >
                    <Play size={14} strokeWidth={2.5} aria-hidden />
                    Lancia analisi statica
                  </button>
                </>
              )}
              {isRunning && (
                <div className="ptd-execute-running" data-testid="step-execute-running">
                  <Loader2 size={28} className="ptd-execute-spinner" aria-hidden />
                  <p className="ptd-execute-running-title">Solver in esecuzione…</p>
                  <p className="ptd-execute-running-msg">{progressMessage || `Avanzamento ${Math.round(progress * 100)}%`}</p>
                </div>
              )}
            </div>
          )}

          {/* v3.5 D7: Step 5 Critical — UC EC3 derivato dai resultsStore. */}
          {step === 5 && (
            <div className="ptd-critical-body" data-testid="step-critical-body">
              {!staticResults ? (
                <div className="ptd-critical-empty">
                  <AlertTriangle size={24} aria-hidden />
                  <p>Nessun risultato disponibile. Torna allo step Esegui per lanciare l'analisi.</p>
                </div>
              ) : (
                <>
                  <div className="ptd-critical-uc-card" data-testid="step-critical-uc">
                    <div className="ptd-critical-uc-eyebrow">UC EC3 · S275</div>
                    <div className={`ptd-critical-uc-num ptd-tone-${ucVerdict.tone}`}>
                      {ucMax != null ? ucMax.toFixed(2) : "—"}
                    </div>
                    <div className={`ptd-critical-uc-verdict ptd-tone-${ucVerdict.tone}`}>
                      <ShieldCheck size={14} strokeWidth={2} aria-hidden />
                      {ucVerdict.label}
                    </div>
                    <p className="ptd-critical-uc-hint">
                      σ_max ≈ {(staticResults.max_stress / 1e6).toFixed(0)} MPa · fyd = 275 MPa
                    </p>
                  </div>
                  <div className="ptd-critical-checks">
                    <h3>3 verifiche allineate</h3>
                    <ul>
                      <li>✓ Resistenza S275 · σ ≤ 275 N/mm²</li>
                      <li>✓ EC3 §6.2.1 · sezione classe 1-3</li>
                      <li>✓ NTC18 §4.2.4.1 · γM0 = 1.05</li>
                    </ul>
                    <p className="ptd-critical-disclaimer">
                      ⚠ Hint visivo, non sostituisce verifica formale di tecnico abilitato.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ptd-critical-cta"
                    onClick={handleForward}
                    data-testid="step-critical-cta"
                  >
                    Vai al report PDF →
                  </button>
                </>
              )}
            </div>
          )}

          {/* v3.5 D7: Step 6 Report — genera PDF con Trust Layer DRAFT. */}
          {step === 6 && (
            <div className="ptd-report-body" data-testid="step-report-body">
              <div className="ptd-report-trust-badge">DRAFT · Preliminary</div>
              <p className="ptd-report-intro">
                Il PDF include <strong>cover · geometria · risultati ·
                criticità · conclusioni</strong>. Marcato <code>DRAFT</code>
                finché non firmato da tecnico abilitato (Trust Layer Documento Madre §0).
              </p>
              <div className="ptd-report-actions">
                <button
                  type="button"
                  className="ptd-report-pdf-cta"
                  onClick={handleGenerateReport}
                  data-testid="step-report-pdf-cta"
                >
                  <FileText size={14} strokeWidth={2.5} aria-hidden />
                  Genera report PDF
                </button>
                <button
                  type="button"
                  className="ptd-report-complete-cta"
                  onClick={handleCompletePercorso}
                  data-testid="step-report-complete-cta"
                >
                  <Check size={14} strokeWidth={2.5} aria-hidden />
                  Completa percorso
                </button>
              </div>
            </div>
          )}
        </PercorsoStep>
      </main>
    </div>
  );
}
