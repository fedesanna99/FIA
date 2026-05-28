// v2.6.2 Shell · TopBar (h-48px)
//
// Replica fedele del mockup `Nuovo Guscio.html` §3.2:
//   [Brand] [Model selector] [Save chip] [Trust badge] —flex— [⌘K search]
//   [Run] [Undo] [Redo] [Notif] [Avatar]
//
// Preserva la logica esistente:
//   - Run button via `useRunAnalysis` (FeatureButton-equivalente)
//   - Undo/Redo via modelStore + historyStore
//   - Avatar/Notif via AvatarMenu/notificationsStore (componenti esistenti)
//   - Search pill apre la palette via workspaceStore.setPalette
//
// Classi CSS da `frontend/src/styles/shell.css` (.shell-topbar, .tb-*).

import { useState } from "react";
import { Play, Check, Undo2, Redo2, Bell, ChevronDown, HelpCircle } from "lucide-react";
import { useRunAnalysis } from "../hooks/useAnalysis";
import { useAnalysisStore } from "../store/analysisStore";
import { useModelStore } from "../store/modelStore";
import { useModelHistory } from "../store/historyStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useNotificationsStore } from "../store/notificationsStore";
import { APP_VERSION } from "../lib/version";
// v2.6.4 A.2: "Rivedi tour onboarding" replay
import { useResetOnboarding, startOnboardingTour } from "../lib/onboarding";
// v3.1 Fase 2a: AvatarMenu rich (Theme/Account/Location/Logout/Focus/Export)
// — prima era stub "FS" placeholder, ora è il dropdown vero con 5 feature
// sepolte rese accessibili anche in Shell custom (oltre che in chrome legacy).
import { AvatarMenu } from "../components/shell/topbar/AvatarMenu";

function formatSavedAt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

/**
 * v2.6.2.1 F3: slug semantico per il model selector.
 *
 * Costruisce uno short id dalle iniziali maiuscole delle parole del nome
 * modello. "Telaio portale 2D" → "TP2", "Mensola lineare" → "ML".
 * Fallback su UUID (primi 4 char uppercase) se name vuoto/inesistente.
 */
export function modelShortId(model: { id?: string; name?: string } | null): string {
  if (!model) return "—";
  const name = (model.name ?? "").trim();
  if (name) {
    const words = name.split(/\s+/).filter(Boolean);
    const initials = words
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (initials) return initials.slice(0, 4);
  }
  return (model.id ?? "").slice(0, 4).toUpperCase() || "—";
}

export function ShellTopBar() {
  const model = useModelStore((s) => s.model);
  const lastSavedAt = useModelStore((s) => s.lastSavedAt);
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const run = useRunAnalysis();
  const canUndo = useModelHistory((s) => s.past.length > 1);
  const canRedo = useModelHistory((s) => s.future.length > 0);
  const setPalette = useWorkspaceStore((s) => s.setPalette);
  const unread = useNotificationsStore((s) => s.items.filter((n) => !n.read).length);
  const [trustOpen, setTrustOpen] = useState(false);

  const handleRun = () => {
    if (!isRunning && model) {
      void run();
    }
  };
  const handleUndo = () => useModelStore.getState().undo();
  const handleRedo = () => useModelStore.getState().redo();

  return (
    <header className="shell-topbar" data-shell="topbar">
      {/* Brand block — v2.6.5 D.3: aggiunto eyebrow WORKSPACE mockup A1 */}
      <div className="tb-brand">
        <span className="tb-brand-eyebrow" data-testid="topbar-eyebrow">WORKSPACE</span>
        <div className="tb-mark">F</div>
        <span className="tb-brand-name">FEA Pro</span>
        <span className="tb-tier">FREE</span>
        <span className="tb-ver">{APP_VERSION}</span>
      </div>

      {/* Model selector */}
      <button
        type="button"
        className="tb-model"
        data-testid="topbar-model-menu"
        aria-label="Modello attivo"
      >
        {model && <span className="tb-model-id">{modelShortId(model)}</span>}
        <span>{model?.name ?? "Nessun modello"}</span>
        <ChevronDown size={12} />
      </button>

      {/* Save chip */}
      {lastSavedAt && (
        <div className="tb-save" data-testid="topbar-save-chip">
          <Check size={10} />
          Salvato {formatSavedAt(lastSavedAt)}
        </div>
      )}

      {/* Trust badge */}
      <button
        type="button"
        className="tb-trust"
        title="Risultati indicativi — non per progetti reali senza verifica indipendente"
        onClick={() => setTrustOpen((v) => !v)}
        aria-expanded={trustOpen}
      >
        Preliminary
      </button>

      <div className="tb-spacer" />

      {/* ⌘K search pill */}
      <button
        type="button"
        className="tb-search"
        onClick={() => setPalette(true)}
        data-testid="topbar-search"
        aria-label="Apri palette comandi"
      >
        {/* Inline magnifier (no dep) */}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>Cerca azioni, modelli, norme…</span>
        <span style={{ flex: 1 }} />
        <kbd>Ctrl K</kbd>
      </button>

      {/* Run button (preserva logica esistente) */}
      <button
        type="button"
        className="tb-run"
        onClick={handleRun}
        disabled={isRunning || !model}
        data-feature-id="run-static"
        data-testid="topbar-run"
        aria-label="Esegui analisi statica"
        title={!model ? "Carica un modello per lanciare l'analisi" : "Esegui (F5)"}
      >
        <Play size={12} />
        Esegui
        <kbd>F5</kbd>
      </button>

      <div style={{ width: 8 }} />

      {/* Undo */}
      <button
        type="button"
        className="tb-iconbtn"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-label="Annulla"
        title="Annulla (Ctrl Z)"
      >
        <Undo2 size={15} />
      </button>

      {/* Redo */}
      <button
        type="button"
        className="tb-iconbtn"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-label="Ripeti"
        title="Ripeti (Ctrl Shift Z)"
      >
        <Redo2 size={15} />
      </button>

      {/* v2.6.4 A.2: Help (rivedi tour onboarding) */}
      <HelpButton />

      {/* Notifications */}
      <div className="tb-iconbtn-wrap">
        <button type="button" className="tb-iconbtn" aria-label="Notifiche">
          <Bell size={15} />
          {unread > 0 && <span className="tb-iconbtn-badge" />}
        </button>
      </div>

      {/* v3.1 Fase 2a: AvatarMenu rich (Focus / Account / Location / Theme /
          Export JSON/CSV/PDF / Help / Logout). Prima era stub statico "FS" e
          l'utente in Shell custom non aveva accesso a queste 5 feature
          (raggiungibili solo via Cmd+K). Audit 2026-05-28 ha confermato il
          problema UX critico. */}
      <AvatarMenu />
    </header>
  );
}


/**
 * v2.6.4 A.2: button "?" che riavvia il tour onboarding.
 *
 * UX: click → PATCH /api/auth/onboarding {completed:false} → dispatch
 * `feapro:tour:start` event → OnboardingTour si apre dallo step 1.
 */
function HelpButton() {
  const resetOnboarding = useResetOnboarding();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await resetOnboarding();
      startOnboardingTour();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="tb-iconbtn"
      onClick={handleClick}
      disabled={busy}
      aria-label="Rivedi tour onboarding"
      title="Rivedi tour onboarding"
      data-testid="topbar-help-tour"
    >
      <HelpCircle size={15} />
    </button>
  );
}
