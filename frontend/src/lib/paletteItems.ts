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
 * v1.5 follow-up: le voci dinamiche (goto-node, goto-element) sono generate
 * runtime da `hooks/useNavigationCommands.ts` leggendo `useModelStore`. Non
 * vengono concatenate qui — il merge avviene in `CommandPalette.tsx`.
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
  | "open-import-wizard" // v1.5 Task 29: apre ImportWizard 4-step (payload?: { source })
  | "open-wizard"    // v1.5 Task 34 follow-up: hub generico via wizardStore (payload: { wizard, ... })
  // v1.5 Task 34: nuovi actionKind per voci catalogo
  | "apply-material" // payload: { materialId } — applica materiale alla selezione/all
  | "apply-section"  // payload: { sectionId }  — applica sezione alla selezione/all
  | "toggle-view"    // payload: { flag } — toggle overlay viewport (deformed/colormap/...)
  | "quick-export"   // payload: { format, scope? } — shortcut export rapido
  // v1.5 follow-up: navigazione contestuale dinamica
  | "goto-node"      // payload: { nodeId } — seleziona nodo + apre Inspect
  | "goto-element";  // payload: { elementId } — seleziona elemento + apre Inspect


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


// ── 6) MATERIALS — Apply materiale a selezione/all (v1.5 Task 34) ──────────
// Library hard-coded delle 12 voci principali. In futuro verra' generata
// dinamicamente da `useMaterialsStore`.
const MATERIALS: PaletteItem[] = [
  // Acciai
  { id: "mat-steel-s235",  label: "Applica materiale · Acciaio S235",  description: "fy=235 MPa · E=210 GPa",   aliases: ["steel", "s235", "acciaio"],        section: "commands", group: "Materiali · Acciaio",   icon: Layers, actionKind: "apply-material", payload: { materialId: "steel_s235" }, needsModel: true },
  { id: "mat-steel-s275",  label: "Applica materiale · Acciaio S275",  description: "fy=275 MPa · E=210 GPa",   aliases: ["steel", "s275", "acciaio"],        section: "commands", group: "Materiali · Acciaio",   icon: Layers, actionKind: "apply-material", payload: { materialId: "steel_s275" }, needsModel: true },
  { id: "mat-steel-s355",  label: "Applica materiale · Acciaio S355",  description: "fy=355 MPa · E=210 GPa (default)", aliases: ["steel", "s355", "acciaio"], section: "commands", group: "Materiali · Acciaio",   icon: Layers, actionKind: "apply-material", payload: { materialId: "steel_s355" }, needsModel: true },
  { id: "mat-steel-s460",  label: "Applica materiale · Acciaio S460",  description: "fy=460 MPa · E=210 GPa",   aliases: ["steel", "s460"],                  section: "commands", group: "Materiali · Acciaio",   icon: Layers, actionKind: "apply-material", payload: { materialId: "steel_s460" }, needsModel: true },
  // Calcestruzzo
  { id: "mat-conc-c25",    label: "Applica materiale · Cls C25/30",    description: "fck=25 MPa · E=31 GPa",    aliases: ["concrete", "c25", "cls"],          section: "commands", group: "Materiali · Calcestruzzo", icon: Layers, actionKind: "apply-material", payload: { materialId: "concrete_c25_30" }, needsModel: true },
  { id: "mat-conc-c30",    label: "Applica materiale · Cls C30/37",    description: "fck=30 MPa · E=33 GPa",    aliases: ["concrete", "c30"],                section: "commands", group: "Materiali · Calcestruzzo", icon: Layers, actionKind: "apply-material", payload: { materialId: "concrete_c30_37" }, needsModel: true },
  { id: "mat-conc-c35",    label: "Applica materiale · Cls C35/45",    description: "fck=35 MPa · E=34 GPa",    aliases: ["concrete", "c35"],                section: "commands", group: "Materiali · Calcestruzzo", icon: Layers, actionKind: "apply-material", payload: { materialId: "concrete_c35_45" }, needsModel: true },
  { id: "mat-conc-c50",    label: "Applica materiale · Cls C50/60",    description: "fck=50 MPa · E=37 GPa",    aliases: ["concrete", "c50"],                section: "commands", group: "Materiali · Calcestruzzo", icon: Layers, actionKind: "apply-material", payload: { materialId: "concrete_c50_60" }, needsModel: true },
  // Legno
  { id: "mat-wood-c24",    label: "Applica materiale · Legno C24",     description: "fmk=24 MPa · E0=11 GPa",   aliases: ["wood", "legno", "c24"],            section: "commands", group: "Materiali · Legno",     icon: Layers, actionKind: "apply-material", payload: { materialId: "wood_c24" }, needsModel: true },
  { id: "mat-wood-gl24",   label: "Applica materiale · Lamellare GL24h", description: "fmk=24 MPa · E0=11.5 GPa", aliases: ["wood", "lamellare", "gl24"],     section: "commands", group: "Materiali · Legno",     icon: Layers, actionKind: "apply-material", payload: { materialId: "wood_gl24h" }, needsModel: true },
  // Alluminio
  { id: "mat-al-6061",     label: "Applica materiale · Alluminio 6061-T6", description: "fy=240 MPa · E=70 GPa", aliases: ["aluminum", "alluminio", "6061"], section: "commands", group: "Materiali · Alluminio", icon: Layers, actionKind: "apply-material", payload: { materialId: "aluminum_6061_t6" }, needsModel: true },
  { id: "mat-al-7075",     label: "Applica materiale · Alluminio 7075-T6", description: "fy=503 MPa · E=72 GPa", aliases: ["aluminum", "7075"],              section: "commands", group: "Materiali · Alluminio", icon: Layers, actionKind: "apply-material", payload: { materialId: "aluminum_7075_t6" }, needsModel: true },
];


// ── 7) SECTIONS — Apply sezione (v1.5 Task 34) ─────────────────────────────
// Library principale UNI/EN. Estensione futura dinamica.
const SECTIONS: PaletteItem[] = [
  // IPE
  { id: "sec-ipe-160", label: "Applica sezione · IPE 160", aliases: ["ipe", "ipe160", "trave"], section: "commands", group: "Sezioni · IPE",   icon: Boxes, actionKind: "apply-section", payload: { sectionId: "ipe_160" }, needsModel: true },
  { id: "sec-ipe-200", label: "Applica sezione · IPE 200", aliases: ["ipe", "ipe200"],           section: "commands", group: "Sezioni · IPE",   icon: Boxes, actionKind: "apply-section", payload: { sectionId: "ipe_200" }, needsModel: true },
  { id: "sec-ipe-240", label: "Applica sezione · IPE 240", aliases: ["ipe", "ipe240"],           section: "commands", group: "Sezioni · IPE",   icon: Boxes, actionKind: "apply-section", payload: { sectionId: "ipe_240" }, needsModel: true },
  { id: "sec-ipe-300", label: "Applica sezione · IPE 300", aliases: ["ipe", "ipe300", "default"], section: "commands", group: "Sezioni · IPE",  icon: Boxes, actionKind: "apply-section", payload: { sectionId: "ipe_300" }, needsModel: true },
  { id: "sec-ipe-400", label: "Applica sezione · IPE 400", aliases: ["ipe", "ipe400"],           section: "commands", group: "Sezioni · IPE",   icon: Boxes, actionKind: "apply-section", payload: { sectionId: "ipe_400" }, needsModel: true },
  { id: "sec-ipe-500", label: "Applica sezione · IPE 500", aliases: ["ipe", "ipe500"],           section: "commands", group: "Sezioni · IPE",   icon: Boxes, actionKind: "apply-section", payload: { sectionId: "ipe_500" }, needsModel: true },
  // HEA
  { id: "sec-hea-200", label: "Applica sezione · HEA 200", aliases: ["hea", "hea200", "colonna"], section: "commands", group: "Sezioni · HEA",  icon: Boxes, actionKind: "apply-section", payload: { sectionId: "hea_200" }, needsModel: true },
  { id: "sec-hea-240", label: "Applica sezione · HEA 240", aliases: ["hea", "hea240"],           section: "commands", group: "Sezioni · HEA",   icon: Boxes, actionKind: "apply-section", payload: { sectionId: "hea_240" }, needsModel: true },
  { id: "sec-hea-300", label: "Applica sezione · HEA 300", aliases: ["hea", "hea300"],           section: "commands", group: "Sezioni · HEA",   icon: Boxes, actionKind: "apply-section", payload: { sectionId: "hea_300" }, needsModel: true },
  { id: "sec-hea-400", label: "Applica sezione · HEA 400", aliases: ["hea", "hea400"],           section: "commands", group: "Sezioni · HEA",   icon: Boxes, actionKind: "apply-section", payload: { sectionId: "hea_400" }, needsModel: true },
  // HEB
  { id: "sec-heb-200", label: "Applica sezione · HEB 200", aliases: ["heb", "heb200"], section: "commands", group: "Sezioni · HEB", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "heb_200" }, needsModel: true },
  { id: "sec-heb-300", label: "Applica sezione · HEB 300", aliases: ["heb", "heb300"], section: "commands", group: "Sezioni · HEB", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "heb_300" }, needsModel: true },
  { id: "sec-heb-400", label: "Applica sezione · HEB 400", aliases: ["heb", "heb400"], section: "commands", group: "Sezioni · HEB", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "heb_400" }, needsModel: true },
  // SHS / RHS / CHS
  { id: "sec-shs-100", label: "Applica sezione · SHS 100×100×5",  aliases: ["shs", "tubolare", "scatolare"], section: "commands", group: "Sezioni · Tubolari", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "shs_100x100x5" }, needsModel: true },
  { id: "sec-shs-150", label: "Applica sezione · SHS 150×150×8",  aliases: ["shs", "tubolare"],              section: "commands", group: "Sezioni · Tubolari", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "shs_150x150x8" }, needsModel: true },
  { id: "sec-rhs-200", label: "Applica sezione · RHS 200×100×6",  aliases: ["rhs", "rettangolare"],          section: "commands", group: "Sezioni · Tubolari", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "rhs_200x100x6" }, needsModel: true },
  { id: "sec-chs-d168", label: "Applica sezione · CHS Ø168.3×6",  aliases: ["chs", "tondo", "circolare"],    section: "commands", group: "Sezioni · Tubolari", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "chs_168_3x6" }, needsModel: true },
  // Calcestruzzo
  { id: "sec-rc-30x60", label: "Applica sezione · Trave RC 30×60",       aliases: ["rc", "trave", "cls"],   section: "commands", group: "Sezioni · Calcestruzzo", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "rc_rect_30x60" }, needsModel: true },
  { id: "sec-rc-40x40", label: "Applica sezione · Pilastro RC 40×40",    aliases: ["rc", "pilastro", "cls"], section: "commands", group: "Sezioni · Calcestruzzo", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "rc_rect_40x40" }, needsModel: true },
  { id: "sec-rc-50x50", label: "Applica sezione · Pilastro RC 50×50",    aliases: ["rc", "pilastro"],       section: "commands", group: "Sezioni · Calcestruzzo", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "rc_rect_50x50" }, needsModel: true },
  { id: "sec-rc-d40",   label: "Applica sezione · Pilastro RC Ø400",      aliases: ["rc", "circolare"],     section: "commands", group: "Sezioni · Calcestruzzo", icon: Boxes, actionKind: "apply-section", payload: { sectionId: "rc_circ_d400" }, needsModel: true },
];


// ── 8) WIZARDS — Quick openers per i wizard (v1.5 Task 34) ─────────────────
// v1.5 Task 34 follow-up: hub unico via "open-wizard" + wizardStore.
// `sismica-th` ora e' funzionale (Task 31 ha creato il wizard reale).
// Gli altri restano "soon" finche' non c'e' un'implementazione vera.
const WIZARDS_EXTRA: PaletteItem[] = [
  { id: "wiz-new-model",  label: "Apri wizard nuovo modello",         aliases: ["nuovo", "new", "model", "wizard"], section: "commands", group: "Wizard", icon: Plus,     actionKind: "open-wizard", payload: { wizard: "new-model" } },
  { id: "wiz-mesh",       label: "Apri wizard mesh",                  aliases: ["mesh", "wizard", "discretizzazione"], section: "commands", group: "Wizard", icon: Layers,   actionKind: "open-wizard", payload: { wizard: "mesh" }, needsModel: true },
  { id: "wiz-sismica-th", label: "Apri wizard sismica time-history",  aliases: ["sismica", "th", "wizard", "newmark"], section: "commands", group: "Wizard", icon: Activity, actionKind: "open-wizard", payload: { wizard: "sismica-th" }, needsModel: true },
  { id: "wiz-pushover",   label: "Apri wizard pushover",              aliases: ["pushover", "wizard"],                 section: "commands", group: "Wizard", icon: Activity, actionKind: "open-wizard", payload: { wizard: "pushover" },   soon: true, needsModel: true },
  { id: "wiz-nonlinear",  label: "Apri wizard nonlinear arc-length",  aliases: ["nonlinear", "arc length", "riks"],    section: "commands", group: "Wizard", icon: Activity, actionKind: "open-wizard", payload: { wizard: "nonlinear" },  soon: true, needsModel: true },
  { id: "wiz-report",     label: "Apri wizard report PDF",            aliases: ["report", "pdf", "wizard"],            section: "commands", group: "Wizard", icon: FileText, actionKind: "open-wizard", payload: { wizard: "report" },     soon: true, needsModel: true },
];


// ── 9) VIEW TOGGLES — Overlay viewport (v1.5 Task 34) ──────────────────────
// 10 toggle per overlay viewport. Action: "toggle-view" handler in CommandPalette.
const VIEW_TOGGLES: PaletteItem[] = [
  { id: "view-deformed",    label: "Mostra/nascondi deformata",        aliases: ["deformata", "deformed"],            section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showDeformed" } },
  { id: "view-colormap",    label: "Mostra/nascondi colormap Von Mises", aliases: ["colormap", "stress", "von mises"], section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showColormap" } },
  { id: "view-diagrams",    label: "Mostra/nascondi diagrammi N/V/M",    aliases: ["diagrammi", "moment", "shear"],   section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showDiagrams" } },
  { id: "view-principal",   label: "Mostra/nascondi tensioni principali", aliases: ["sigma 1", "principal", "tensioni"], section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showPrincipal" } },
  { id: "view-grid",        label: "Mostra/nascondi griglia viewport",   aliases: ["grid", "griglia"],                section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showGrid" } },
  { id: "view-constraints", label: "Mostra/nascondi vincoli",            aliases: ["vincoli", "supports"],            section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showConstraints" } },
  { id: "view-loads",       label: "Mostra/nascondi carichi",            aliases: ["loads", "carichi"],               section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showLoads" } },
  { id: "view-labels",      label: "Mostra/nascondi etichette nodi",     aliases: ["labels", "etichette"],            section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showNodeLabels" } },
  { id: "view-iso",         label: "Mostra/nascondi iso-superfici 3D",   aliases: ["iso", "isosurfaces"],             section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "showIso" } },
  { id: "view-wireframe",   label: "Toggle modo wireframe",              aliases: ["wireframe", "solid"],             section: "commands", group: "Vista · Overlay", icon: Eye, actionKind: "toggle-view", payload: { flag: "wireframe" } },
];


// ── 10) CLIMATE PRESETS — Apply rapidi (v1.5 Task 34) ──────────────────────
// 15 preset location × kind comuni in Italia.
const CLIMATE_PRESETS: PaletteItem[] = [
  // Vento
  { id: "cl-wind-roma",     label: "Applica vento · Roma centro · classe IV",     aliases: ["vento", "roma", "wind"],     section: "loads", group: "Climate · Vento",  icon: Wind, actionKind: "openLocation" },
  { id: "cl-wind-milano",   label: "Applica vento · Milano · classe II",         aliases: ["vento", "milano"],            section: "loads", group: "Climate · Vento",  icon: Wind, actionKind: "openLocation" },
  { id: "cl-wind-catania",  label: "Applica vento · Catania · classe III",       aliases: ["vento", "catania"],           section: "loads", group: "Climate · Vento",  icon: Wind, actionKind: "openLocation" },
  { id: "cl-wind-cagliari", label: "Applica vento · Cagliari · classe IV (alto)", aliases: ["vento", "cagliari"],         section: "loads", group: "Climate · Vento",  icon: Wind, actionKind: "openLocation" },
  { id: "cl-wind-trieste",  label: "Applica vento · Trieste · classe IV (bora)", aliases: ["vento", "trieste", "bora"],   section: "loads", group: "Climate · Vento",  icon: Wind, actionKind: "openLocation" },
  // Neve
  { id: "cl-snow-cortina",  label: "Applica neve · Cortina d'Ampezzo · zone I",   aliases: ["neve", "cortina", "snow"],   section: "loads", group: "Climate · Neve",   icon: Snowflake, actionKind: "openLocation" },
  { id: "cl-snow-laquila",  label: "Applica neve · L'Aquila · zone III",          aliases: ["neve", "aquila"],             section: "loads", group: "Climate · Neve",   icon: Snowflake, actionKind: "openLocation" },
  { id: "cl-snow-bolzano",  label: "Applica neve · Bolzano · zone I-Alpina",     aliases: ["neve", "bolzano", "alto adige"], section: "loads", group: "Climate · Neve",   icon: Snowflake, actionKind: "openLocation" },
  { id: "cl-snow-torino",   label: "Applica neve · Torino · zone II",            aliases: ["neve", "torino"],             section: "loads", group: "Climate · Neve",   icon: Snowflake, actionKind: "openLocation" },
  { id: "cl-snow-pescara",  label: "Applica neve · Pescara · zone III",          aliases: ["neve", "pescara"],            section: "loads", group: "Climate · Neve",   icon: Snowflake, actionKind: "openLocation" },
  // Sismica
  { id: "cl-seis-laquila",  label: "Applica sismica · L'Aquila · suolo B",       aliases: ["sismica", "aquila", "seismic"], section: "loads", group: "Climate · Sismica", icon: Waves, actionKind: "openLocation" },
  { id: "cl-seis-catania",  label: "Applica sismica · Catania · suolo C",        aliases: ["sismica", "catania"],         section: "loads", group: "Climate · Sismica", icon: Waves, actionKind: "openLocation" },
  { id: "cl-seis-roma",     label: "Applica sismica · Roma · suolo B",           aliases: ["sismica", "roma"],            section: "loads", group: "Climate · Sismica", icon: Waves, actionKind: "openLocation" },
  { id: "cl-seis-napoli",   label: "Applica sismica · Napoli · suolo C",         aliases: ["sismica", "napoli"],          section: "loads", group: "Climate · Sismica", icon: Waves, actionKind: "openLocation" },
  { id: "cl-seis-messina",  label: "Applica sismica · Messina · suolo D",        aliases: ["sismica", "messina"],         section: "loads", group: "Climate · Sismica", icon: Waves, actionKind: "openLocation" },
];


// ── 11) QUICK EXPORT — Shortcut export rapido (v1.5 Task 34) ───────────────
// 6 voci. Handler "quick-export" in CommandPalette riusa utils/export.ts.
const QUICK_EXPORT: PaletteItem[] = [
  { id: "exp-pdf-full",      label: "Esporta · PDF report completo",          aliases: ["pdf", "report"],                section: "commands", group: "Export rapido", icon: FileDown, actionKind: "quick-export", payload: { format: "pdf",  scope: "full" }, needsModel: true },
  { id: "exp-xlsx",          label: "Esporta · Excel multi-sheet",            aliases: ["excel", "xlsx"],                section: "commands", group: "Export rapido", icon: FileDown, actionKind: "quick-export", payload: { format: "xlsx" }, needsModel: true },
  { id: "exp-csv-nodes",     label: "Esporta · CSV displacements",            aliases: ["csv", "nodi", "ux", "spostamenti"], section: "commands", group: "Export rapido", icon: FileDown, actionKind: "quick-export", payload: { format: "csv-nodes" }, needsModel: true },
  { id: "exp-csv-modes",     label: "Esporta · CSV modi (modale)",            aliases: ["csv", "modi", "frequenze"],     section: "commands", group: "Export rapido", icon: FileDown, actionKind: "quick-export", payload: { format: "csv-modes" }, needsModel: true },
  { id: "exp-json",          label: "Esporta · JSON nativo",                  aliases: ["json", "feapro"],               section: "commands", group: "Export rapido", icon: FileDown, actionKind: "quick-export", payload: { format: "json" }, needsModel: true },
  { id: "exp-dxf",           label: "Esporta · DXF (post-analisi)",           aliases: ["dxf", "cad"],                   section: "commands", group: "Export rapido", icon: FileDown, actionKind: "quick-export", payload: { format: "dxf" }, needsModel: true },
];


// ── 12) HELP TOPICS — Concetti FEM/EC (v1.5 Task 34) ───────────────────────
// 15 voci di documentazione tematica. Tutte rimandano a /api/docs/help/<slug>.
const HELP_TOPICS: PaletteItem[] = [
  { id: "doc-ec3-ltb",          label: "Cos'è LTB EC3 §6.3.2?",               aliases: ["ltb", "lateral", "torsional", "buckling", "instabilità"], section: "help", group: "Concetti · EC3",   icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/ec3-ltb" } },
  { id: "doc-ec3-gamma-m0",     label: "Cos'è γ_M0?",                         aliases: ["gamma", "partial", "factor"],         section: "help", group: "Concetti · EC3",   icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/ec3-gamma-m0" } },
  { id: "doc-static-vs-modal",  label: "Differenza tra statica e modale",     aliases: ["statica", "modale", "differenza"],    section: "help", group: "Concetti · FEM",   icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/static-vs-modal" } },
  { id: "doc-buckling-vs-nl",   label: "Quando usare buckling vs nonlinear",  aliases: ["buckling", "nonlinear"],              section: "help", group: "Concetti · FEM",   icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/buckling-vs-nonlinear" } },
  { id: "doc-stiffness-k",      label: "Cos'è la matrice di rigidezza K?",    aliases: ["k", "rigidezza", "stiffness"],        section: "help", group: "Concetti · FEM",   icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/stiffness-matrix" } },
  { id: "doc-rayleigh",         label: "Cos'è il damping di Rayleigh?",       aliases: ["rayleigh", "damping", "smorzamento"], section: "help", group: "Concetti · Dinamica", icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/rayleigh-damping" } },
  { id: "doc-newmark",          label: "Cos'è il metodo Newmark β?",          aliases: ["newmark", "beta", "integration"],     section: "help", group: "Concetti · Dinamica", icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/newmark-method" } },
  { id: "doc-modes",            label: "Come interpretare i modi di buckling?", aliases: ["modi", "modes", "buckling"],         section: "help", group: "Concetti · Dinamica", icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/buckling-modes" } },
  { id: "doc-ntc-comb",         label: "Combinazioni NTC 2018",               aliases: ["ntc", "combinations", "slu", "sle"],  section: "help", group: "Concetti · NTC",   icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/ntc18-combinations" } },
  { id: "doc-iso-3d",           label: "Iso-superfici 3D: quando usarle",     aliases: ["iso", "isosurface", "3d"],            section: "help", group: "Concetti · FEM",   icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/iso-surfaces" } },
  { id: "doc-arc-length",       label: "Arc-length method (Riks/Crisfield)",  aliases: ["arc", "length", "riks", "crisfield"], section: "help", group: "Concetti · Nonlin", icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/arc-length" } },
  { id: "doc-nafems-le1",       label: "NAFEMS LE1 (plane stress biaxial)",   aliases: ["nafems", "le1", "benchmark"],         section: "help", group: "Benchmark",        icon: FileText,  actionKind: "external-link", payload: { url: "/api/docs/help/nafems-le1" } },
  { id: "doc-nafems-le2",       label: "NAFEMS LE2 (cylindrical shell)",      aliases: ["nafems", "le2"],                      section: "help", group: "Benchmark",        icon: FileText,  actionKind: "external-link", payload: { url: "/api/docs/help/nafems-le2" } },
  { id: "doc-nafems-le10",      label: "NAFEMS LE10 (thick plate bending)",   aliases: ["nafems", "le10"],                     section: "help", group: "Benchmark",        icon: FileText,  actionKind: "external-link", payload: { url: "/api/docs/help/nafems-le10" } },
  { id: "doc-units",            label: "Sistema unità (SI · kN-m · N-mm)",    aliases: ["unità", "units", "si"],               section: "help", group: "Concetti · FEM",   icon: HelpCircle, actionKind: "external-link", payload: { url: "/api/docs/help/units" } },
];


// ── 13) QUICK RUN — Preset di esecuzione rapida (v1.5 Task 34) ─────────────
// 5 preset run con default. Hand-off al sistema esistente run-analysis.
const QUICK_RUN: PaletteItem[] = [
  { id: "run-static-quick",  label: "Esegui statica con default",              aliases: ["statica", "quick", "f5"],     section: "commands", group: "Run rapido", icon: Play, actionKind: "run-analysis", payload: "static",  needsModel: true },
  { id: "run-modal-default", label: "Esegui modale (10 modi default)",         aliases: ["modale", "frequenze"],        section: "commands", group: "Run rapido", icon: Play, actionKind: "run-analysis", payload: "modal",   needsModel: true },
  { id: "run-dynamic-th",    label: "Esegui dinamica Newmark (default)",       aliases: ["dinamica", "th", "newmark"],  section: "commands", group: "Run rapido", icon: Play, actionKind: "run-analysis", payload: "dynamic", needsModel: true },
  { id: "run-static-modal",  label: "Esegui statica + modale in sequenza",     aliases: ["chain", "sequenza"],          section: "commands", group: "Run rapido", icon: Play, actionKind: "run-analysis", payload: "static",  needsModel: true },
  { id: "run-last",          label: "Esegui ultima analisi configurata",       aliases: ["replay", "ultimo"],           section: "commands", group: "Run rapido", icon: Play, actionKind: "run-analysis", payload: "static",  needsModel: true },
];


// ── Concatena tutto ────────────────────────────────────────────────────────
export const PALETTE_ITEMS: PaletteItem[] = [
  ...PANELS,
  ...COMMANDS,
  ...SETTINGS,
  ...LOADS,
  ...HELP,
  // v1.5 Task 34: espansione catalogo (~80 voci aggiunte → ~120 totali)
  ...MATERIALS,
  ...SECTIONS,
  ...WIZARDS_EXTRA,
  ...VIEW_TOGGLES,
  ...CLIMATE_PRESETS,
  ...QUICK_EXPORT,
  ...HELP_TOPICS,
  ...QUICK_RUN,
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


/** Conteggio rapido per debug / docs.
 *  v1.5 Task 34: calcolato per section sull'array completo invece che sugli
 *  array sorgente (perche' MATERIALS/SECTIONS/CLIMATE_PRESETS/QUICK_EXPORT/
 *  QUICK_RUN/VIEW_TOGGLES/WIZARDS_EXTRA contribuiscono alla sezione "commands",
 *  HELP_TOPICS alla "help", CLIMATE_PRESETS alla "loads"). */
export const PALETTE_COUNT = {
  total:    PALETTE_ITEMS.length,
  panels:   PALETTE_ITEMS.filter((i) => i.section === "panels").length,
  commands: PALETTE_ITEMS.filter((i) => i.section === "commands").length,
  settings: PALETTE_ITEMS.filter((i) => i.section === "settings").length,
  loads:    PALETTE_ITEMS.filter((i) => i.section === "loads").length,
  help:     PALETTE_ITEMS.filter((i) => i.section === "help").length,
};
