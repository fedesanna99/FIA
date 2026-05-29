/**
 * DashTopBar · Fetta E3.1 (redesign workspace-fasi)
 *
 * Replica visiva di `ShellTopBar` E2.1 (IA prototipo v3) per la home
 * Dashboard. Stesso shell brand + 3 nav fissi (Home/Modelli/Jobs) +
 * ⌘K palette + help + notifiche + AvatarMenu.
 *
 * Differenze rispetto a ShellTopBar (workspace-only):
 *   - NIENTE model selector / save chip / Run / undo·redo / toggle
 *     Albero·Focus → quelli vivono solo nel workspace
 *   - Nav fissi mostrano LABEL visibili ("Home/Modelli/Jobs") perché in
 *     home c'è spazio. Nel workspace sono solo icone perché lo spazio
 *     è preso da model selector + Run + undo/redo.
 *
 * Markup + classi corrispondono al mockup di Claude Design Round 2
 * (Handoff 05): `Dashboard.html` sezione `<header class="dash-topbar">`.
 * Stili in `src/styles/dashboard-soft.css`.
 *
 * Convention "vince il mockup" (ADR 002): se il rendering React diverge
 * dal mockup, vince il mockup. Riferimento:
 *   .claude/ricordi/handoffs/05-claude-design-round2-response.md
 */
import { Link } from "react-router-dom";
import { Home, Box, Activity, Search, HelpCircle, Bell } from "lucide-react";
import { APP_VERSION } from "../lib/version";
import { useNotificationsStore } from "../store/notificationsStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { AvatarMenu } from "../components/shell/topbar/AvatarMenu";
import "../styles/dashboard-soft.css";

export interface DashTopBarProps {
  /** Rotta corrente per evidenziare il link nav attivo. Default: "home". */
  activePath?: "home" | "modelli" | "jobs";
  /**
   * Tier dell'utente per il chip nel brand block (es. "FREE", "PRO").
   * Default "FREE". Il caller (DashboardPage) puo' passare il tier vero
   * derivato da `useQuery(getQuota)`. In E3.8 collegheremo direttamente
   * il quotaStore quando esistera'.
   */
  tierLabel?: string;
}

export function DashTopBar({ activePath = "home", tierLabel = "FREE" }: DashTopBarProps) {
  const setPalette = useWorkspaceStore((s) => s.setPalette);
  const unread = useNotificationsStore((s) => s.items.filter((n) => !n.read).length);

  const handleHome = () => {
    // Già in home — comportamento idle (no navigation). Confronto con
    // ShellTopBar (Fetta E2.1) che fa dispatch `feapro:go-home`: in
    // DashTopBar non serve perché siamo gia in `/`.
  };

  const handleModelli = () => {
    // TODO E2.5 (o backlog): route /modelli mancante. ModelliBrowser
    // esiste come overlay full-screen ma non c'è pagina dedicata.
    // Stesso TODO di ShellTopBar.
  };

  const handleJobs = () => {
    // TODO E2.5 (o backlog): route /jobs mancante. useJobsStore +
    // activeJob esistono ma no pagina dedicata coda processi.
  };

  return (
    <header className="dash-topbar" data-testid="dash-topbar">
      {/* Brand block — identico per pattern a ShellTopBar.tsx */}
      <Link to="/" className="tb-brand" style={{ textDecoration: "none" }} aria-label="Home">
        <span className="tb-mark">F</span>
        <div className="tb-brand-stack">
          <div className="tb-brand-row">
            <span className="tb-brand-name">FEA Pro</span>
            <span className="tb-tier">{tierLabel}</span>
          </div>
          <span className="tb-ver">{APP_VERSION}</span>
        </div>
      </Link>

      {/* Nav fissi — 3 voci con label visibili (Dashboard ha spazio) */}
      <nav className="tb-nav" aria-label="Navigazione globale">
        <button
          type="button"
          className={`tb-navlink${activePath === "home" ? " is-active" : ""}`}
          onClick={handleHome}
          aria-current={activePath === "home" ? "page" : undefined}
          data-testid="dash-nav-home"
        >
          <Home size={16} strokeWidth={1.8} aria-hidden />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={`tb-navlink${activePath === "modelli" ? " is-active" : ""}`}
          onClick={handleModelli}
          title="Modelli (in arrivo)"
          data-testid="dash-nav-modelli"
        >
          <Box size={16} strokeWidth={1.8} aria-hidden />
          <span>Modelli</span>
        </button>
        <button
          type="button"
          className={`tb-navlink${activePath === "jobs" ? " is-active" : ""}`}
          onClick={handleJobs}
          title="Jobs (in arrivo)"
          data-testid="dash-nav-jobs"
        >
          <Activity size={16} strokeWidth={1.8} aria-hidden />
          <span>Jobs</span>
        </button>
      </nav>

      <div className="tb-spacer" />

      {/* ⌘K command palette (pillola) */}
      <button
        type="button"
        className="cmd-pill"
        onClick={() => setPalette(true)}
        aria-label="Apri palette comandi"
        data-testid="dash-cmd-pill"
      >
        <Search size={14} strokeWidth={1.8} aria-hidden />
        <span>Cerca modelli, template, azioni…</span>
        <kbd>⌘ K</kbd>
      </button>

      {/* Help — riapre il tour onboarding via custom event globale */}
      <button
        type="button"
        className="tb-iconbtn"
        aria-label="Aiuto"
        title="Aiuto e shortcut"
        onClick={() => window.dispatchEvent(new Event("feapro:open-help"))}
        data-testid="dash-help-btn"
      >
        <HelpCircle size={17} strokeWidth={1.8} aria-hidden />
      </button>

      {/* Notifiche — coral dot se unread > 0 (pattern shell.css esistente) */}
      <button
        type="button"
        className="tb-iconbtn"
        aria-label="Notifiche"
        data-testid="dash-bell-btn"
      >
        {unread > 0 && <span className="dot" />}
        <Bell size={17} strokeWidth={1.8} aria-hidden />
      </button>

      {/* AvatarMenu — riusiamo il componente Radix esistente
          (frontend/src/components/shell/topbar/AvatarMenu.tsx).
          Stilisticamente identico in Shell custom e Dashboard. Le voci
          (Cronologia/Template/Settings/Docs) sono già state estese in E2.1. */}
      <div className="tb-avatar-slot">
        <AvatarMenu />
      </div>
    </header>
  );
}
