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
import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

import { PercorsoStep } from "../components/shell/PercorsoStep";
import { PERCORSO_STEPS_6 } from "../components/shell/PercorsoStepper";
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

  const meta = STEP_META[step];

  // v3.5 D1: validation placeholder. D3-D7 sostituiranno con check reali
  // (es. Geometry: bays > 0 && span > 0 && height > 0).
  const validation = { status: "pending" as const, message: "Compila i campi per continuare" };

  const handleForward = () => {
    if (step < 6) setStep((step + 1) as Step);
  };
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

        {/* v3.5 D1: active escape sempre visibile — pattern E2-IA "Studio
            Pro è sempre raggiungibile dal Percorso". D4 polish lo perfeziona. */}
        <Link
          className="ptd-open-studio"
          to="/"
          data-testid="ptd-open-studio-pro"
          aria-label="Apri Studio Pro — modalità esperto"
        >
          Apri Studio Pro
          <ExternalLink size={12} strokeWidth={2} aria-hidden />
        </Link>
      </header>

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
          {/* v3.5 D1: body placeholder per ogni step. D3-D7 lo sostituiranno
              col content reale (form parametrico, vincoli, carichi, ecc.) */}
          <div className="ptd-step-placeholder" data-testid={`ptd-step-${step}-placeholder`}>
            <p className="ptd-placeholder-eyebrow">SCAFFOLD D1</p>
            <p className="ptd-placeholder-title">Step {step} · {PERCORSO_STEPS_6[step - 1].label}</p>
            <p className="ptd-placeholder-hint">
              Il body di questo step sarà popolato in una fetta successiva
              del Demo Slice (D{step === 1 ? "3" : step <= 3 ? "6" : "7"}).
              Per ora puoi navigare avanti/indietro per testare lo stepper.
            </p>
          </div>
        </PercorsoStep>
      </main>
    </div>
  );
}
