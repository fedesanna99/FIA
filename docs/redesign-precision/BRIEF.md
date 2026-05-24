# v2.5.0-redesign-precision · Brief Claude Code

> Brief operativo per il redesign UI completo di FEA Pro in direzione "Precision".
> Pensato come prompt iniziale Claude Code. Auto-contenuto. Letto in sequenza, esegue.
>
> **Branch sorgente**: `test` (sincronizzato con `main`)
> **Branch lavoro**: `feature/redesign-precision` (creato in S0)
> **Baseline test**: pytest 1675 PASS / 2 FAIL pre-esistenti · vitest 584/584 PASS · tsc 0 errori
> **Versione attuale**: `v2.4.x-followup-fixes`
> **Stima**: 7 sprint · ~22-25 giorni Claude Code · 1 PR per sprint con review esplicita Federico
> **Tag finale**: `v2.5.0-redesign-precision`
> **Pattern**: OPERATING_RULES v2 + Policy C frontend
> **Sync**: comando custom "sincronizza test con tutto" solo dopo merge a `test` di ogni PR
> **Vietato**: `--force-push`, `--no-verify`, rimozione feature, modifiche backend, refactor opportunistico architetturale

---

## 0 · Sintesi (leggi questa prima del resto)

Il design "Precision" è stato definito in claude.ai/design come ambiente parallelo. Il bundle handoff è stato consegnato come allegato a questo brief (vedi `attachments/FEAPRO_HANDOFF.zip`).

Caratteristiche visuali non negoziabili:
- Light canonical, dark paritetico via `[data-theme="dark"]` su `<html>`
- Accento cyan singolo (`#0891B2` light · `#5DD7F2` dark) — Studio Pro e Percorsi si distinguono per layout, non più per colore
- Tutti i radius a 0 (sharp). `rounded-full` resta solo per cerchi puri (avatar, dot, pulse)
- Hairline-only borders, shadow ridotte a `0 0 0 1px rgba(...)`
- Tipografia: Inter (body), Inter Tight (display), JetBrains Mono (numerici)
- Italiano predominante nei testi, inglese solo per codici norma (EC3 §6.2.5, kNm, ⌘K)

Vincoli operativi tassativi:
- **Zero modifiche backend** (`pytest 1675 PASS` deve restare invariato dopo ogni PR)
- **Zero rimozioni di feature** (solo ridisegno, mai eliminazione)
- **Zero nuove dipendenze pesanti** (Tailwind + Lucide bastano)
- Tutti i task v1.5 ancora aperti (NodeDetail panel, ImportWizard, palette espansa) confluiscono in questo redesign — alcuni li sostituisce, altri li include
- I 4 bug visivi mobile segnalati da Federico (vedi §1) vanno chiusi in **S2**, non aspettano

Obiettivo strategico finale: dopo S7, rimuovere il disclaimer "non per progetti reali" dal README e taggare `v2.5.0`. FEA Pro diventa production-ready.

---

## 1 · Bug visivi mobile da chiudere in S2 (segnalati da Federico)

Identificati da 2 screenshot di `fea-pro.fly.dev` su mobile (vedi `attachments/BUG_*.jpg`).

| ID | Sintomo | Diagnosi sospetta | Verifica obbligatoria in S0 |
|---|---|---|---|
| **BUG-V1** | "Nuovo modello" appare 2 volte: nel dropdown TopBar + come pill nella riga sotto | Doppia label residuale. La pill è probabilmente legacy da quando non c'era il dropdown | `grep -rn "Nuovo modello\|ModelChip\|ModelPill" frontend/src --include="*.tsx"` |
| **BUG-V2** | Su mobile il Run button verde appare croppato a metà in alto | Padding/altezza topbar sbagliata, oppure il button deborda dal container | Test su viewport 390px: ispezione bounding box del Run button |
| **BUG-V3** | Riga statistiche `12 nodi · 2 elem · —` ha dash orfano + `CHECKS 0/0 nodi/el…` troncato | Overflow text non gestito + placeholder vuoto non nascosto se metrica indefinita | `grep -rn "nodi.*elem\|ModelStatsBar\|HeaderStats" frontend/src` |
| **BUG-V4** | Vista 3D "non comunica" la modalità corrente: l'utente non capisce se è Front, Iso, Top | Manca label esplicita "Vista: Front" sopra il gizmo. "Custom · Transp · Orto · L3" è criptico | `grep -rn "viewport.*tool\|ViewportToolbar\|cameraView\|projection" frontend/src` |

BUG-V4 è la versione viewport del finding centrale di Paoletto ("non capisco cosa sto guardando"). Va trattato come P0 UX, non come "polish".

---

## 2 · Decisioni attive (sovrascrivibili da Federico prima del freeze)

Per ognuna, ho indicato la mia raccomandazione. Se Federico non corregge, queste sono le scelte che applichiamo.

| # | Decisione | Opzioni | Raccomandazione PM | Razionale |
|---|---|---|---|---|
| **D1** | Sprint quick fix bug mobile prima del redesign? | (a) sì, mezza giornata · (b) confluiti in S2 | **(b)** confluito in S2 | Inutile rilasciare un fix intermedio se 5 giorni dopo arriva la PR2 chrome completa che cambia tutto |
| **D2** | Gap mockup Element Inspector + diagrammi picchi | (a) torno in Claude Design 1 settimana · (b) Claude Code disegna seguendo Precision · (c) post-redesign | **(b+)** = Claude Code disegna in S5 ma Federico valida wireframe ASCII proposto in S5-step-1 prima di codice | A bloccherebbe momentum 7 giorni. C lascia il redesign senza i 2 P0 Paoletto. B+ accetta un'iterazione di review nel mezzo |
| **D3** | Branch strategy | (a) sprint atomici su `test` (OPERATING_RULES default) · (b) feature branch + PR per sprint | **(b)** | Scope 22-25 giorni: una PR atomica su `test` ogni giorno per 22 giorni espone troppo a rotture cumulative del deploy. Feature branch isola tutto, una PR per sprint con tua review prima del merge |
| **D4** | Default tema | (a) light (Precision dice) · (b) dark (CAE tradition) · (c) light + auto-migrate utenti esistenti su dark | **(c)** | Light come canonical (allinea con direzione Precision) ma per utenti già loggati con dark attivo non si forza il cambio. Il primo accesso post-deploy, un banner una tantum chiede "Provare nuovo tema light?" |
| **D5** | Cadenza esecuzione | (a) back-to-back 22-25 giorni · (b) blocchi spalmati con altri lavori in mezzo | **(a) per S0-S2, (b) flessibile da S3** | S0+S1+S2 sono base + bug fix urgenti, vanno fatti subito di fila. Da S3 (screens principali) si può accettare pause per sprint backend non-bloccanti |

---

## 3 · Setup iniziale (S0)

### 3.1 Check OPERATING_RULES standard

```bash
cd ~/feapro          # oppure il path locale del repo
git rev-parse --abbrev-ref HEAD          # deve essere 'test'
git rev-parse --short HEAD               # nota lo SHA in S7_report.md alla fine
git status                               # working tree pulito (no .ts/.py/.json non in scope)
cat frontend/src/lib/version.ts | grep -i version  # conferma v2.4.x-followup-fixes
```

**STOP se**: branch ≠ `test`, working tree sporco con file di codice, versione inattesa.

### 3.2 Verifica baseline test (DEVE essere identica a quella dichiarata in cima)

```bash
cd backend && pytest --tb=short 2>&1 | tail -10
# Atteso: 1675 PASS / 2 FAIL pre-esistenti (1 estimator + 1 elevation)

cd ../frontend
node_modules/.bin/tsc --noEmit
# Atteso: 0 errori

node_modules/.bin/vitest run 2>&1 | tail -5
# Atteso: 584/584 PASS / 0 FAIL
```

**STOP se** qualsiasi metrica diverge: documenta cosa hai trovato, non procedere.

### 3.3 Esplorazione codebase obbligatoria (fa nel branch test, NO modifiche)

Prima di creare il feature branch, mappa le nomenclature reali — il bundle Claude Design assume nomi tipo `TopBar.tsx`, `ModelInfoCard.tsx` ma non ha visto il repo:

```bash
cd frontend/src

# 1. Mappa atoms esistenti
ls components/ui/
cat components/ui/index.ts 2>/dev/null || echo "no barrel"

# 2. Mappa shell esistente
ls components/shell/ 2>/dev/null
ls components/topbar/ 2>/dev/null
ls components/panels/ 2>/dev/null

# 3. Mappa store
ls store/

# 4. Verifica file CSS/Tailwind centrale
ls index.css globals.css colors_and_type.css 2>/dev/null
ls tailwind.config.* 2>/dev/null

# 5. Cerca eventuali ModelChip/ModelPill duplicati (BUG-V1)
grep -rn "Nuovo modello\|ModelChip\|ModelPill" . --include="*.tsx" | head

# 6. Cerca shadcn/ui (se presente, va re-stilato non rimosso)
grep -rn "@/components/ui\|shadcn" . --include="*.tsx" | head

# 7. Verifica se la mobile bottom tabbar è già implementata (le screenshot mostrano di sì)
grep -rn "MobileTabbar\|bottom.*tabbar\|MODELLO.*MAKE.*SOLVE" . --include="*.tsx" | head
```

Output atteso: `S0_codebase_map.md` in `docs/redesign-precision/` con la mappatura reale dei nomi file vs nomi attesi dal bundle. Questo documento è la **fonte di verità** per i find-and-replace successivi.

### 3.4 Creazione feature branch

```bash
git checkout test
git pull --ff-only origin test
git checkout -b feature/redesign-precision
git push -u origin feature/redesign-precision
```

### 3.5 Estrazione bundle

```bash
mkdir -p docs/redesign-precision
unzip attachments/FEAPRO_HANDOFF.zip -d docs/redesign-precision/handoff
# Risultato atteso: handoff/tokens.css, handoff/precision.css, handoff/screens/*.html,
# handoff/PROMPT_FOR_CLAUDE_CODE.md, handoff/implementation.md, handoff/migration-risks.md,
# react-pack/shell/*.tsx, assets/logo-*.svg
```

`docs/redesign-precision/handoff/` resta come riferimento permanente. Nessuno di quei file viene mai deployato così com'è.

---

## 4 · Pipeline 7 sprint

Ogni sprint = 1 PR. Sequenza in ordine di dipendenza, **non parallelizzabili**. Dopo ogni PR Federico fa review esplicita, approva, merge in `test`, sincronizza con tutto. POI passi al prossimo sprint.

### Riepilogo cadenza

| Sprint | Giorni | Tag intermedio post-merge | Quality gate critico |
|---|---|---|---|
| S1 · tokens + atoms | 2.5 | `v2.5.0-pr1-tokens-atoms` | vitest snapshot massivamente aggiornati, 1 visual diff per atom |
| S2 · chrome + bug fix mobile | 4 | `v2.5.0-pr2-chrome` | I 4 BUG-V chiusi visivamente, mobile + desktop responsive |
| S3 · screens A1+A2+B1+B3+C1 | 3 | `v2.5.0-pr3-screens-core` | A1 hub click → carica B1 → carica B3 → ritorno A2 funzionante |
| S4 · screens C2-C7 percorsi | 2.5 | `v2.5.0-pr4-percorsi` | Flusso completo C2→C3→C4→C5→C5b→C6→C7 navigabile end-to-end |
| S5 · ElementInspector + diagrammi picchi | 4-5 | `v2.5.0-pr5-inspector-diagrams` | I 4 P0 Paoletto chiusi: click N3 mostra pannello completo · diagrammi N/V/M etichettati |
| S6 · viewport + animazioni + palette espansa | 3.5 | `v2.5.0-pr6-viewport-palette` | Three.js viewport con nuovi token · palette ≥160 voci (task v1.5 #34) |
| S7 · mobile/tablet + E2E + polish | 4 | `v2.5.0` (tag finale + README cleanup) | Lighthouse > 80 main chunk · gzip < 400 kB · axe-core 0 violations critical |

---

## 5 · Sprint dettagliati

### S1 · Tokens + atoms (2.5 giorni)

**Obiettivo**: sostituire base CSS + ridisegnare 8 atoms esistenti + aggiungerne 3 nuovi.

**File principali da modificare**:
- `frontend/src/index.css` → contenuto di `handoff/tokens.css` (DELETE il vecchio, sostituisci)
- `frontend/tailwind.config.js` → merge con `handoff/tailwind.config.snippet.js` (NON sovrascrivere il file: aggiungi sotto `theme.extend` mantenendo eventuali plugin esistenti)
- `frontend/src/components/ui/Button.tsx` → 5 variant (`primary`, `secondary`, `ghost`, `danger`, `run`) + 3 size (`sm`, default, `lg`) + `iconOnly`. Riferimento classi: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-run`, `.btn-sm`, `.btn-lg`, `.btn-icon`
- `frontend/src/components/ui/IconButton.tsx` → 28×28, classe `.topbar-icon-btn` o `.btn-icon`
- `frontend/src/components/ui/Input.tsx` → `.input` + variant `.input.numeric` per font-mono
- `frontend/src/components/ui/FormField.tsx` → `.field`, `.field-label`, `.field-help` (label uppercase mono 10px)
- `frontend/src/components/ui/Chip.tsx` → `.chip` + variant `.chip--accent`, `.chip--warn`, `.chip--danger` + dot variants
- `frontend/src/components/ui/Badge.tsx` → `.badge`, `.badge--ghost`, `.badge--warn`, `.badge--success`, `.badge--draft`
- `frontend/src/components/ui/Toggle.tsx` → `.toggle` con stato `.on`
- `frontend/src/components/ui/Kbd.tsx` → `.kbd`

**File nuovi**:
- `frontend/src/components/ui/Spinner.tsx` → classi `.spin`, `.spin-lg`
- `frontend/src/components/ui/Skeleton.tsx` → classe `.shimmer`
- `frontend/src/components/ui/Avatar.tsx` → iniziali su tinted bg, classe `.topbar-avatar`

**Vincoli specifici**:
- Il vecchio `colors_and_type.css` ha già la stessa struttura `--c-*` (RGB triple). Lo schema è compatibile. Solo i **valori** cambiano (oltre alla scelta light come default).
- Se nel codice ci sono classi Tailwind hardcoded tipo `bg-slate-900`, `text-gray-400`, `rounded-lg` → vanno tutte sostituite con le classi semantiche nuove (`bg-bg-panel`, `text-ink-2`, niente `rounded-lg` perché diventerà 0). **Mai sostituire opportunisticamente** in file non in scope di questo sprint: limita la modifica agli atoms.

**Test**:
- `pnpm tsc --noEmit` → 0 errori
- `pnpm vitest run` → snapshot saranno tutti rotti, aggiorna con `pnpm vitest -u`. **Prima di accettare l'update**, leggi a mano i diff per `Button`, `Badge`, `Chip` per assicurarti che il cambio sia solo cosmetico, non strutturale (es. no perdita di aria-label).
- Apri `handoff/screens/A1-dashboard.html` in browser e confronta visivamente almeno 3 atoms in storybook (se presente) o in viewport reale.

**STOP se**: tsc errori > 0, snapshot rivelano cambi DOM non solo cosmetici (es. ARIA persi, role cambiati).

**Commit message**:
```
feat(ds): token system + atoms riallineati direzione Precision (v2.5.0-pr1 S1)

- index.css sostituito con tokens.css (light canonical, dark paritetico, cyan accent)
- tailwind.config.js merge con snippet Precision (radius 0, shadow hairline-only)
- 8 atoms ridisegnati: Button, IconButton, Input, FormField, Chip, Badge, Toggle, Kbd
- 3 atoms nuovi: Spinner, Skeleton, Avatar
- vitest snapshot aggiornati (cosmetico only, ARIA invariata)
- Riferimento: handoff/precision.css, handoff/screens/A1-dashboard.html
```

**Quality gate completo + PR + sync + tag**:
```bash
cd backend && pytest --tb=short 2>&1 | tail -5      # 1675 PASS invariato
cd ../frontend && pnpm tsc --noEmit                 # 0 errori
pnpm vitest run 2>&1 | tail -5                      # 584/584 (snapshot aggiornati)
pnpm build                                          # OK
# Apri PR su GitHub: feature/redesign-precision → test
# STOP. Aspetta review Federico, dopo merge a test:
git checkout test && git pull --ff-only origin test
git tag -a v2.5.0-pr1-tokens-atoms -m "v2.5.0 PR1 · tokens + atoms"
git push origin v2.5.0-pr1-tokens-atoms
# Continua con S2 partendo da test aggiornato e ricreando il branch se necessario
```

---

### S2 · Chrome navigazionale + fix BUG-V1/V2/V3/V4 (4 giorni)

**Obiettivo**: ridisegnare la shell completa (TopBar, LeftRail, RightRail, StatusBar, MissionBar, ModelInfoCard) e chiudere i 4 bug visivi mobile.

**File da modificare** (nomi attesi, da confermare con `S0_codebase_map.md`):
- `frontend/src/components/topbar/TopBar.tsx` → grid 9-col, search center 28px button, mode chip, version chip, avatar tinted. Classi: `.topbar`, `.topbar-logo`, `.topbar-search`, `.topbar-modechip`, `.topbar-icon-btn`, `.topbar-avatar`, `.topbar-credits`
- `frontend/src/components/shell/LeftRail.tsx` → 112px wide, categorie con `.leftrail-section`, items `.rail-item`/`.rail-item.is-active` (border-left accent 2px)
- `frontend/src/components/shell/RightRail.tsx` → 56px wide, solo icone, classi `.rail-icon-only`/`.rail-icon-only.is-active`
- `frontend/src/components/shell/StatusBar.tsx` → 28px height, mono 10px, classi `.statusbar`, `.statusbar-dot`, `.statusbar-spacer`
- `frontend/src/components/shell/MissionBar.tsx` → accent icon left, status chip right, classi `.mb`, `.mb-icon`, `.mb-eyebrow`, `.mb-title`, `.mb-text`, `.mb-status`
- `frontend/src/components/shell/ModelInfoCard.tsx` → `.mic`, `.mic-uc`, `.mic-rows` (dl tabular-nums)

**Fix BUG-V1** (mobile "Nuovo modello" duplicato):
1. Da `S0_codebase_map.md` identifica il componente che renderizza il duplicato (probabilmente `ModelChip.tsx` o equivalente nel topbar mobile)
2. Verifica se è ancora chiamato da consumer: se sì, rimuovi solo per viewport `< md` (Tailwind `md:flex hidden`), se è cruciale lo lasci su desktop
3. Test: ispeziona viewport 390px → "Nuovo modello" deve apparire **una sola volta**

**Fix BUG-V2** (Run button cropped mobile):
1. Identifica TopBar mobile (probabilmente lo stesso `TopBar.tsx` con responsive logic, oppure `MobileTopBar.tsx`)
2. Ispeziona padding/height del container topbar mobile: `h-14` (56px) deve essere il minimo per accomodare un `btn-run` da 28px + padding verticale 8+8
3. Se il button era assoluto-positioned sopra la topbar (cause croppato), riportalo dentro il flow normale
4. Test: ispeziona viewport 390px → button completo visibile, no clipping

**Fix BUG-V3** (riga `12 nodi · 2 elem · —` con dash orfano + CHECKS troncato):
1. Identifica il componente stats bar (probabilmente `ModelStatsBar.tsx` o riga dentro `TopBar.tsx`)
2. Per il dash orfano: condiziona la metrica `—` con `{value ?? null}` invece di mostrare sempre il placeholder
3. Per CHECKS troncato: su mobile (`< md`) → nascondi CHECKS dall'header, sposta su MissionBar o RightRail. Su desktop resta.
4. Test: ispeziona 390px → riga deve avere `[2 nodi · 2 elem]` pulito, niente dash orfano, niente truncation

**Fix BUG-V4** (vista 3D senza indicazione modalità corrente):
1. Identifica viewport toolbar (probabilmente `ViewportToolbar.tsx` o overlay HUD dentro `Viewport3D.tsx`)
2. Aggiungi sopra il gizmo XYZ una label esplicita: `<div class="vp-view-label">Vista: Iso</div>` (oppure "Front" / "Top" / "Right" / "Custom")
3. La label si aggiorna automaticamente dallo store camera (`useViewportStore`, da verificare nome)
4. Sostituisci la stringa criptica `Custom · Transp · Orto · L3` con etichette comprensibili: `Wireframe` o `Solid` (non `Transp`), `Proiezione ortogonale` collapsato a `Orto` solo se attivo
5. Test: cambia vista da iso a front → la label cambia visivamente

**Test integrato S2**:
- Apri `fea-pro.fly.dev` desktop chrome → confronta visivamente con `handoff/screens/B1-studio-pro-workspace.html`. Deve essere visivamente coerente (radius 0, accent cyan, hairline border, font Inter+JetBrains Mono)
- Apri DevTools mobile 390×844 → verifica BUG-V1/V2/V3 chiusi e BUG-V4 con label visibile
- `pnpm vitest run` → tutti i 584 verdi (con snapshot aggiornati dove necessario)

**Commit message**:
```
feat(shell): chrome navigazionale Precision + fix 4 bug mobile (v2.5.0-pr2 S2)

- TopBar, LeftRail (112px), RightRail (56px), StatusBar, MissionBar, ModelInfoCard
- BUG-V1 chiuso: "Nuovo modello" duplicato rimosso su mobile (md:hidden)
- BUG-V2 chiuso: Run button cropped, fixed topbar height mobile
- BUG-V3 chiuso: dash orfano condizionato, CHECKS nascosto mobile
- BUG-V4 chiuso: label "Vista: Iso/Front/Top" esplicita sopra gizmo
- AppShell + WorkspaceShell grid layout Precision
- Theme switcher light/dark persistito in localStorage
```

---

### S3 · Schermate principali A1+A2+B1+B3+C1 (3 giorni)

**Obiettivo**: ridisegnare 5 schermate top-level che coprono il 70% del traffic utente.

Ordine consigliato (rispettare):
1. **A1 Dashboard** (`handoff/screens/A1-dashboard.html`): hero hubs Studio Pro vs Percorsi (asse cromatico singolo cyan, distinzione layout), quick actions (3-4 card grandi), recenti (lista progetti con thumb), side rail con Credits + Tips. Classi: `.hubs`, `.hub`, `.hub--studio`, `.hub--percorsi`, `.qact`, `.proj`, `.widget`.
   - **Importante per UX Paoletto finding #3**: ogni card progetto recente deve mostrare dimensioni e carichi caratteristici, non solo nome. Esempio: `Capannone Cagliari 24×12m · DEAD 4kN/m² · LIVE 2kN/m²`. Estendi `ModelTableRow` se mancano questi campi (chiedi a Federico se servono da backend o se ci sono già in metadata)
2. **A2 Modelli** (`handoff/screens/A2-modelli.html`): tabella con sort/filter. Usa `react-pack/shell/ModelsTable.tsx` come base, adatta a `ModelTableRow` reale
3. **B1 Studio Pro workspace** (`handoff/screens/B1-studio-pro-workspace.html`): workspace assemblato. Viewport 3D resta wireframe SVG per ora (Three.js viene in S6), ma deve essere già contenitore con `.vp` classes + HUD overlays funzionanti
4. **B3 Verify** (`handoff/screens/B3-studio-pro-verify.html`): rail laterale verifiche + tabella per-element. Usa `react-pack/shell/ChecksRail.tsx` e `ChecksDetailTable.tsx` come template
5. **C1 Galleria Percorsi** (`handoff/screens/C1-percorsi-galleria.html`): card grid

**Vincoli specifici**:
- Componenti del react-pack del bundle vanno **copiati**, non importati: il bundle è handoff, non libreria. Adatta i tipi alle interfacce reali del codebase (`ModelTableRow` esistente, `CheckItem` esistente).
- Se incontri un atom mancante (es. `EmptyState`) che il react-pack assume esistente, controlla `frontend/src/components/ui/index.ts` o equivalente. Se davvero non esiste, crealo con i token Precision.

**Test integrato S3**:
- Smoke E2E manuale: A1 → click hub Studio Pro → B1 → click "Verifiche" → B3 → back → A2 → seleziona modello → back A1 → click hub Percorsi → C1. Deve funzionare senza routing rotto.
- Verifica visiva con i 5 file HTML side-by-side.

**STOP se**: routing rotto, oppure se trovi che `ModelTableRow` non ha campi `length` / `loads_summary` e non ti è chiaro se sono backend o frontend (chiedi a Federico).

---

### S4 · Schermate Percorsi C2-C7 (2.5 giorni)

**Obiettivo**: ridisegnare i 6 step del flusso guidato.

Schermate target:
- **C2 Geometria** (`handoff/screens/C2-percorso-geometria.html`)
- **C3 Vincoli e carichi** (`handoff/screens/C3-percorso-vincoli-carichi.html`)
- **C4 Materiali e sezioni** (`handoff/screens/C4-percorso-materiali-sezioni.html`)
- **C5 Esegui** (`handoff/screens/C5-percorso-esegui.html`) — include `ComputeProfileCard` (`.cp`, `.cp.is-selected`)
- **C5b Running** (`handoff/screens/C5b-percorso-running.html`) — LoadingScreen ricco con log streaming, phase indicator, progress bar. **WS hookup** ai progress event del solver (`/ws/analysis/{model_id}`) come già esiste oggi. La parte visuale è nuova, la parte data flow è già nel codice
- **C6 Critical View** (`handoff/screens/C6-percorso-critical-view.html`) — usa `react-pack/shell/InsightPanel.tsx` come base
- **C7 Report** (`handoff/screens/C7-percorso-report.html`) — Trust Layer banner sempre `DRAFT` finché qualifica non confermata. Usa `react-pack/shell/TrustLayerBadge.tsx`

**Componenti shared**:
- `PercorsoStepper` (`.stp-bar.stp-6`, step con stati `.is-done`, `.is-current`, `.is-todo`): probabilmente esiste già nel codebase (era task v1.5). Verifica.
- `PercorsoStep` (template wrapper): usa `react-pack/shell/PercorsoStep.tsx`

**Test integrato S4**:
- Flusso end-to-end manuale: avvia un nuovo percorso da C1 → C2 → C3 → C4 → C5 → click "Esegui" → C5b loading → C6 critical view → C7 report
- Verifica WebSocket: il loading C5b deve aggiornare phase + progress in tempo reale dal backend (già funzionante in v2.4.x)
- Verifica TrustLayerBadge: report deve mostrare watermark DRAFT visibile e banner warning

**STOP se**: WebSocket non aggiorna (regressione backend), oppure se PercorsoStepper esistente ha un'API incompatibile col bundle (chiedi a Federico).

---

### S5 · Element Inspector + Diagrammi N/V/M con etichette di picco (4-5 giorni) ⭐ critico

**Obiettivo**: chiudere i 4 finding P0 di Paoletto. Componente nuovo + redesign diagrammi.

Questo sprint **non ha mockup nel bundle**. Claude Design ha lasciato un gap. Procedi come segue.

#### S5 step 1 — Wireframe ASCII proposto a Federico (prima del codice)

Prima di scrivere codice, produci `docs/redesign-precision/S5_inspector_wireframe.md` con:

```
┌─────────────────────────────────────────────────────┐
│  ◀  Nodo N3                          [×]            │
├─────────────────────────────────────────────────────┤
│  COORDINATE                                          │
│    X = 4.250 m    Y = 0.000 m    Z = 3.500 m        │
│                                                      │
│  VINCOLO                                             │
│    [+] Aggiungi vincolo                              │
│                                                      │
│  CARICHI APPLICATI                            (0)    │
│    [+] Aggiungi carico                               │
│                                                      │
│  CONNESSO A                                          │
│    B1 (BEAM2D) — direzione +Y                        │
│    B2 (BEAM2D) — direzione +X                        │
│                                                      │
│  REAZIONI VINCOLO (se vincolato)                     │
│    Fx = 12.45 kN   Fy = -45.20 kN   Fz = 0 kN        │
│    Mx = 0  My = 0  Mz = 8.14 kNm                     │
│                                                      │
│  SPOSTAMENTI (se risolto)                            │
│    ux = 0.00 mm   uy = 8.20 mm   uz = 0.00 mm        │
│                                                      │
├─────────────────────────────────────────────────────┤
│             [Annulla]              [Salva]           │
└─────────────────────────────────────────────────────┘
```

E versione Element (click su elemento beam):

```
┌─────────────────────────────────────────────────────┐
│  ◀  Elemento B1 · BEAM2D                  [×]       │
├─────────────────────────────────────────────────────┤
│  GEOMETRIA                                           │
│    Nodo i = N1 (0.00, 0.00, 0.00)                    │
│    Nodo j = N3 (4.25, 0.00, 3.50)                    │
│    Lunghezza = 5.503 m                               │
│                                                      │
│  MATERIALE                                           │
│    [steel_s355]                                      │
│    E = 210 GPa · fy = 355 MPa · ν = 0.3              │
│                                                      │
│  SEZIONE                                             │
│    [IPE 300]                                         │
│    A = 5380 mm² · Iy = 8356 cm⁴                      │
│    Wpl,y = 628 cm³ · Wpl,z = 125 cm³                 │
│                                                      │
│  SOLLECITAZIONI                                      │
│    M_max  =  12.45 kNm  @ x = 2.25 m                 │
│    M_min  =  -3.20 kNm  @ x = 5.50 m                 │
│    V_max  =  18.30 kN   @ x = 0.00 m                 │
│    N_max  =  -45.20 kN  (compressione, costante)     │
│                                                      │
│  VERIFICHE EC3                              UC max   │
│    Flessione My                              0.42    │
│    Taglio Vz                                 0.18    │
│    Instabilità laterale (LTB)                0.71    │
│    INTERAZIONE TOTALE                        0.88    │
│                                                      │
├─────────────────────────────────────────────────────┤
│             [Annulla]              [Salva]           │
└─────────────────────────────────────────────────────┘
```

**STOP qui**: aspetta validazione Federico sul wireframe ASCII. Se conferma, procedi. Se ha modifiche, aggiorna prima di scrivere TSX.

#### S5 step 2 — Implementazione

**File nuovi**:
- `frontend/src/store/selectionStore.ts` (se non esiste già) → state `selectedNodeId`, `selectedElementId`
- `frontend/src/components/shell/panels/inspect/NodeDetail.tsx` → renderizza pannello come wireframe sopra
- `frontend/src/components/shell/panels/inspect/ElementDetail.tsx` → renderizza pannello come wireframe sopra
- `frontend/src/components/viewport/diagrams/BeamDiagramOverlay.tsx` → diagramma N/V/M con etichette di picco SVG overlay sopra la curva

**File da modificare**:
- `frontend/src/components/viewport/Viewport3D.tsx` → click su nodo → `useSelectionStore.selectNode(id)` + apri RightPanel inspect (no più modal NodeDialog)
- `frontend/src/components/shell/panels/InspectPanelContent.tsx` → switch su `selectedNodeId` / `selectedElementId` → renderizza NodeDetail / ElementDetail / vista risultati standard
- `frontend/src/components/dialogs/NodeDialog.tsx` → mark `@deprecated`, non rimuovere (back-compat)

**Diagrammi N/V/M con etichette di picco** (Paoletto finding #2):
1. Identifica componente esistente `InternalForceDiagram.tsx` o equivalente
2. Aggiungi overlay SVG sopra la curva del diagramma con etichette:
   ```
   M_max = 12.45 kNm @ x = 2.25 m   ← in alto, color danger se UC>0.9
   M_min = -3.20 kNm @ x = 5.50 m   ← in basso
   ```
3. Etichette font-mono, tabular-nums, font-size 11px, posizionate via SVG `<text>` con `x`/`y` calcolati dal punto di picco
4. Visibili **di default**, non opzionali (Paoletto richiesta esplicita: "di default servono etichette")

**Vincoli normativi nel wireframe** (Paoletto finding #4 + UX_REDESIGN_BRIEF principio 6):
- Tutte le sollecitazioni hanno il riferimento normativo della verifica (EC3 §6.2.5 per M, §6.2.6 per V, §6.2.4 per N)
- Tutti i valori UC includono la formula della verifica accanto (tooltip on hover)

**Test S5**:
- Click su nodo nel viewport → pannello laterale apre con coordinate corrette
- Click su elemento → pannello con materiale, sezione, sollecitazioni con `M_max = X @ x = Y m`, UC normativi
- Diagrammi N/V/M con etichette visibili a colpo d'occhio
- Mobile: tap su elemento → schermata full-screen Element Inspector (no panel laterale ridotto, è prima cittadina)
- Test E2E nuovi: `frontend/src/test/e2e/element-inspector.spec.ts` con 4 asserzioni → "click N3 mostra coordinate", "click B1 mostra M_max", "diagramma mostra etichetta picco", "mobile element inspector full-screen"

**STOP se**: backend non espone i campi necessari (es. `internal_forces.peak_M.position_x`). In quel caso, fermati e segnala a Federico: serve un brief backend dedicato per esporre `peak_position` nelle API risultati. Non scrivere mock con dati fake.

**Commit message**:
```
feat(inspect): NodeDetail + ElementDetail in RightPanel + diagrammi N/V/M con picchi (v2.5.0-pr5 S5)

- Sostituisce NodeDialog modal con pannello laterale persistente (UX 2010 → 2026)
- Click viewport: nodo o elemento → pannello inspect contestuale
- Element panel mostra: coordinate, materiale completo, sezione completa,
  sollecitazioni con valore + posizione + norma, verifiche EC3 con UC + formula
- Diagrammi N/V/M con etichette M_max/M_min/V_max/N_max sopra/sotto curva,
  visibili di default (Paoletto P0 finding #2)
- selectionStore nuovo per state selezione viewport ↔ inspect panel
- Mobile: full-screen Element Inspector (prima cittadina, non panel ridotto)
- NodeDialog deprecato (back-compat), rimozione in v2.6
- Chiude Paoletto P0 finding #1, #2, #4
```

---

### S6 · Viewport 3D + animazioni + Command Palette espansa (3.5 giorni)

**Obiettivo**: Three.js wire-up con nuovi token + animazioni Precision + palette ≥160 voci (era task v1.5 #34).

**Three.js viewport**:
- Non cambia rendering 3D né math
- Solo: clear color del canvas → `var(--bg-viewport)` letto da `getComputedStyle()`
- Color materials default (deformata colormap, principal stresses, iso-surfaces) restano invariati ma sfondo cambia con tema light/dark
- Gizmo XYZ: ricolora (rosso/verde/cyan invece di blu in light)
- HUD overlay con classi `.vp-grid`, `.vp-gizmo`, `.vp-scale`, `.vp-legend` come da `precision.css`

**Animazioni Precision** (vedi `react-pack/docs/e1-e2-animations.md`):
- LoadingScreen C5b: phase indicator + log streaming + progress bar, tutto wired a WS reale del solver (già esiste)
- CommandPalette E2: entrance scale 0.95→1, opacity 0→1, 200ms; items stagger fade-in 60ms
- Onboarding E1: spotlight overlay + tour card, prima step funzionante (rest in v2.5.1)
- Tutte le animazioni rispettano `@media (prefers-reduced-motion: reduce)` (aggiungi se non c'è già)

**Command Palette espansa ≥160 voci** (era task v1.5 #34, mai chiuso):
- Voci statiche già nel codebase + voci dinamiche generate da store
- 7 categorie come da brief v1.5: apply-material (~12), apply-section (~22 da catalogo IPE/HEA/HEB ora completo a 90 profili!), wizard openers (~8), view toggles (~10), climate loads presets (~15), quick export (~6), quick run + navigation + help docs (~50)
- Totale realistico: ~120-160 voci ora che il catalogo è 90 profili

**Test S6**:
- Apri viewport in Studio Pro → confronta con `handoff/screens/B1-studio-pro-workspace.html` per HUD overlay
- Esegui un'analisi → loading screen C5b visibile con log streaming reali
- `⌘K` → palette si apre con animazione, header dice "Cerca tra ~140 comandi…" o simile
- Cerca "ipe 300" → trova "Applica sezione IPE 300"
- Cerca "vento roma" → trova "Applica vento · Roma centro · classe IV"

---

### S7 · Mobile/Tablet + E2E + Polish finale (4 giorni)

**Obiettivo**: D1, D2, edge cases, suite E2E completa, quality gate finale.

**Schermate mobile**:
- **D1 Mobile workspace** (`handoff/screens/D1-mobile-workspace.html`): bottom tabbar (Modello, Make, Solve, Risultati, Altro). Mobile bottom tabbar è già implementata (visibile nelle screenshot bug Federico), solo da ri-stilare con tokens Precision
- **D2 Tablet workspace** (`handoff/screens/D2-tablet-workspace.html`): LeftRail compatta 56px (solo icone), RightRail nascosta dietro toggle

**Suite E2E** (richiesta esplicita di Federico: "ogni funzione deve avere il suo path UI raggiungibile"):
- `frontend/src/test/e2e/discoverability.spec.ts` con asserzioni "ogni feature dichiarata ha un path UI":
  - assert: si arriva a "Applica materiale" via UI navigation (Make panel → Materiali → grid)
  - assert: si arriva a "Esegui analisi non lineare" via UI navigation (Solve panel → Non-lin tab → form)
  - assert: si arriva a "Visualizza iso-surface" via UI navigation (Results panel → Iso 3D tab)
  - assert: si arriva a "Cambia tema" via UI navigation (Avatar dropdown → Tema → Light/Dark/Sistema)
  - assert: si arriva a "Esporta PDF report" via UI navigation (Tools panel → Esporta → PDF)
  - ...una asserzione per ogni "Hub" o "Pannello" dichiarato nel design
- Tutte queste **devono essere green**. Se una fallisce → bug di discoverability → fix in S7

**Polish finale**:
- Edge cases non disegnati nel bundle: offline banner (vedi `implementation.md` §5.2), conflict dialog, sync indicator in StatusBar (per WebSocket disconnesso)
- Toast notifications (vedi `implementation.md` §5.1)
- Tooltip pattern (vedi `implementation.md` §5.3)

**Quality gate finale obbligatorio prima del tag v2.5.0**:
- ✅ Lighthouse mobile + desktop su Dashboard A1 e Workspace B1: perf > 80 ciascuno
- ✅ Bundle main chunk gzip: < 400 kB
- ✅ axe-core o equivalente: 0 violations serious/critical
- ✅ vitest: 584+ PASS (nuovi snapshot)
- ✅ pytest: **1675 PASS, 2 FAIL pre-esistenti invariati** (no regressione backend)
- ✅ E2E suite: tutte green incluse le nuove discoverability asserzioni
- ✅ Visual diff manuale di tutti i 17 screen bundle vs build live
- ✅ Test su 3 viewport: 390px (mobile), 834px (tablet), 1440px (desktop)
- ✅ Test su 2 temi: light + dark, switch fluido

**README cleanup**:
- Rimuovi la sezione "non per progetti reali fino a v2.4.x" da README principale
- Aggiungi sezione "Production-ready" con badge `v2.5.0`
- Aggiorna screenshot e gif demo nel README con le nuove UI

**Tag finale**:
```bash
git checkout test && git pull --ff-only origin test
git tag -a v2.5.0-redesign-precision -m "v2.5.0 · Redesign Precision · production-ready"
git tag -a v2.5.0 -m "v2.5.0 · Production-ready release"
git push origin v2.5.0-redesign-precision v2.5.0
```

---

## 6 · PROJECT_STATE update (ultimo task di S7)

Aggiorna `docs/PROJECT_STATE.md` con:
- Ultimo aggiornamento: data
- Versione corrente: `v2.5.0-redesign-precision`
- Ultimo SHA: nuovo SHA post-merge
- Sezione "Sprint chiusi recenti": aggiungi 7 righe per S1..S7
- Sezione "Bug chiusi": muovi BUG-V1..V4 da "pipeline" a "chiusi"
- Sezione "Bug noti aperti": rimuovi P0 Paoletto #1, #2, #3, #4 (chiusi in S5)
- Sezione "Cataloghi attuali": resta come v2.4.8.x
- Sezione "Prossimo passo raccomandato": pulizia task v1.5 residui o nuove feature
- Sezione "Baseline test": pytest 1675 PASS invariato, vitest 584+ PASS, E2E suite nuova
- **Messaggio finale** a Federico: "Ricorda di sostituire PROJECT_STATE.md nel project knowledge UI con la nuova versione."

---

## 7 · Modifiche extra-scope sotto Policy C (sezione di report)

Se durante uno qualsiasi degli sprint Claude Code trova bug UI minori non in scope (refusi, console errors, label sbagliate, ARIA mancante), può fixarli sotto Policy C v2. **Sempre documentati** nel report finale di sprint dentro una sezione dedicata:

```markdown
## Modifiche UI extra-scope (Policy C)

Durante questo sprint sono stati fixati i seguenti bug UI minori non
in scope del brief originale:

- `frontend/src/components/dialogs/UnitsLabel.tsx:23` — refuso "Metri" → "metri"
- `frontend/src/components/viewport/Viewport3D.tsx:156` — try/catch su error console
- `frontend/src/components/topbar/RunButton.tsx:89` — tooltip mancante

Razionale: tutti bug pre-esistenti che sarebbero rimasti nel deploy
fino a v2.6. Fix sicuro, non in collisione col redesign.
```

**Vietato sotto Policy C**:
- Refactor architetturale (es. rifare `ModelDialog.tsx` da 800 a 200 righe)
- Cambi al design system fuori dai token Precision
- Riorganizzazione struttura cartelle
- Introduzione librerie UI nuove
- Cambi al routing o store architetturali

---

## 8 · STOP rules e quando fermarsi

Claude Code DEVE fermarsi e chiedere a Federico in questi casi:

1. **Regressione test**: pytest FAIL aumenta sopra baseline 2, vitest perde test, tsc errori > 0
2. **Diff inatteso**: file modificati fuori scope del brief E fuori da Policy C
3. **Conflitto git su pull --ff-only**: qualcuno ha pushato sul branch
4. **Tempo task > 2× stima**: documenta blocco, chiedi se ridimensionare
5. **Scopre bug serio non in scope**: documenta nel report, non improvvisare fix
6. **Decisione tecnica con > 1 opzione legittima**: scegli safe e documenta nel report, OPPURE chiedi se ti senti incerto
7. **Atom mancante** che il react-pack del bundle assume esistente: controlla `frontend/src/components/ui/index.ts`, se davvero non c'è chiedi
8. **Tre.js wire-up rompe rendering**: rollback e chiedi
9. **WebSocket loading screen non aggiorna**: regressione backend possibile, chiedi
10. **Backend espone schema incompatibile** con quanto serve a S5 (es. manca `peak_position` su `InternalForces`): brief backend dedicato necessario, fermati
11. **Snapshot test rivelano cambi DOM strutturali** non intenzionali (perdita ARIA, ruoli cambiati): non accettare l'update con `vitest -u`, investiga

Mai abbandonare lavoro a metà: in caso di STOP, commit di salvataggio sullo stato corrente con messaggio chiaro `wip(stop): <motivo>`, NON push, NON merge.

---

## 9 · Test E2E custom da scrivere (sezione discoverability)

Lista non esaustiva di asserzioni che la suite E2E deve coprire alla fine di S7 (richiesta esplicita di Federico: "testa ogni cosa possibile con live preview browser, ogni funzione deve avere path UI"):

**Discoverability assertions (uno per feature/hub dichiarato):**
1. Da A1 Dashboard, hub "Studio Pro" → click → B1 workspace caricato con modello vuoto pronto
2. Da A1 Dashboard, hub "Percorsi" → click → C1 galleria
3. Da B1 workspace, click su Make panel → si apre Make hub con tabs (Geometria, Mesh, Carichi, Vincoli, Materiali, Sezioni)
4. Da B1 workspace, click su nodo nel viewport → RightPanel Inspect mostra NodeDetail
5. Da B1 workspace, click su elemento → RightPanel Inspect mostra ElementDetail
6. Da B1 workspace, Run button → si apre Solve panel con tabs (Statica, Modale, Buckling, ...)
7. Da B1 workspace, panel Solve → "Esegui statica" → progress visibile + transizione a Results panel
8. Da Results panel, click "Iso 3D" tab → IsosurfacePanel attivo
9. Da Results panel, click "Critical view" → C6 layout con InsightPanel
10. Da B3 Verify, click su check item → ChecksDetailTable mostra dettaglio per-element
11. Da TopBar, click avatar → menu con voci (Tema, Export, Account, Logout)
12. Da TopBar, click search → CommandPalette si apre
13. CommandPalette: cerca "ipe 300" → trova "Applica sezione IPE 300"
14. CommandPalette: cerca "vento roma" → trova preset climate
15. CommandPalette: cerca "vai a nodo N5" → naviga e centra camera su N5
16. Da Tools panel, hub "Esporta" → drill-in → PDF/Excel/CSV opzioni
17. Da Tools panel, hub "Validazione" → drill-in → NAFEMS benchmark
18. Mobile (390px): tabbar bottom MODELLO / MAKE / SOLVE / RISULTATI / ALTRO tutti cliccabili, ognuno apre panel full-screen
19. Mobile: tap su elemento → Element Inspector full-screen (non panel ridotto)
20. Tema switch light → dark → switch fluido senza flash, persisted in localStorage

Ogni asserzione che fallisce in S7 = bug di discoverability bloccante. Federico deve sapere quante asserzioni passano vs falliscono prima del tag v2.5.0.

---

## 10 · Risposte alle domande di S0 che probabilmente farai

**Q: Trovo `colors_and_type.css` ma il bundle dice `tokens.css`. Quale uso?**
A: Il file storico nel repo è `colors_and_type.css` (path probabile `frontend/src/colors_and_type.css` o `frontend/src/index.css`). Il bundle ha portato il nuovo file come `handoff/tokens.css`. **Sostituisci**: rinomina/sovrascrivi il file esistente con il contenuto di `tokens.css`. La nomenclatura tecnica in import (`@import` da CSS reset) resta uguale.

**Q: Tailwind config esistente ha già `theme.extend.colors`. Cosa faccio?**
A: **Merge, non sovrascrivere**. Apri il file `tailwind.config.js` esistente, e dentro `theme.extend` aggiungi le chiavi dal `tailwind.config.snippet.js`. Se ci sono collisioni di nome (es. esistente `bg: '#1F1F22'` vs nuovo `bg: rgbVar('--c-bg')`), **mantieni quello del bundle** (vince il nuovo). Documenta le chiavi rimpiazzate in `docs/redesign-precision/S0_codebase_map.md` sezione "Tailwind merge collisions".

**Q: shadcn/ui è presente, lo rimuovo?**
A: **NO, mai rimuovere**. Re-stilali sostituendo le CSS vars interne (`--background` → `--bg`, `--foreground` → `--ink`, `--primary` → `--accent`) o le classi Tailwind hardcoded. Per `Dialog` shadcn: rimuovi la X di chiusura (regola brief: ESC + click backdrop).

**Q: Snapshot test esplodono al 90%, posso accettare `vitest -u` su tutti?**
A: Sì, ma **prima** valida a mano 10-15 snapshot chiave (Button variants, Badge, ModelInfoCard, TopBar, CommandPalette, Dialog). Verifica che il diff sia solo cosmetico (colore, radius, font), non strutturale (perdita ARIA, ruoli cambiati). Se uno è strutturale, fermati.

**Q: Tre.js viewport non rende come prima dopo S6, sembra diverso.**
A: Solo CSS è cambiato, non il rendering 3D. La causa più probabile è `background` color del canvas. Imposta clear color con: `renderer.setClearColor(getComputedStyle(document.documentElement).getPropertyValue('--bg-viewport').trim())`. Se il problema persiste, rollback e chiedi a Federico.

**Q: Federico mi dice "fa anche X" durante un sprint. Lo faccio?**
A: Solo se rientra in Policy C (bug minore, refuso, ARIA). Per qualsiasi feature nuova o refactor architetturale: **rispondi a Federico che lo aggiungi in un sprint dedicato successivo** (es. v2.5.1). Non espandere lo scope di uno sprint in corso, mai.

---

## 11 · Allegati al brief (nel project knowledge UI)

Sono presenti nel project knowledge / upload:
- `FEAPRO_HANDOFF.zip` (alias `FEA_Pro_Design_System__5_.zip` o `__4_.zip`, identici)
- `react-pack.zip` (alias `FEA_Pro_Design_System__3_.zip`)
- `assets.zip` (alias `FEA_Pro_Design_System__6_.zip` con logo SVG)
- `BUG_.jpg` + `BUG2.jpg` (screenshot mobile bug, per S2)
- `PROJECT_STATE.md` (versione 2026-05-25 mattina, v2.4.x-followup-fixes)
- `OPERATING_RULES.md` (v2, Policy C)
- `UX_REDESIGN_BRIEF.md` (vision doc 7 principi)
- `EXPORT_STATE_v1.2.md` (storico tecnico)

**`tweaks-panel.jsx` NON va integrato nel codebase**: è strumento prototyping di Claude Design, resta nel bundle handoff come riferimento.

---

## 12 · Sintesi finale per Federico (review pre-freeze)

| Aspetto | Valore |
|---|---|
| Branch lavoro | `feature/redesign-precision` da `test` |
| PR strategy | 1 PR per sprint, 7 PR totali, review esplicita Federico per ogni PR prima del merge |
| Tag finale | `v2.5.0-redesign-precision` + `v2.5.0` |
| Durata totale | 22-25 giorni Claude Code |
| Backend impact | **ZERO** modifiche backend |
| Test impact | pytest 1675 invariato, vitest 584+ (snapshot massivamente aggiornati ma cosmetic-only) |
| Bug visivi mobile | Chiusi tutti in S2 (BUG-V1, V2, V3, V4) |
| P0 Paoletto chiusi | Tutti i 4 in S5 (#1 inspector, #2 diagrammi picchi, #3 template descritti, #4 click disambiguato) — **MA S5 richiede validazione wireframe ASCII prima del codice** |
| Tema default | Light canonical, dark paritetico, auto-migrate utenti esistenti su dark |
| Mobile-first | Sì, D1 in S7 + Element Inspector full-screen mobile in S5 |
| Discoverability | E2E suite con ~20 asserzioni "ogni feature ha path UI" in S7 |
| README update | A fine S7, rimuovi disclaimer "non per progetti reali", FEA Pro production-ready |

**Federico sovrascrivi qualcosa nelle decisioni §2 (D1-D5)?** Se no, partiamo con questa scelta. Le risposte attese sono:
- D1 → confermo (b)?
- D2 → confermo (b+)?
- D3 → confermo (b)?
- D4 → confermo (c)?
- D5 → confermo (a) per S0-S2 + (b) flex da S3?

Se confermi tutto, questo brief diventa freeze. Claude Code lo riceve come prompt iniziale assieme all'allegato `FEAPRO_HANDOFF.zip`, e parte da Step 3.1 (Setup OPERATING_RULES).

— Fine brief.
