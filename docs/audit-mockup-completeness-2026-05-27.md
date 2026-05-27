# Audit Mockup-Driven Completeness · 2026-05-27

**Scope**: per ogni nuova pagina Phase 4-6, confronto mockup HTML originale vs implementazione React. Categorizzo elementi in:
- **VERBATIM** ✅ replica fedele mockup + backend wired
- **PARTIAL** ⚠️ estetica + UI interactive ma no backend / parziale
- **SKELETON** ❌ estetica OK, button/link no-op
- **MISSING** ⛔ skippato per brevit

## Completeness matrix

### Phase 4.1 Auth (4 pagine, COMPLETO)

| Component | Status | Note |
|---|---|---|
| LoginPage | ✅ VERBATIM | login wired al backend `/api/auth/login` |
| SignupPage | ✅ VERBATIM | register wired, ❌ link "termini" + "privacy" `href="#"` |
| ForgotPasswordPage | ✅ VERBATIM | wired al backend |
| EmailVerifyPage | ✅ VERBATIM | wired |
| BrandAside stats (62 endpoint, 5 EC, 1244 test) | ⚠️ PARTIAL | TODO v2.8: wire to `/api/stats` (commento esplicito) |

### Phase 4.2 Dashboard

| Component | Status | Note |
|---|---|---|
| Hero greeting personalizzato | ✅ VERBATIM | usa authStore user |
| 3 ActionTile (NewModel/Templates/Percorso UC1) | ✅ VERBATIM | wired a `feapro:open-new-model` event + `navigate("/templates")` + `navigate("/percorsi/uc1")` |
| RecentSection 4 thumb SVG | ✅ VERBATIM | mockup + click `onSelect(id)` |
| Hero link "UC1" | ✅ VERBATIM | wirato a `/percorsi/uc1` |
| Usage card "Scopri Pro" | ⚠️ PARTIAL | dispatch event ma non c' billing flow attivo |
| Brand link `<a href="#">` | ❌ SKELETON | `preventDefault` no-op |
| Foot "Privacy" / "Perch Preliminary" | ❌ SKELETON | `<a href="#">` no-op (DashboardPage.tsx:613,616) |

### Phase 4.3 Templates

| Component | Status | Note |
|---|---|---|
| 9 template card con SVG thumb | ✅ VERBATIM | tutti i 9 mockup definiti |
| Filter chip (Tutti/Acciaio/CA/Legno/Sismica) | ✅ VERBATIM | filtra dinamicamente |
| Tier toggle (Free/Pro/Tutti) | ✅ VERBATIM | filtra dinamicamente |
| Click tpl → onOpenTemplate | ⚠️ PARTIAL | dispatch `feapro:load-template` event + `navigate("/")` — verificare che App.tsx abbia listener |
| New Model CTA | ⚠️ PARTIAL | dispatch event |

### Phase 4.3b Percorso UC1

| Component | Status | Note |
|---|---|---|
| Stepper 6 step interattivo | ✅ VERBATIM | click cambia step |
| Coach panel STEP 3 (Carichi) | ✅ VERBATIM | hardcoded mockup-faithful |
| **Coach panel altri step (1,2,4,5,6)** | ❌ SKELETON | placeholder narrativo, no contenuto specifico per step |
| Canvas SVG | ✅ VERBATIM | trave + carico + appoggi |
| Inspector form (tipo/intensit/direzione) | ⚠️ PARTIAL | input controlled state ma "Aggiungi carico" non chiama backend |
| **Step "Solve" / "Verify EC3" / "Export"** | ⛔ MISSING | non implementati (commento esplicito: TODO iter v2.7.3.x) |
| Backend integration solver | ⛔ MISSING | TODO esplicito |

### Phase 5.1 Studio Modello

| Component | Status | Note |
|---|---|---|
| Tree sidebar (Nodi/Beam/Carichi/...) | ✅ VERBATIM | open/close groups interattivo |
| Viewport SVG (EL 5 selected) | ✅ VERBATIM | mockup verbatim |
| Mesh shape picker 8 tile | ✅ VERBATIM | selectable, cambia state |
| Mesh params form (L/N/Origine/Dir) | ⚠️ PARTIAL | input editabili ma form non submita |
| **"Genera mesh" button** | ❌ SKELETON | no-op, no backend call |
| **Tree row click** | ❌ SKELETON | non seleziona nodo nel canvas |
| **Schema editor row** | ❌ SKELETON | onOpen non implementato |
| **Cmd K palette** | ❌ SKELETON | btn topbar non apre palette |
| **Run F5 → solver** | ❌ SKELETON | no-op |
| **Trust badge "Preliminary"** | ❌ SKELETON | non clickable per HelpSheet |
| Tier "FREE" + Save "14:32" + altri | ❌ SKELETON | hardcoded |

### Phase 5.2 Studio Analisi

| Component | Status | Note |
|---|---|---|
| Filter chip (7 solver tipo) | ✅ VERBATIM | filtra dinamicamente |
| 7 solver card | ✅ VERBATIM | hardcoded mockup |
| Solver select (active = "Statica") | ✅ VERBATIM | interattivo |
| Param tab radio LU/CG | ⚠️ PARTIAL | controlled state ma non submita |
| **"Esegui" button** | ❌ SKELETON | no-op |
| **Altri tab (Output/Monitor/Log)** | ⛔ MISSING | solo "Parametri" implementato |

### Phase 5.3 Studio Verifiche

| Component | Status | Note |
|---|---|---|
| Code tabs (EC2/3/5/8/NTC) | ✅ VERBATIM | switch active code |
| Hero UR + gauge | ✅ VERBATIM | visual ok |
| UR table 7 row | ✅ VERBATIM | hardcoded mockup |
| Checks stats grid | ✅ VERBATIM | hardcoded |
| **"Esporta tabella" button** | ❌ SKELETON | no-op |
| **"Apri formula completa"** | ❌ SKELETON | no-op |
| **Filter seg (All/RES/LTB/SHEAR)** | ❌ SKELETON | seg ma non filtra effettivamente |

### Phase 5.4 Studio IO

| Component | Status | Note |
|---|---|---|
| Dropzone visivo | ⚠️ PARTIAL | rendering ok, **drag&drop NON supportato** (no event handler) |
| Recent imports list | ✅ VERBATIM | 3 file hardcoded |
| Tool cards (Export/Compare/AutoDetect/AI) | ✅ VERBATIM | visivi mockup |
| **Click tool list item** | ❌ SKELETON | no-op |
| AI Copilot Q&A | ⚠️ PARTIAL | testo hardcoded, no LLM integration |
| **"Invita collaboratore"** | ❌ SKELETON | no-op |

### Phase 6.1 Dialogs (DICHIARATAMENTE SHOWCASE)

| Component | Status | Note |
|---|---|---|
| Switcher 4 dialog | ✅ VERBATIM | funziona |
| Node dialog (Coord/DOF/Loads/Adv tabs) | ✅ VERBATIM | switcher tabs ok |
| **Tutti i button (Salva/Annulla/Crea)** | ❌ SKELETON | no-op (showcase) |
| **X close button** | ❌ SKELETON | non chiude (showcase) |
| **DOF tiles UX/UY fix, altri free** | ❌ SKELETON | hardcoded statici |

### Phase 6.2 Settings

| Component | Status | Note |
|---|---|---|
| Sidebar nav switcher | ⚠️ PARTIAL | set state ma solo "Account" ha contenuto |
| Account section identity card | ✅ VERBATIM | user data da authStore (fallback hardcoded) |
| Account form fields (email/nome/cognome/lingua) | ⚠️ PARTIAL | input editabili ma "Salva" no-op |
| **"Cambia avatar"** | ❌ SKELETON | no-op |
| **"Cambia password"** | ❌ SKELETON | no-op |
| **"Esci"** | ⚠️ PARTIAL | dispatch event `feapro:logout` ma listener TBD |
| **8 altri sidebar items (Profilo/Billing/API/Pref/Unit/Shortcuts/About)** | ⛔ MISSING | tab funzionante ma nessun contenuto |

### Phase 6.2 States (DICHIARATAMENTE SHOWCASE)

| Component | Status | Note |
|---|---|---|
| 4 state switcher | ✅ VERBATIM | funziona |
| Empty state link `/templates` + `/percorsi/uc1` | ✅ VERBATIM | wirato |
| Solver running progress | ⚠️ PARTIAL | progress hardcoded, no WS streaming |
| **Error state "Auto-fix vincoli"** | ❌ SKELETON | no-op |
| **"Visualizza diagnostica"** | ❌ SKELETON | no-op |

### Phase 6.3 Mobile (DICHIARATAMENTE SHOWCASE)

| Component | Status | Note |
|---|---|---|
| Phone-frame visivo | ✅ VERBATIM | demo iOS notch |
| 3 state switcher | ✅ VERBATIM | Viewer/Results/Home |
| Tab bar bottom | ❌ SKELETON | hardcoded statico |
| **NB: NON  il vero mobile responsive del sito** | — | showcase only |

## Summary numerico

| Categoria | Count | % |
|---|---|---|
| ✅ VERBATIM (production-ready) | ~30 elementi | ~25% |
| ⚠️ PARTIAL (UI interactive, backend partial) | ~25 elementi | ~22% |
| ❌ SKELETON (no-op buttons/links) | ~50 elementi | ~43% |
| ⛔ MISSING (saltati esplicitamente) | ~10 elementi | ~10% |

**Total pagine fully wired** (production-ready):
- **4/13** Auth (login/signup/forgot/verify)
- **Phase 4.2-4.3** Dashboard/Templates partially wired ma usable

**Total pagine showcase only** (non production):
- **3/13** Dialogs, States, Mobile (dichiaratamente design system demo)

**Total pagine "estetica viva, backend dead"**:
- **5/13** Percorso UC1, 4 Studio workspace

## Findings P0 — Critical (priorit produzione)

| # | Finding | Impact |
|---|---|---|
| **M1** | 5 nuove pagine Phase 5 (Studio*) hanno **zero backend wiring**. Click "Genera mesh" / "Esegui" / "Esporta tabella" no-op | Utente reale aprirebbe pagina, prova click, niente succede. Sembra rotto. |
| **M2** | 4 nuove pagine Phase 6 sono **showcase only** dichiarate. Dialogs X close non chiude. Settings 8/9 sidebar tab vuote | Utente loggato vede `/settings`, clicca "API keys" → nessun contenuto. |
| **M3** | Footer link `<a href="#">` in vari posti — Brand link, Privacy, Termini, Per Preliminary → tutti `preventDefault` | **No legal pages reali**. Compliance issue per produzione. |

## Findings P1 — Important

| # | Finding | Impact |
|---|---|---|
| **M4** | Trust badge "Preliminary" non clickable per HelpSheet (era nel design contract) | UX gap rispetto al mockup |
| **M5** | Cmd K palette non integrato con nuove pagine — btn topbar visibile ma non apre niente | Keyboard shortcut UX rotto su Phase 5 pagine |
| **M6** | User data hardcoded fallback ("Federico Sanna") in Settings/Dashboard se `user` null | A logout l'app mostra il nome di un'altra persona |
| **M7** | Dashboard hero "ultima sessione su UC1" hardcoded, non dipende dai progetti reali utente | Mockup pretende personalizzazione vera |

## Findings P2 — Code smell

| # | Finding | Suggested |
|---|---|---|
| **M8** | Comment markers nel codice ("MVP", "TODO", "iter v2.x") sono ammissione esplicita di skeleton. Auto-documentato MA tech debt significativo (~85 elementi non production) | Estrarre lista TODO in roadmap esplicita |
| **M9** | `/design/dialogs`, `/design/states`, `/design/mobile` sono showcase con AuthGate — utente loggato li vede come feature reali | Aggiungere disclaimer "DESIGN SYSTEM DEMO" o spostare a `/dev/*` route solo in dev mode |

## Sintesi pattern

I 5 Studio workspace + 3 showcase ($percorso, dialogs, states, mobile) sono stati **tradotti per design (estetica) ma non per behavior (interazioni)**. Il pattern è esplicitamente "mockup-faithful estetica + iter futuri per backend".

Quando un utente reale apre le pagine, **vede design ma nessun bottone funziona** salvo Auth/Dashboard/Templates che sono completi.

## Roadmap fix proposta (~12-15h)

| Step | Effort | Output |
|---|---|---|
| 1. Wire backend Studio Modello mesh wizard (Genera mesh → API call) | ~3h | Studio Modello production-ready |
| 2. Wire backend Studio Analisi (Esegui solver) + Verifiche (Esporta tabella) | ~4h | 2 workspace usabili |
| 3. Wire backend Studio IO (drag&drop import + tool list) | ~3h | I/O workspace usabile |
| 4. Settings: implementare 5 sidebar tab (Profilo/Billing/API/Pref/About) | ~2h | Settings usabile |
| 5. Footer/Brand link → wire a `/about`, `/privacy`, `/terms` pages reali | ~1h | Compliance OK |
| 6. Cmd K palette integration con tutte le pagine | ~2h | Keyboard UX consistente |

---

**Riferimento**: questo audit è il terzo della giornata, dopo:
- `audit-css-shell-wrapper-2026-05-27.md` (10 findings)
- `audit-responsive-breakpoints-2026-05-27.md` (8 findings)

Tot **31 findings** documentati. La maratona Phase 4-6 ha consegnato un design system **visivamente completo al ~95%** ma **funzionalmente solo al ~25%** in produzione. Tech debt esplicito.

---

## 📊 Status post Sprint A-F (v3.0.0 · 2026-05-27 sera)

Re-eseguito audit dopo Sprint A-F. **13/13 findings P0+P1 fixed (100%)** + 2 nuovi residui minor.

| ID | Finding | Status v3.0.0 | Sprint |
|---|---|---|---|
| M1.1 | Studio Modello "Genera mesh" no-op | ✅ FIXED | Sprint B (POST /mesh/parametric) |
| M1.2 | Studio Analisi "Esegui" no-op | ✅ FIXED | Sprint B (POST /analysis/static·modal·buckling) |
| M1.3 | Studio Verifiche "Esporta tabella" no-op | ✅ FIXED | Sprint B (GET /export/xlsx) |
| M1.4 | Studio IO Export tool list no-op | ✅ FIXED | Sprint B (GET /export/pdf·xlsx·dxf·ifc) |
| M2 | Settings 8 tab vuote | ✅ FIXED | Sprint C (8 sezioni con SectionCard) |
| M3 | Footer link href="#" rotti | ✅ FIXED | Sprint A (4 legal pages reali) |
| M4 | Trust badge non clickable | ✅ FIXED | Sprint C (navigate /preliminary) |
| M5 | Cmd K palette no wire | ✅ FIXED | Sprint C (dispatchEvent in StudioShell) |
| M6 | User data hardcoded fallback | ✅ FIXED | Sprint A (display* variables) |
| M7 | Dashboard hero hardcoded UC1 | ✅ FIXED | Sprint E (latestModel prop dinamico) |
| M8 | Comment markers MVP/TODO | ❌ open | refactor non blocking |
| M9 | Showcase pages no disclaimer | ✅ FIXED | Sprint D (ShowcaseBanner 3 pages) |
| 🆕 M10 | Studio no model toast senza CTA | ✅ FIXED | Sprint E (StudioEmptyBanner) |
| 🆕 M11 | Studio Analisi Pro solver confondibili | ✅ FIXED | Sprint E (disabled + Beta label) |
| 🆕 M12 | Studio IO drag&drop no event handler | ✅ FIXED | Sprint E (onDragOver/Leave/Drop + import) |
| 🆕 M13 | 4 href="#" minori residui | ⚠️ partial | Sprint F (2/4 fixati: brand Dashboard + BrandAside; 2 minor residui in StudioIO/Verifiche internal anchors) |

**Score**: 13 fixed (M1.x×4 + M2-M7 + M9-M12) + 1 partial (M13) / 17 totali → **76%** ma 100% dei P0+P1 user-visible.

**Findings residui**: M8 (code smell refactor), M13 residual 2 minor.
