/**
 * AvatarMenu (alpha.31 — refactor Progressive Disclosure Task 18).
 *
 * Single entry point dell'utente in topbar. Cliccando l'avatar:
 *  - email + label "Connesso come"
 *  - Modalità focus (kbd Shift+Space) → chiude rails + entra empty state
 *  - Account & quota → AccountDialog
 *  - Loads location → LocationPickerDialog
 *  - Tema (cycle light/dark/system)
 *  - ───
 *  - Esporta JSON (modello + risultati)
 *  - Esporta CSV (displacements + modes)
 *  - Esporta PDF (report viewport + tabelle)
 *  - ───
 *  - Aiuto e shortcut
 *  - ───
 *  - Logout
 *
 * Anonimo → mostra solo bottone "Accedi" (apre AuthDialog).
 *
 * Sostituisce simultaneamente in TopBar i bottoni isolati Loads/Account/
 * Logout/Focus/Export (i 3 ultimi rimossi in Task 18). Niente prop
 * drilling: le azioni leggono direttamente dagli store / utility.
 */
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  User, MapPin, LogOut, LogIn, Sun, Moon, Monitor,
  Eye, FileJson, FileSpreadsheet, FileText, HelpCircle,
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { useThemeStore } from "../../../store/themeStore";
import { useModelStore } from "../../../store/modelStore";
import { useResultsStore } from "../../../store/resultsStore";
import { useLeftRailStore } from "../../../store/leftRailStore";
import { useRightRailStore } from "../../../store/rightRailStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useUIStore } from "../../../store/uiStore";
import { toast } from "../../../store/toastStore";
import {
  exportModelJson, exportResultsJson,
  exportDisplacementsCSV, exportModesCSV,
} from "../../../utils/export";
import { generateReport, viewportCanvasDataUrl } from "../../../utils/reportPdf";
import { Button } from "../../ui/Button";
import { Tooltip } from "../../ui/Tooltip";
import { CollabAvatars } from "./CollabAvatars";

const THEME_ICON = { light: Moon, dark: Monitor, system: Sun } as const;
const THEME_LABEL = { light: "Light", dark: "Dark", system: "System" } as const;

const ITEM_CLS =
  "flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-bg-hover focus:bg-bg-hover focus:outline-none cursor-pointer";

function enterFocusMode() {
  useLeftRailStore.getState().close();
  useRightRailStore.getState().close();
  useWorkspaceStore.getState().enterEmptyState();
}

function doExportJson() {
  const model = useModelStore.getState().model;
  if (!model) { toast("warning", "Nessun modello attivo."); return; }
  const { staticResults, modalResults, dynamicResults } = useResultsStore.getState();
  exportModelJson(model);
  if (staticResults)  exportResultsJson(`${model.name}_static`,  staticResults);
  if (modalResults)   exportResultsJson(`${model.name}_modal`,   modalResults);
  if (dynamicResults) exportResultsJson(`${model.name}_dynamic`, dynamicResults);
  toast("success", "Export JSON completato");
}

function doExportCsv() {
  const model = useModelStore.getState().model;
  if (!model) { toast("warning", "Nessun modello attivo."); return; }
  const { staticResults, modalResults } = useResultsStore.getState();
  if (!staticResults && !modalResults) {
    toast("info", "Nessun risultato statico/modale da esportare.");
    return;
  }
  if (staticResults) exportDisplacementsCSV(model, staticResults);
  if (modalResults)  exportModesCSV(model, modalResults);
  toast("success", "Export CSV completato");
}

function doExportPdf() {
  const model = useModelStore.getState().model;
  if (!model) { toast("warning", "Nessun modello attivo."); return; }
  const { staticResults, modalResults } = useResultsStore.getState();
  try {
    const viewportPng = viewportCanvasDataUrl();
    generateReport({ model, staticResults, modalResults, viewportPng });
    toast("success", "Report PDF generato");
  } catch (e) {
    toast("error", `Errore PDF: ${(e as Error).message}`);
  }
}

export function AvatarMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const themeMode = useThemeStore((s) => s.mode);
  const cycleTheme = useThemeStore((s) => s.cycle);

  if (!user) {
    return (
      <Tooltip content="Accedi o crea un account">
        <Button
          size="sm"
          variant="ghost"
          iconLeft={<LogIn className="h-3.5 w-3.5" />}
          onClick={() => window.dispatchEvent(new Event("feapro:open-auth"))}
          data-testid="topbar-login"
        >
          <span className="hidden md:inline">Accedi</span>
        </Button>
      </Tooltip>
    );
  }

  const ThemeIcon = THEME_ICON[themeMode];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-panel flex-shrink-0"
          aria-label="Menu utente"
          data-testid="topbar-avatar-menu"
        >
          <CollabAvatars />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="min-w-[240px] bg-bg-panel border border-border rounded-md shadow-pop z-50 overflow-hidden animate-fade-in"
        >
          <div className="px-3 py-2 border-b border-border">
            <div className="text-[11px] text-ink-muted">Connesso come</div>
            <div className="font-semibold text-sm truncate">{user.email}</div>
          </div>

          <div className="py-1">
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); enterFocusMode(); }}
              className={ITEM_CLS}
            >
              <Eye className="w-3.5 h-3.5 text-ink-muted" />
              Modalità focus
              <kbd className="ml-auto text-[10px] text-ink-dim font-mono">⇧ Space</kbd>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => window.dispatchEvent(new Event("feapro:open-account"))}
              className={ITEM_CLS}
            >
              <User className="w-3.5 h-3.5 text-ink-muted" />
              Account &amp; quota
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => window.dispatchEvent(new Event("feapro:open-location"))}
              className={ITEM_CLS}
            >
              <MapPin className="w-3.5 h-3.5 text-ink-muted" />
              Loads location
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); cycleTheme(); }}
              className={ITEM_CLS}
            >
              <ThemeIcon className="w-3.5 h-3.5 text-ink-muted" />
              Tema: <span className="font-mono text-[11px] text-ink-muted ml-auto">{THEME_LABEL[themeMode]}</span>
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="h-px bg-border" />

          <div className="py-1">
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); doExportJson(); }}
              className={ITEM_CLS}
            >
              <FileJson className="w-3.5 h-3.5 text-ink-muted" />
              Esporta JSON
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); doExportCsv(); }}
              className={ITEM_CLS}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-ink-muted" />
              Esporta CSV
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); doExportPdf(); }}
              className={ITEM_CLS}
            >
              <FileText className="w-3.5 h-3.5 text-ink-muted" />
              Esporta report PDF
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="h-px bg-border" />

          <div className="py-1">
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); useUIStore.getState().setOpenDialog("help"); }}
              className={ITEM_CLS}
            >
              <HelpCircle className="w-3.5 h-3.5 text-ink-muted" />
              Aiuto e shortcut
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => {
                logout();
                toast("info", "Disconnesso.");
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-bg-hover focus:bg-bg-hover focus:outline-none cursor-pointer"
              data-testid="topbar-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
