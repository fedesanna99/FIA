/**
 * MobileMoreMenu (v1.5 Task 30) — contenuto del tab "Altro" su mobile.
 *
 * Lista voci raggiungibili anche da AvatarMenu/palette/RightRail desktop:
 *  - Verifiche (apre VerifyPanel)
 *  - Tools (apre ToolsPanel)
 *  - Cerca comandi (apre palette)
 *  - AI Copilot (Tools sub-view, accesso simmetrico a desktop)
 *  - Tema (toggle dark/light)
 *  - Account & quota
 *  - Modalita' focus
 *
 * v1.5 Task 30 follow-up: la TopBar su mobile non mostra piu' AICopilotButton
 * ne' Bell, quindi questo menu' e' il fallback per AI Copilot. Le notifiche
 * Bell restano accessibili indirettamente via toast stack in basso.
 */
import {
  ShieldCheck, Layers, Wrench, Search, Sun, Moon, User, Maximize, Sparkles,
  type LucideIcon, ChevronRight,
} from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useThemeStore } from "../../store/themeStore";


interface MenuRow {
  id: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  onClick: () => void;
}


export function MobileMoreMenu() {
  const setTab = useWorkspaceStore((s) => s.setMobileTab);
  const setPalette = useWorkspaceStore((s) => s.setPalette);
  const enterEmpty = useWorkspaceStore((s) => s.enterEmptyState);
  const themeMode = useThemeStore((s) => s.mode);
  const setTheme = useThemeStore((s) => s.setMode);

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const goVerify = () => {
    // Su mobile non abbiamo rail laterali — apriamo il "verify" come tab
    // mobile (riusa il MobilePanel wrapper). In App.tsx il render dei tab
    // gestisce questa modalita'.
    setTab("more"); // verify riuserebbe make tab? In MVP usiamo more come hub di scelta.
    // TODO v1.5+: aggiungi VerifyPanel come sub-tab di "more" o nuovo tab.
    window.dispatchEvent(new CustomEvent("feapro:mobile-open-verify"));
  };

  const goView = () => {
    window.dispatchEvent(new CustomEvent("feapro:open-view-panel"));
  };

  const goTools = () => {
    window.dispatchEvent(new CustomEvent("feapro:mobile-open-tools"));
  };

  const goAiCopilot = () => {
    goTools();
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("feapro:tools-view", { detail: { view: "ai-copilot" } }));
    }, 0);
  };

  const goAccount = () => {
    window.dispatchEvent(new CustomEvent("feapro:open-account"));
  };

  const goFocus = () => {
    setTab(null);
    enterEmpty();
  };

  const ROWS: MenuRow[] = [
    {
      id: "verify",
      label: "Verifiche",
      sub: "EC2/EC3/EC5/EC8/NTC",
      icon: ShieldCheck,
      onClick: goVerify,
    },
    {
      id: "view",
      label: "View",
      sub: "Preset viewport · engine · layer",
      icon: Layers,
      onClick: goView,
    },
    {
      id: "tools",
      label: "Strumenti",
      sub: "Export · validazione · cost preview",
      icon: Wrench,
      onClick: goTools,
    },
    {
      id: "palette",
      label: "Cerca comandi",
      sub: "Command palette (Ctrl+K)",
      icon: Search,
      onClick: () => setPalette(true),
    },
    {
      id: "ai-copilot",
      label: "AI Copilot",
      sub: "Chat sul modello attivo",
      icon: Sparkles,
      onClick: goAiCopilot,
    },
    {
      id: "theme",
      label: themeMode === "dark" ? "Tema chiaro" : "Tema scuro",
      sub: themeMode === "dark" ? "Switch a light mode" : "Switch a dark mode",
      icon: themeMode === "dark" ? Sun : Moon,
      onClick: toggleTheme,
    },
    {
      id: "account",
      label: "Account & quota",
      sub: "Usage · tier · billing",
      icon: User,
      onClick: goAccount,
    },
    {
      id: "focus",
      label: "Modalità focus",
      sub: "Solo viewport — premi F/Esc per uscire",
      icon: Maximize,
      onClick: goFocus,
    },
  ];

  return (
    <div className="p-3 space-y-1.5" data-testid="mobile-more-menu">
      {ROWS.map((row) => {
        const Icon = row.icon;
        return (
          <button
            key={row.id}
            type="button"
            onClick={row.onClick}
            data-testid={`mobile-more-${row.id}`}
            className="w-full inline-flex items-center gap-3 p-3 border border-border bg-bg-elevated hover:bg-bg-hover hover:border-accent/50 text-left transition-colors group"
          >
            <div className="w-10 h-10 bg-bg-info text-accent border border-border-light flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[15px] font-semibold tracking-tight-1 text-ink">{row.label}</div>
              <div className="text-[12px] text-ink-3 mt-0.5">{row.sub}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-3 flex-shrink-0 group-hover:text-accent transition-colors" />
          </button>
        );
      })}
    </div>
  );
}
