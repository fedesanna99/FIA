/**
 * StatesShowcasePage · v2.8.0 Phase 6.2 mockup-driven
 *
 * Showcase 4 stati: Empty (no model) · Solver running · Error · 404 NotFound.
 * Replica condensata di States.html.
 *
 * Route: /design/states (showcase only).
 */
import { useState } from "react";
import { AlertCircle, FilePlus, Loader2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import "../styles/states.css";


type StateKey = "empty" | "solver" | "error" | "notfound";


export function StatesShowcasePage(): JSX.Element {
  const [active, setActive] = useState<StateKey>("empty");

  return (
    <div className="st-states">
      <nav className="stt-switcher">
        {([
          ["empty", "Empty (no model)"],
          ["solver", "Solver running"],
          ["error", "Error"],
          ["notfound", "404"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={active === key ? "stt-tab is-active" : "stt-tab"}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="stt-stage">
        {active === "empty" && <EmptyState />}
        {active === "solver" && <SolverRunningState />}
        {active === "error" && <ErrorState />}
        {active === "notfound" && <NotFoundState />}
      </div>
    </div>
  );
}


function EmptyState(): JSX.Element {
  return (
    <div className="stt-card">
      <div className="stt-illustration stt-illustration-empty">
        <FilePlus size={48} strokeWidth={1.4} />
      </div>
      <span className="stt-eyebrow">EMPTY STATE · NESSUN MODELLO</span>
      <h1 className="stt-title">Nessun modello caricato</h1>
      <p className="stt-desc">
        Per iniziare crea un nuovo modello vuoto, apri un template di esempio,
        oppure segui un <b>percorso guidato</b> per imparare passo passo.
      </p>
      <div className="stt-actions">
        <Link to="/templates" className="btn-secondary">Apri un template</Link>
        <Link to="/percorsi/uc1" className="btn-primary">Inizia percorso UC1</Link>
      </div>
    </div>
  );
}


function SolverRunningState(): JSX.Element {
  return (
    <div className="stt-card">
      <div className="stt-illustration stt-illustration-solver">
        <Loader2 size={48} strokeWidth={1.6} />
      </div>
      <span className="stt-eyebrow">SOLVER RUNNING · STATICA LINEARE</span>
      <h1 className="stt-title">Risoluzione in corso…</h1>
      <p className="stt-desc">
        Sto assemblando la matrice di rigidezza globale (<b>22 DOF</b>) e risolvendo
        il sistema lineare K·u = F con il backend <b>ARPACK direct (LU)</b>.
      </p>
      <div className="stt-progress">
        <div className="stt-progress-bar">
          <div className="stt-progress-fill" />
        </div>
        <div className="stt-progress-meta">
          <span>Assembly K → solve → recover</span>
          <span>~0.8s · 67%</span>
        </div>
      </div>
      <div className="stt-actions">
        <button type="button" className="btn-secondary">Annulla (Esc)</button>
      </div>
    </div>
  );
}


function ErrorState(): JSX.Element {
  return (
    <div className="stt-card">
      <div className="stt-illustration stt-illustration-error">
        <AlertCircle size={48} strokeWidth={1.6} />
      </div>
      <span className="stt-eyebrow" style={{ color: "var(--danger)" }}>SOLVER ERROR · SINGULAR MATRIX</span>
      <h1 className="stt-title">La matrice di rigidezza è singolare</h1>
      <p className="stt-desc">
        Il modello ha probabilmente <b>vincoli insufficienti</b> (struttura labile)
        o <b>elementi non connessi</b>. Verifica che ci siano almeno 3 vincoli
        rigidi per impedire moto rigido nel piano.
      </p>
      <div className="stt-actions">
        <button type="button" className="btn-secondary">Visualizza diagnostica</button>
        <button type="button" className="btn-primary">Auto-fix vincoli</button>
      </div>
    </div>
  );
}


function NotFoundState(): JSX.Element {
  return (
    <div className="stt-card">
      <div className="stt-illustration stt-illustration-notfound">
        <MapPin size={48} strokeWidth={1.6} />
      </div>
      <p className="stt-error-code">404</p>
      <span className="stt-eyebrow" style={{ color: "var(--warn)" }}>PAGINA NON TROVATA</span>
      <h1 className="stt-title">Questa pagina non esiste</h1>
      <p className="stt-desc">
        L'URL che hai aperto non corrisponde a nessuna route nel sito. Potrebbe
        essere un link <b>obsoleto</b> o una pagina <b>rimossa</b>.
      </p>
      <div className="stt-actions">
        <Link to="/" className="btn-primary">Torna alla home</Link>
        <Link to="/templates" className="btn-secondary">Esplora i template</Link>
      </div>
    </div>
  );
}
