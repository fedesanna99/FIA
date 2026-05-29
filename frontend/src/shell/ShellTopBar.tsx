// v2.6.2 Shell · TopBar (h-48px)
//
// Replica fedele del mockup `Nuovo Guscio.html` §3.2:
//   [Brand] [Model selector] [Save chip] [Trust badge] —flex— [⌘K search]
//   [Run] [Undo] [Redo] [Notif] [Avatar]
//
// v3.4 Fetta E2-IA · Commit E2.1 — IA prototipo v3 ADDITIVA:
//   [Brand] [⌂ Home][▦ Modelli][⚙ Jobs] · [Model selector] [Save] [Trust]
//   —flex— [Toggle Albero][Toggle Focus][⌘K] [Run] [Undo][Redo] [?][🔔][Avatar]
//
// Preserva la logica esistente:
//   - Run button via `useRunAnalysis` (FeatureButton-equivalente)
//   - Undo/Redo via modelStore + historyStore
//   - Avatar/Notif via AvatarMenu/notificationsStore (componenti esistenti)
//   - Search pill apre la palette via workspaceStore.setPalette
//
// Aggiunge in E2.1:
//   - 3 icone fisse Home/Modelli/Jobs accanto al brand (cablate Fetta
//     E2.5d → route placeholder PlaceholderPages.tsx)
//   - Toggle Albero (placeholder useState, cablato in E2.4 al panel SX)
//   - Toggle Focus cablato a workspaceStore.enterEmptyState/exitEmptyState
//     (focus mode già implementato in Fetta 0, qui SOLO il cablaggio toggle)
//   - AvatarMenu invariato (vedi AvatarMenu.tsx Fetta E2-IA per estensione)
//
// Classi CSS da `frontend/src/styles/shell.css` (.shell-topbar, .tb-*).
// I 2 toggle usano `data-state="on|off"` per varianti di stile (vedi shell.css).

import { useState } from "react";
// v3.4 Fetta E2.5d: useNavigate per cablaggio handler Modelli/Jobs alle
// nuove route create in main.tsx. Era TODO E2.5 nei commenti di E2.1.
import { useNavigate } from "react-router-dom";
import {
  Play, Check, Undo2, Redo2, Bell, ChevronDown, HelpCircle,
  Home, LayoutGrid, Activity, PanelLeft, Maximize2,
} from "lucide-react";
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
// v3.4 Fetta E2-IA Commit E2.1: AvatarMenu esteso con voci IA prototipo v3
// (Cronologia, Template, Docs) — vedi AvatarMenu.tsx.
import { AvatarMenu } from "../components/shell/topbar/AvatarMenu";
// v3.4 Fetta E2-IA Commit E2.4: cablaggio del toggle Albero al
// `leftTreeStore`. Sostituisce lo `useState(treeOpen)` locale di E2.1
// (placeholder) con uno store Zustand persisted che governa anche
// il rendering del `ShellLeftTreePanel` in Shell.tsx.
import { useLeftTreeStore } from "../store/leftTreeStore";

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

  // v3.4 Fetta E2-IA Commit E2.1: focus mode cablato a workspaceStore
  // (focus mode già live da Fetta 0 — qui SOLO il toggle topbar).
  const isFocusMode = useWorkspaceStore((s) => s.isEmptyState);
  const enterFocus = useWorkspaceStore((s) => s.enterEmptyState);
  const exitFocus = useWorkspaceStore((s) => s.exitEmptyState);

  // v3.4 Fetta E2-IA Commit E2.4: toggle Albero cablato al `leftTreeStore`.
  // Sostituisce l'useState(treeOpen) placeholder di E2.1: ora il click
  // apre/chiude il `ShellLeftTreePanel` (panel SX con gerarchia del
  // modello — vedi `shell/ShellLeftTreePanel.tsx`). Lo stato e' persistito
  // in localStorage chiave `feapro-left-tree` cosi' la preferenza
  // sopravvive al refresh per l'utente power.
  const treeOpen = useLeftTreeStore((s) => s.treeState === "open");
  const toggleTree = useLeftTreeStore((s) => s.toggle);

  const handleRun = () => {
    if (!isRunning && model) {
      void run();
    }
  };
  const handleUndo = () => useModelStore.getState().undo();
  const handleRedo = () => useModelStore.getState().redo();

  // v3.4 Fetta E2-IA Commit E2.1: handler navigation 3 icone fisse.
  // v3.4 Fetta E2.5d (29/05 sera): Modelli + Jobs cablati alle 4 nuove
  // route placeholder onesti (`PlaceholderPages.tsx`). Le 3 icone sono
  // ora navigation reali. Home resta su dispatch event per coesistenza
  // con GlobalRoutingListeners + state reset App.tsx (pattern E2.1).
  const navigate = useNavigate();
  const handleHome = () => {
    // ⌂ Home → torna alla Dashboard. Dispatch custom event raccolto da
    // GlobalRoutingListeners (cross-route) → navigate("/", { state:
    // { goHome: true } }) → App.tsx legge state e fa setActiveId(null).
    window.dispatchEvent(new Event("feapro:go-home"));
  };
  const handleModelli = () => {
    navigate("/modelli");
  };
  const handleJobs = () => {
    navigate("/jobs");
  };

  // v3.4 Fetta E2-IA Commit E2.1: handler toggle Focus.
  // Pattern simmetrico con il SolverOverlay esistente: leggi isEmptyState
  // dallo store, attiva/disattiva con i metodi gia' presenti.
  const handleToggleFocus = () => {
    if (isFocusMode) exitFocus();
    else enterFocus();
  };

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

      {/* v3.4 Fetta E2-IA Commit E2.1: 3 icone fisse Home/Modelli/Jobs.
          Pattern `tb-iconbtn` esistente (32×32, rounded-md var(--r-md),
          hover bg-hover) per coerenza con gli iconbtn destra (Undo/Redo/
          Help/Bell). gap 2 tra ognuna, padding-left 8 per stacco dal
          brand block. Modelli/Jobs cablati in Fetta E2.5d → /modelli e
          /jobs (vedi handler navigate + PlaceholderPages.tsx). */}
      <div
        className="tb-quick-nav"
        data-testid="topbar-quick-nav"
        style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 8 }}
      >
        <button
          type="button"
          className="tb-iconbtn"
          onClick={handleHome}
          aria-label="Home — torna alla Dashboard"
          title="Home"
          data-testid="topbar-nav-home"
        >
          <Home size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="tb-iconbtn"
          onClick={handleModelli}
          aria-label="Modelli — browser modelli"
          title="Modelli"
          data-testid="topbar-nav-modelli"
        >
          <LayoutGrid size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="tb-iconbtn"
          onClick={handleJobs}
          aria-label="Jobs — coda processi"
          title="Jobs"
          data-testid="topbar-nav-jobs"
        >
          <Activity size={16} strokeWidth={1.8} />
        </button>
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

      {/* v3.4 Fetta E2-IA Commit E2.1: 2 toggle Albero + Focus, posizionati
          PRIMA della ⌘K palette per stacco visivo dal cluster azioni.
          Pattern `tb-iconbtn-wrap > tb-iconbtn[data-state]` + `aria-pressed`
          + badge visivo "on" (vedi shell.css regola `[data-state="on"]`). */}
      <div className="tb-iconbtn-wrap">
        <button
          type="button"
          className="tb-iconbtn"
          onClick={toggleTree}
          aria-label="Albero modello — mostra/nascondi"
          aria-pressed={treeOpen}
          data-state={treeOpen ? "on" : "off"}
          title={treeOpen ? "Nascondi albero" : "Mostra albero"}
          data-testid="topbar-toggle-tree"
        >
          <PanelLeft size={16} strokeWidth={1.8} />
          {treeOpen && <span className="tb-iconbtn-badge" />}
        </button>
      </div>
      <div className="tb-iconbtn-wrap">
        <button
          type="button"
          className="tb-iconbtn"
          onClick={handleToggleFocus}
          aria-label="Modalità focus — schermo intero viewport"
          aria-pressed={isFocusMode}
          data-state={isFocusMode ? "on" : "off"}
          title={isFocusMode ? "Esci da focus mode (F)" : "Entra in focus mode (F)"}
          data-testid="topbar-toggle-focus"
        >
          <Maximize2 size={16} strokeWidth={1.8} />
          {isFocusMode && <span className="tb-iconbtn-badge" />}
        </button>
      </div>

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
