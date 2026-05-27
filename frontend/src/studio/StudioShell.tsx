/**
 * StudioShell · v2.7.4 Phase 5.1 mockup-driven
 *
 * Wrapper riusato dalle 4 pagine Studio (Modello/Analisi/Verifiche/IO).
 * Monta TopBar + Rail + StatusBar comuni; lascia slot `children` per
 * Tree (opzionale), Viewport e Panel specifici di ogni workspace.
 *
 * Layout grid: 52 + 280 + 1fr + 380  (con Tree)
 *              52 + 1fr + 380         (no Tree, mid 3 col)
 *
 * Source: ui_kits/webapp_desktop/studio.css (shared chrome).
 */
import { Link, useNavigate } from "react-router-dom";
import { Activity, Bell, Bug, CheckCircle2, Cog, Play, Redo2, Search, Settings, Shuffle, Undo2, BookOpen, ChevronDown, Box } from "lucide-react";
import type { ReactNode } from "react";

import { useAuthStore } from "../store/authStore";


export type StudioWorkspace = "modello" | "analisi" | "risultati" | "verifiche" | "io";

interface RailDef {
  id: StudioWorkspace;
  label: string;
  Icon: typeof Box;
  kbd: string;
  to: string;
}

const RAIL: readonly RailDef[] = [
  { id: "modello",   label: "Modello",   Icon: Box,          kbd: "1", to: "/studio/modello" },
  { id: "analisi",   label: "Analisi",   Icon: Cog,          kbd: "2", to: "/studio/analisi" },
  { id: "risultati", label: "Risultati", Icon: Activity,     kbd: "3", to: "/" },
  { id: "verifiche", label: "Verifiche", Icon: CheckCircle2, kbd: "4", to: "/studio/verifiche" },
  { id: "io",        label: "I/O",       Icon: Shuffle,      kbd: "5", to: "/studio/io" },
];


interface StudioShellProps {
  active: StudioWorkspace;
  /** Stato workspace per StatusBar bottom-right (es. "Modello · Mesh"). */
  workspaceState: string;
  /** Layout colonne centrali. "with-tree" = 52+280+1fr+380 (Modello).
   *  "no-tree" = 52+1fr+380 (Analisi/Verifiche/IO). */
  midLayout?: "with-tree" | "no-tree";
  /** Slot del contenuto centrale (Tree opzionale + Viewport + Panel). */
  children: ReactNode;
}

export function StudioShell({ active, workspaceState, midLayout = "with-tree", children }: StudioShellProps): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const initials = (user?.email ?? "FS").slice(0, 2).toUpperCase();
  // v2.7.4: tier hardcoded "FREE" — billing tier deriva da useBillingQuota,
  // ma per il chrome statico in topbar è sufficiente il default.
  const tier = "FREE";

  // v2.9.1 Sprint C M5: dispatch Cmd+K keyboard event al click del button.
  // L'event listener globale in App.tsx (legacy) cattura Cmd+K e apre la
  // palette. Approach più clean di un custom event perché la palette esiste
  // gi e riusa shortcut OS standard.
  const openCmdPalette = () => {
    const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    }));
  };

  return (
    // v3.0.0 Sprint F F3: data-app-mode attributo stabile (vedi Shell.tsx).
    <div className="studio" data-app-mode="studio-v2">

      {/* ╔═══════════ TOPBAR ═══════════╗ */}
      <header className="s-topbar">
        <Link className="s-brand-block" to="/">
          <span className="s-brand-square">F</span>
          <span className="s-brand-name">FEA Pro</span>
          <span className="s-brand-tier">{tier}</span>
          <span className="s-brand-ver">v2.7.4</span>
        </Link>

        <button type="button" className="s-model-pill">
          <span className="s-model-id">UC1</span>
          <span>Trave bi-appoggiata</span>
          <ChevronDown size={12} />
        </button>

        <div className="s-save">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Salvato 14:32
        </div>

        <button
          type="button"
          className="s-trust trust-prelim"
          title="Stato del calcolo: PRELIMINARY · click per dettagli"
          onClick={() => navigate("/preliminary")}
          style={{ border: "none", cursor: "pointer" }}
        >
          <span className="trust-dot" />
          Preliminary
        </button>

        <div className="s-spacer" />

        <button type="button" className="s-cmd" onClick={openCmdPalette}>
          <Search size={13} />
          <span>Cerca azioni, modelli, norme…</span>
          <kbd>⌘ K</kbd>
        </button>

        <button type="button" className="s-run">
          <Play size={12} fill="currentColor" />
          Esegui
          <kbd>F5</kbd>
        </button>

        <button type="button" className="s-iconbtn" aria-label="Undo">
          <Undo2 size={15} />
        </button>
        <button type="button" className="s-iconbtn" aria-label="Redo">
          <Redo2 size={15} />
        </button>
        <button type="button" className="s-iconbtn s-iconbtn-badge" aria-label="Notifiche">
          <Bell size={15} />
          <span className="badge-dot" />
        </button>
        <button type="button" className="s-avatar" aria-label="Profilo">{initials}</button>
      </header>

      {/* ╔═══════════ MID = Rail + slot ═══════════╗ */}
      <div className={midLayout === "no-tree" ? "s-mid s-mid-no-tree" : "s-mid"}>

        {/* ─── RAIL ─── */}
        <nav className="s-rail" aria-label="Workspace switcher">
          {RAIL.map((r) => {
            const Icon = r.Icon;
            const isActive = r.id === active;
            return (
              <Link
                key={r.id}
                to={r.to}
                className={isActive ? "rail-btn is-active" : "rail-btn"}
                aria-label={r.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className="rail-kbd">{r.kbd}</span>
              </Link>
            );
          })}
          <div className="rail-sep" />
          <button type="button" className="rail-btn" aria-label="Auto-detect">
            <Bug size={18} strokeWidth={1.8} />
          </button>
          <button type="button" className="rail-btn" aria-label="Docs">
            <BookOpen size={18} strokeWidth={1.8} />
          </button>
          <div className="rail-spacer" />
          <button type="button" className="rail-btn" aria-label="Impostazioni">
            <Settings size={18} strokeWidth={1.8} />
          </button>
        </nav>

        {children}
      </div>

      {/* ╔═══════════ STATUS BAR ═══════════╗ */}
      <footer className="s-statusbar">
        <span className="sb-item"><span className="sb-dot" /><span className="sb-v">Online</span><span className="sb-k">· fea-pro.fly.dev</span></span>
        <span className="sb-sep" />
        <span className="sb-item"><span className="sb-k">Selezione</span><span className="sb-v">EL 5 · IPE 300</span></span>
        <span className="sb-sep" />
        <span className="sb-item"><span className="sb-k">Unità</span><span className="sb-v">SI · kN, m, MPa</span></span>
        <span className="sb-sep" />
        <span className="sb-item"><span className="sb-k">Snap</span><span className="sb-v">0.10 m</span></span>
        <span className="sb-spacer" />
        <span className="sb-item"><span className="sb-k">Workspace</span><span className="sb-v">{workspaceState}</span></span>
        <span className="sb-sep" />
        <span className="sb-item"><span className="sb-v">11 nodi · 10 beam · 2 vincoli · 1 carico</span></span>
      </footer>
    </div>
  );
}
