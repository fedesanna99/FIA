/**
 * v3.4 Fetta M1 mobile (30/05/2026) — topbar mobile menu (hamburger).
 *
 * Bottone hamburger + Radix DropdownMenu con tutti gli elementi della
 * ShellTopBar che vengono nascosti su mobile via CSS `@media (max-width:
 * 639px)`. Pattern di rendering: il componente e' SEMPRE montato; la
 * visibilita' del trigger e' gestita esclusivamente dal CSS
 * (`.tb-mobile-menu { display: none }` di default, `display: grid`
 * quando viewport < 640px). Niente `useIsMobile`, niente re-render su
 * resize, zero JS condizionale → performance pulita su entrata/uscita
 * orientation change.
 *
 * I 3 elementi che restano visibili sulla topbar anche su mobile (oltre
 * a questo trigger):
 *   - Brand compact (F mark + "FEA Pro")
 *   - Run button (verbo principale, sempre primary CTA)
 *   - Avatar dropdown (identita' utente)
 *
 * Sezioni nel dropdown (vedi ADR 004 D2 e socio/05-prototipi-workspace-v3/):
 *   1. NAVIGAZIONE — Home / Modelli / Jobs (replica quick-nav desktop)
 *   2. VISTA       — Albero / Focus (replica i 2 toggle desktop)
 *   3. AZIONI      — Cerca (palette) / Annulla / Ripeti / Notifiche / Tour
 *
 * Pattern: riusa gli stessi store di ShellTopBar (modelStore, historyStore,
 * workspaceStore, leftTreeStore, notificationsStore) leggendo direttamente
 * tramite hook → nessuna duplicazione di logica, nessun prop-drilling.
 * Identico al pattern AvatarMenu.tsx (Fetta E2.1).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Menu, Home, LayoutGrid, Activity, PanelLeft, Maximize2,
  Search, Undo2, Redo2, Bell, HelpCircle,
} from "lucide-react";
import { useModelStore } from "../store/modelStore";
import { useModelHistory } from "../store/historyStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useNotificationsStore } from "../store/notificationsStore";
import { useLeftTreeStore } from "../store/leftTreeStore";
import { useResetOnboarding, startOnboardingTour } from "../lib/onboarding";

const ITEM_CLS =
  "flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-bg-hover focus:bg-bg-hover focus:outline-none cursor-pointer transition-colors";

const ITEM_DISABLED_CLS =
  "flex items-center gap-2.5 px-3 py-2 text-sm text-ink-faint cursor-not-allowed opacity-50";

const SECTION_LABEL_CLS =
  "px-3 pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold";

const STATE_CHIP_CLS =
  "ml-auto font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium";

export function ShellTopBarMobileMenu() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Store subscriptions — stesso pattern di ShellTopBar.
  const setPalette = useWorkspaceStore((s) => s.setPalette);
  const isFocusMode = useWorkspaceStore((s) => s.isEmptyState);
  const enterFocus = useWorkspaceStore((s) => s.enterEmptyState);
  const exitFocus = useWorkspaceStore((s) => s.exitEmptyState);

  const treeOpen = useLeftTreeStore((s) => s.treeState === "open");
  const toggleTree = useLeftTreeStore((s) => s.toggle);

  const canUndo = useModelHistory((s) => s.past.length > 1);
  const canRedo = useModelHistory((s) => s.future.length > 0);

  const unread = useNotificationsStore(
    (s) => s.items.filter((n) => !n.read).length,
  );

  const resetOnboarding = useResetOnboarding();

  // Handlers — replica di quelli in ShellTopBar (event dispatch + navigate +
  // store mutations). Identici per garantire feature parity tra mobile e desktop.
  const handleHome = () => {
    window.dispatchEvent(new Event("feapro:go-home"));
  };
  const handleModelli = () => {
    navigate("/modelli");
  };
  const handleJobs = () => {
    navigate("/jobs");
  };

  const handleToggleFocus = () => {
    if (isFocusMode) exitFocus();
    else enterFocus();
  };

  const handleUndo = () => useModelStore.getState().undo();
  const handleRedo = () => useModelStore.getState().redo();
  const handleSearch = () => setPalette(true);

  const handleTour = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await resetOnboarding();
      startOnboardingTour();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="tb-iconbtn tb-mobile-menu"
          aria-label="Apri menu mobile"
          title="Menu"
          data-testid="topbar-mobile-menu"
        >
          <Menu size={16} strokeWidth={1.8} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="min-w-[240px] bg-bg-elevated border border-border-light shadow-dialog z-50 overflow-hidden animate-slide-down"
          data-testid="topbar-mobile-menu-content"
        >
          {/* ── Sezione 1 · Navigazione ── */}
          <div className={SECTION_LABEL_CLS}>Navigazione</div>
          <div className="py-1">
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); handleHome(); }}
              className={ITEM_CLS}
              data-testid="mobile-menu-home"
            >
              <Home className="w-3.5 h-3.5 text-ink-3" />
              Home
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); handleModelli(); }}
              className={ITEM_CLS}
              data-testid="mobile-menu-modelli"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-ink-3" />
              Modelli
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); handleJobs(); }}
              className={ITEM_CLS}
              data-testid="mobile-menu-jobs"
            >
              <Activity className="w-3.5 h-3.5 text-ink-3" />
              Jobs
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="h-px bg-border" />

          {/* ── Sezione 2 · Vista ── */}
          <div className={SECTION_LABEL_CLS}>Vista</div>
          <div className="py-1">
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); toggleTree(); }}
              className={ITEM_CLS}
              data-testid="mobile-menu-tree"
            >
              <PanelLeft className="w-3.5 h-3.5 text-ink-3" />
              Albero modello
              <span className={STATE_CHIP_CLS}>{treeOpen ? "On" : "Off"}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); handleToggleFocus(); }}
              className={ITEM_CLS}
              data-testid="mobile-menu-focus"
            >
              <Maximize2 className="w-3.5 h-3.5 text-ink-3" />
              Modalità focus
              <span className={STATE_CHIP_CLS}>{isFocusMode ? "On" : "Off"}</span>
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="h-px bg-border" />

          {/* ── Sezione 3 · Azioni ── */}
          <div className={SECTION_LABEL_CLS}>Azioni</div>
          <div className="py-1">
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); handleSearch(); }}
              className={ITEM_CLS}
              data-testid="mobile-menu-search"
            >
              <Search className="w-3.5 h-3.5 text-ink-3" />
              Cerca azioni
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                if (canUndo) handleUndo();
              }}
              className={canUndo ? ITEM_CLS : ITEM_DISABLED_CLS}
              disabled={!canUndo}
              data-testid="mobile-menu-undo"
            >
              <Undo2 className="w-3.5 h-3.5 text-ink-3" />
              Annulla
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                if (canRedo) handleRedo();
              }}
              className={canRedo ? ITEM_CLS : ITEM_DISABLED_CLS}
              disabled={!canRedo}
              data-testid="mobile-menu-redo"
            >
              <Redo2 className="w-3.5 h-3.5 text-ink-3" />
              Ripeti
            </DropdownMenu.Item>
            {/* Notifiche: no-op come su desktop (placeholder per feature
                futura). Mostra il counter unread per coerenza visiva. */}
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); }}
              className={ITEM_CLS}
              data-testid="mobile-menu-notif"
            >
              <Bell className="w-3.5 h-3.5 text-ink-3" />
              Notifiche
              {unread > 0 && <span className={STATE_CHIP_CLS}>{unread}</span>}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); void handleTour(); }}
              className={ITEM_CLS}
              disabled={busy}
              data-testid="mobile-menu-tour"
            >
              <HelpCircle className="w-3.5 h-3.5 text-ink-3" />
              Rivedi tour
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
