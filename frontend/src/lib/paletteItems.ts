/**
 * Command palette items (alpha.21) — registry centralizzato.
 *
 * Asse G6 del piano v1.3 rev2: la palette deve indicizzare >= 180 voci
 * cosi' ogni funzione, impostazione, materiale, sezione, aiuto sia
 * raggiungibile in 2 keystroke (Ctrl+K + parola chiave).
 *
 * Struttura mockup v1.3: 6 sezioni
 *   1. Suggeriti (contesto attuale) — generati dinamicamente
 *   2. Comandi (azioni globali)
 *   3. Pannelli (workspace + rail sections)
 *   4. Impostazioni (theme, language, account)
 *   5. Modelli (recenti, da react-query)
 *   6. Aiuto e documentazione
 *
 * Ogni item ha:
 *  - id univoco
 *  - label (mostrato all'utente)
 *  - aliases (fuzzy matching: l'utente puo' trovare con sinonimi)
 *  - section, group (per heading)
 *  - shortcut opzionale
 *  - actionKind (rotta verso handler in CommandPalette.tsx)
 *  - payload opzionale (parametri per l'handler)
 */
import type { LucideIcon } from "lucide-react";
import {
  Boxes, Cpu, BarChart3, ShieldCheck, ArrowRightLeft,
  Plus, Copy, Pencil, Play, Layers, MousePointerClick,
  Eye, Wrench, History, MapPin, User, LogIn, LogOut,
  Sun, Moon, Monitor, Search, HelpCircle, Sparkles,
  FileDown, FileUp, FileText, GitCompareArrows, Ruler,
  Camera, FileBarChart, Trash2, RotateCcw, Settings,
  Activity, Globe, Mountain, Wind, Snowflake, Waves,
  Coins, Bell, Keyboard, Palette,
  Maximize, Minimize,
} from "lucide-react";

import type { Workspace } from "../store/workspaceStore";
import type { RightSection } from "../store/rightRailStore";
import type { ThemeMode } from "../store/themeStore";


/** Tipi di azione che la palette puo' eseguire. */
export type PaletteActionKind =
  | "workspace"      // payload: Workspace
  | "right-panel"    // payload: RightSection
  | "dialog"         // payload: DialogKind
  | "theme"          // payload: ThemeMode
  | "run-analysis"   // payload: "static" | "modal" | "dynamic"
  | "external-link"  // payload: { url: string }
  | "togglePalette"  // re-toggle
  | "openHelp"       // open HelpSheet
  | "openAccount"    // open AccountDialog
  | "openLocation"   // open LocationPickerDialog
  | "openAuth"       // open AuthDialog
  | "openExport"     // open ExportMenu (workspace io)
  | "logout"         // auth logout
  | "focus-toggle"   // v1.5 Task 33: toggle modalita' focus (Shift+Space / F)
  | "open-import-wizard"; // v1.5 Task 29: apre ImportWizard 4-step (payload?: { source })


/** Sezione (gruppo) di appartenenza. */
export type PaletteSection =
  | "commands"        // Azioni globali
  | "panels"          // Workspace + RightRail
  | "settings"        // Theme, account, accelerator
  | "loads"           // Climate loads / location
  | "help"            // Doc + AI
  | "favorites";      // Suggeriti contesto-aware (riservato a runtime)


export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  /** Alias per fuzzy match (sinonimi che l'utente puo' digitare). */
  aliases?: string[];
  section: PaletteSection;
  /** Sotto-gruppo opzionale (heading visualizzato). */
  group?: string;
  icon?: LucideIcon;
  shortcut?: string;
  actionKind: PaletteActionKind;
  payload?: unknown;
  /** Se true: item disabilitato se non c'e' un modello caricato. */
  needsModel?: boolean;
  /** Se true: la voce e' in "soon" / placeholder. */
  soon?: boolean;
}


// ── 1) PANELS — Workspace + RightRail ──────────────────────────────────────
const PANELS: PaletteItem[] = [
  // Workspace (LeftRail 6-rail)
  { id: "ws-make",    label: "Vai a · Make",    description: "Geometria · mesh · carichi · vincoli", aliases: ["modello", "geometry", "geometria"], section: "panels", group: "Workspace", icon: Boxes,        shortcut: "1", actionKind: "workspace", payload: "model" },
  { id: "ws-solve",   label: "Vai a · Solve",   description: "Statica · modale · dinamica · sismica · pushover", aliases: ["analisi", "calcola", "run"], section: "panels", group: "Workspace", icon: Cpu,           shortcut: "2", actionKind: "workspace", payload: "analysis" },
  { id: "ws-verify",  label: "Vai a · Verify",  description: "EC2/3/5/8 · NTC · fatica", aliases: ["verifiche", "ec3", "ec8"], section: "panels", group: "Workspace", icon: ShieldCheck, shortcut: "3", actionKind: "workspace", payload: "verify" },
  { id: "ws-results", label: "Vai a · Risultati (legacy)", description: "Deprecato: usa Inspect del rail destro", aliases: ["results"], section: "panels", group: "Workspace", icon: BarChart3, shortcut: "4", actionKind: "workspace", payload: "results" },
  { id: "ws-io",      label: "Vai a · I/O (legacy)", description: "Deprecato: usa Tools", aliases: ["import", "export", "collab"], section: "panels", group: "Workspace", icon: ArrowRightLeft, shortcut: "5", actionKind: "workspace", payload: "io" },

  // RightRail sections
  { id: "rp-inspect", label: "Pannello · Inspect (risultati)", aliases: ["risultati"], section: "panels", group: "Rail destro", icon: Eye,    actionKind: "right-panel", payload: "inspect" },
  { id: "rp-view",    label: "Pannello · View (overlay)", aliases: ["layer", "deformata", "stress"], section: "panels", group: "Rail destro", icon: Layers,  actionKind: "right-panel", payload: "view" },
  { id: "rp-tools",   label: "Pannello · Tools (strumenti)", aliases: ["compare", "snapshot", "misure"], section: "panels", group: "Rail destro", icon: Wrench,  actionKind: "right-panel", payload: "tools" },
  { id: "rp-history", label: "Pannello · History (snapshot)", aliases: ["timeline", "undo"], section: "panels", group: "Rail destro", icon: History, actionKind: "right-panel", payload: "history" },
];


// ── 2) COMMANDS — Azioni globali ───────────────────────────────────────────
const COMMANDS: PaletteItem[] = [
  // Modeling
  { id: "new-model",        label: "Crea nuovo modello", aliases: ["new", "nuovo"], section: "commands", group: "Modeling", icon: Plus,    actionKind: "dialog", payload: "new" },
  { id: "open-mesh-wizard", label: "Apri wizard mesh",   aliases: ["mesh", "wizard"], section: "commands", group: "Modeling", icon: Layers, actionKind: "dialog", payload: "mesh", needsModel: true },
  { id: "add-node",         label: "Aggiungi nodo",      aliases: ["nodo", "node", "N"], section: "commands", group: "Modeling", icon: MousePointerClick, shortcut: "N", actionKind: "dialog", payload: "node", needsModel: true },
  { id: "add-element",      label: "Aggiungi elemento",  aliases: ["element", "beam", "shell", "E"], section: "commands", group: "Modeling", icon: Boxes, shortcut: "E", actionKind: "dialog", payload: "element", needsModel: true },
  { id: "add-load",         label: "Aggiungi carico",    aliases: ["load", "forza", "L"], section: "commands", group: "Modeling", icon: ArrowRightLeft, shortcut: "L", actionKind: "dialog", payload: "load", needsModel: true },
  { id: "add-constraint",   label: "Aggiungi vincolo",   aliases: ["constraint", "support", "C"], section: "commands", group: "Modeling", icon: ShieldCheck, shortcut: "C", actionKind: "dialog", payload: "constraint", needsModel: true },

  // Solve
  { id: "run-static",       label: "Esegui · Statica lineare", aliases: ["F5", "esegui", "calcola"], section: "commands", group: "Analisi", icon: Play, shortcut: "F5", actionKind: "run-analysis", payload: "static", needsModel: true },
  { id: "run-modal",        label: "Esegui · Modale (autovalori)", aliases: ["frequenze", "mode"], section: "commands", group: "Analisi", icon: Play, actionKind: "run-analysis", payload: "modal", needsModel: true },
  { id: "run-dynamic",      label: "Esegui · Dinamica Newmark", aliases: ["time-history", "th"], section: "commands", group: "Analisi", icon: Play, actionKind: "run-analysis", payload: "dynamic", needsModel: true },

  // Climate Loads (Sprint 2)
  { id: "open-location",    label: "Apri Location picker (vento/neve/sismica)", aliases: ["loads", "climate", "coord"], section: "commands", group: "Climate Loads", icon: MapPin, actionKind: "openLocation", needsModel: false },
  { id: "open-export",      label: "Apri menu export (DXF · IFC · XLSX · PDF)", aliases: ["esporta"], section: "commands", group: "I/O", icon: FileDown, actionKind: "openExport" },

  // Vista / Focus mode (v1.5 Task 33)
  { id: "focus-enter", label: "Modalità focus (solo modello)", description: "Nascondi tutto tranne il viewport", aliases: ["focus", "fullscreen", "concentra", "nascondi", "schermo intero"], section: "commands", group: "Vista", icon: Maximize, shortcut: "F", actionKind: "focus-toggle" },
  { id: "focus-exit",  label: "Esci da modalità focus", aliases: ["esci focus", "ripristina shell", "torna", "esc"], section: "commands", group: "Vista", icon: Minimize, shortcut: "Esc", actionKind: "focus-toggle" },

  // Import wizard (v1.5 Task 29) — 4 voci con source pre-selezionata
  { id: "open-wizard-import",     label: "Apri wizard import",        aliases: ["import", "wizard", "carica"], section: "commands", group: "Wizard", icon: FileUp, actionKind: "open-import-wizard" },
  { id: "open-wizard-import-dxf", label: "Importa file DXF (wizard)", aliases: ["dxf", "import dxf", "cad"], section: "commands", group: "Wizard", icon: FileUp, actionKind: "open-import-wizard", payload: { source: "dxf" } },
  { id: "open-wizard-import-ifc", label: "Importa file IFC (wizard)", aliases: ["ifc", "import ifc", "bim"], section: "commands", group: "Wizard", icon: FileUp, actionKind: "open-import-wizard", payload: { source: "ifc" } },
  { id: "open-wizard-import-json",label: "Importa JSON nativo (wizard)", aliases: ["json", "import json", "feapro"], section: "commands", group: "Wizard", icon: FileUp, actionKind: "open-import-wizard", payload: { source: "json" } },
];


// ── 3) SETTINGS — Theme, lang, account ─────────────────────────────────────
const SETTINGS: PaletteItem[] = [
  // Theme
  { id: "theme-dark",   label: "Theme · Dark",   aliases: ["scuro", "dark mode"], section: "settings", group: "Aspetto", icon: Moon,    actionKind: "theme", payload: "dark" },
  { id: "theme-light",  label: "Theme · Light",  aliases: ["chiaro", "light mode"], section: "settings", group: "Aspetto", icon: Sun,    actionKind: "theme", payload: "light" },
  { id: "theme-system", label: "Theme · System (OS)", aliases: ["automatico"], section: "settings", group: "Aspetto", icon: Monitor,  actionKind: "theme", payload: "system" },

  // Account
  { id: "open-account", label: "Apri account · Usage + Tier + Admin", aliases: ["billing", "quota", "credits"], section: "settings", group: "Account", icon: User, actionKind: "openAccount" },
  { id: "open-auth",    label: "Login / Crea account", aliases: ["accedi", "register", "signin"], section: "settings", group: "Account", icon: LogIn, actionKind: "openAuth" },
  { id: "logout",       label: "Logout (disconnetti)", aliases: ["esci"], section: "settings", group: "Account", icon: LogOut, actionKind: "logout" },

  // Misc settings (placeholder Sprint 5)
  { id: "open-shortcuts", label: "Mostra cheat-sheet shortcut",   aliases: ["?", "scorciatoie"], section: "settings", group: "Tastiera", icon: Keyboard, actionKind: "dialog", payload: "help" },
];


// ── 4) LOADS — Climate Loads quick actions (Sprint 2 preset) ───────────────
// 5 preset Italia + reset + valori comuni come scorciatoie palette.
const LOADS: PaletteItem[] = [
  // Preset Italia
  { id: "loc-roma",     label: "Location · Roma centro",        aliases: ["italia", "centro"], section: "loads", group: "Preset Italia", icon: MapPin, actionKind: "openLocation" },
  { id: "loc-milano",   label: "Location · Milano Duomo",       aliases: ["nord"], section: "loads", group: "Preset Italia", icon: MapPin, actionKind: "openLocation" },
  { id: "loc-laquila",  label: "Location · L'Aquila (sismica alta)", aliases: ["abruzzo", "sismica"], section: "loads", group: "Preset Italia", icon: MapPin, actionKind: "openLocation" },
  { id: "loc-cagliari", label: "Location · Cagliari (vento alto)",   aliases: ["sardegna"], section: "loads", group: "Preset Italia", icon: MapPin, actionKind: "openLocation" },
  { id: "loc-cortina",  label: "Location · Cortina (neve estrema)",  aliases: ["dolomiti"], section: "loads", group: "Preset Italia", icon: MapPin, actionKind: "openLocation" },

  // Loads concept shortcuts (educational)
  { id: "concept-wind",     label: "Apri picker per Vento (EN 1991-1-4)",  aliases: ["wind", "qp"], section: "loads", group: "Concetti", icon: Wind, actionKind: "openLocation" },
  { id: "concept-snow",     label: "Apri picker per Neve (EN 1991-1-3)",   aliases: ["snow", "sd"], section: "loads", group: "Concetti", icon: Snowflake, actionKind: "openLocation" },
  { id: "concept-seismic",  label: "Apri picker per Sismica (NTC 2018)",   aliases: ["earthquake", "ag"], section: "loads", group: "Concetti", icon: Waves, actionKind: "openLocation" },
  { id: "concept-elevation", label: "Apri picker per Altimetria (DEM 90m)", aliases: ["dem", "z"], section: "loads", group: "Concetti", icon: Mountain, actionKind: "openLocation" },
];


// ── 5) HELP — Documentazione e AI ──────────────────────────────────────────
const HELP: PaletteItem[] = [
  { id: "help-overview",    label: "Documentazione · Overview workspace",            aliases: ["docs", "tutorial"], section: "help", group: "Documentazione", icon: HelpCircle, actionKind: "openHelp" },
  { id: "help-shortcuts",   label: "Documentazione · Tutte le shortcut", aliases: ["scorciatoie", "tastiera"], section: "help", group: "Documentazione", icon: Keyboard, actionKind: "dialog", payload: "help" },
  { id: "help-validation",  label: "Apri report di validazione NAFEMS",  aliases: ["benchmark", "verifica"], section: "help", group: "Documentazione", icon: FileText, actionKind: "external-link", payload: { url: "/api/validation/report" } },
  { id: "help-ai-copilot",  label: "AI Copilot · Debug FEM (Sprint 5)",  aliases: ["ai", "copilot", "gemini"], section: "help", group: "AI", icon: Sparkles, actionKind: "togglePalette", soon: true },
  { id: "help-api-docs",    label: "Apri OpenAPI docs (Swagger)",        aliases: ["api", "swagger"], section: "help", group: "Sviluppatore", icon: Globe, actionKind: "external-link", payload: { url: "/docs" } },
];


// ── Concatena tutto ────────────────────────────────────────────────────────
export const PALETTE_ITEMS: PaletteItem[] = [
  ...PANELS,
  ...COMMANDS,
  ...SETTINGS,
  ...LOADS,
  ...HELP,
];


/** Label umano della sezione (per heading nella UI). */
export const SECTION_LABELS: Record<PaletteSection, string> = {
  favorites: "⭐ Suggeriti",
  panels:    "🗂 Pannelli",
  commands:  "⚡ Comandi",
  settings:  "⚙️ Impostazioni",
  loads:     "📍 Climate Loads",
  help:      "📚 Aiuto",
};


/** Ordine di visualizzazione delle sezioni. */
export const SECTION_ORDER: PaletteSection[] = [
  "favorites", "commands", "panels", "loads", "settings", "help",
];


/** Conteggio rapido per debug / docs. */
export const PALETTE_COUNT = {
  total:    PALETTE_ITEMS.length,
  panels:   PANELS.length,
  commands: COMMANDS.length,
  settings: SETTINGS.length,
  loads:    LOADS.length,
  help:     HELP.length,
};
