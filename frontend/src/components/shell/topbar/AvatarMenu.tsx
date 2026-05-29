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
  User, MapPin, LogOut, Sun, Moon, Monitor,
  Eye, FileJson, FileSpreadsheet, FileText, HelpCircle,
  Settings as SettingsIcon, Compass,
  // v3.4 Fetta E2-IA Commit E2.1: 3 voci IA prototipo v3 (Cronologia/Template/Docs).
  History, LayoutTemplate, BookOpen,
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
import { toastApiError } from "../../../lib/apiErrors";
import { Tooltip } from "../../ui/Tooltip";
import { CollabAvatars } from "./CollabAvatars";

const THEME_ICON = { light: Moon, dark: Monitor, system: Sun } as const;
const THEME_LABEL = { light: "Light", dark: "Dark", system: "System" } as const;

const ITEM_CLS =
  "flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-bg-hover focus:bg-bg-hover focus:outline-none cursor-pointer transition-colors";

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
    toastApiError(e, "Errore PDF");
  }
}

export function AvatarMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const themeMode = useThemeStore((s) => s.mode);
  const cycleTheme = useThemeStore((s) => s.cycle);
  // v3.1 Fase 2b/2f: navigate via window.location.assign (no router
  // dependency — il componente è importato sia in Shell custom che chrome
  // legacy, test isolati senza BrowserRouter). Full-page nav è ok per
  // /settings (route mockup-driven full-screen) e /percorsi/uc1 (idem).
  const goTo = (path: string) => { window.location.assign(path); };

  // v2.1.4 auth-gate: AvatarMenu è raggiungibile SOLO ad autenticazione
  // completata (l'AuthGate blocca App finché user è null). Difensivo: se
  // per qualunque race condition user fosse null qui, non mostriamo nulla
  // (era login button, ora dead-code).
  if (!user) {
    return null;
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
          className="min-w-[260px] bg-bg-elevated border border-border-light shadow-dialog z-50 overflow-hidden animate-slide-down"
        >
          <div className="px-3 py-2.5 border-b border-border bg-bg-panel">
            <div className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">Connesso come</div>
            <div className="font-semibold text-sm truncate text-ink mt-0.5">{user.email}</div>
          </div>

          <div className="py-1">
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); enterFocusMode(); }}
              className={ITEM_CLS}
            >
              <Eye className="w-3.5 h-3.5 text-ink-3" />
              Modalità focus
              <kbd className="ml-auto font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">⇧ Space</kbd>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => window.dispatchEvent(new Event("feapro:open-account"))}
              className={ITEM_CLS}
            >
              <User className="w-3.5 h-3.5 text-ink-3" />
              Account &amp; quota
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => window.dispatchEvent(new Event("feapro:open-location"))}
              className={ITEM_CLS}
            >
              <MapPin className="w-3.5 h-3.5 text-ink-3" />
              Loads location
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); cycleTheme(); }}
              className={ITEM_CLS}
            >
              <ThemeIcon className="w-3.5 h-3.5 text-ink-3" />
              Tema
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">{THEME_LABEL[themeMode]}</span>
            </DropdownMenu.Item>
            {/* v3.1 Fase 2f: Percorsi guidati raggiungibili dal workspace
                (prima solo da home Dashboard o URL manuale). */}
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); goTo("/percorsi/uc1"); }}
              className={ITEM_CLS}
              data-testid="avatar-menu-percorsi"
            >
              <Compass className="w-3.5 h-3.5 text-ink-3" />
              Percorsi guidati
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="h-px bg-border" />

          <div className="py-1">
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); doExportJson(); }}
              className={ITEM_CLS}
            >
              <FileJson className="w-3.5 h-3.5 text-ink-3" />
              Esporta JSON
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); doExportCsv(); }}
              className={ITEM_CLS}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-ink-3" />
              Esporta CSV
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); doExportPdf(); }}
              className={ITEM_CLS}
            >
              <FileText className="w-3.5 h-3.5 text-ink-3" />
              Esporta report PDF
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="h-px bg-border" />

          <div className="py-1">
            {/* v3.1 Fase 2b: link a /settings (8 tab Account/Profilo/Billing/
                Api Keys/Preferences/Units/Shortcuts/About). Prima accessibile
                solo via URL manuale. */}
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); goTo("/settings"); }}
              className={ITEM_CLS}
              data-testid="avatar-menu-settings"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-ink-3" />
              Impostazioni
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); useUIStore.getState().setOpenDialog("help"); }}
              className={ITEM_CLS}
            >
              <HelpCircle className="w-3.5 h-3.5 text-ink-3" />
              Aiuto e shortcut
            </DropdownMenu.Item>
          </div>

          {/* v3.4 Fetta E2-IA Commit E2.1: gruppo IA prototipo v3 (Cronologia
              / Template / Docs). Cronologia e Docs sono TODO E2.5 (no route),
              Template → /templates esistente (v2.7.2 Phase 4.3). Aggiunte in
              fondo (sopra Logout) per mantenere additività zero rimozioni —
              "Impostazioni" resta nel suo gruppo Settings/Help. */}
          <DropdownMenu.Separator className="h-px bg-border" />

          <div className="py-1">
            <DropdownMenu.Item
              // v3.4 Fetta E2.5d (29/05 sera): cablato a /cronologia
              // (PlaceholderPages). Era TODO E2.5 con toast "in arrivo".
              onSelect={(e) => { e.preventDefault(); goTo("/cronologia"); }}
              className={ITEM_CLS}
              data-testid="avatar-menu-cronologia"
            >
              <History className="w-3.5 h-3.5 text-ink-3" />
              Cronologia
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); goTo("/templates"); }}
              className={ITEM_CLS}
              data-testid="avatar-menu-template"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-ink-3" />
              Template
            </DropdownMenu.Item>
            <DropdownMenu.Item
              // v3.4 Fetta E2.5d (29/05 sera): cablato a /docs
              // (PlaceholderPages). Era TODO E2.5 con toast "in arrivo".
              onSelect={(e) => { e.preventDefault(); goTo("/docs"); }}
              className={ITEM_CLS}
              data-testid="avatar-menu-docs"
            >
              <BookOpen className="w-3.5 h-3.5 text-ink-3" />
              Docs
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="h-px bg-border" />

          <div className="py-1">
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
