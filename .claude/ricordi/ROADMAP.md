# ROADMAP — fette del redesign workspace

> Vista operativa per Claude. Versioning storico granulare (v1.x → v3.x)
> sta in `/ROADMAP.md` root del repo. Qui solo le **fette del branch
> `redesign/workspace-fasi`** + cosa viene dopo.
>
> Niente SHA: si trovano con `git log --oneline redesign/workspace-fasi`.

## ✅ Chiuse

### Pre-redesign
- **v3.3.1-nafems-honest** (28/05/2026) — capitolo NAFEMS LE1/LE10
  chiuso con tolleranze ufficiali + criterio topologico. 28 PASS + 4
  xfailed onesti (registrano locking 16×16). Vedi ADR 001.

### Branch `redesign/workspace-fasi`

| Fetta | Cosa | Output |
|---|---|---|
| **Fetta 0** | Focus mode dentro Shell custom (Soft v2.1). Su desktop con modello attivo il focus mode non cade più sul chrome legacy. | Shell con `data-shell-focus`, viewport pieno, X di uscita |
| **Fetta 1** | Spina 3 fasi `Costruisci / Esegui / Risultati` additiva sopra il guscio, con stato `done/stale` + affordance click. | `ShellPhaseStepper.tsx`, store `currentPhase` |
| **Fetta 2a** | Fase Risultati — guscio 3 schede (Sintesi / Dati / Verifiche) + striscia verdetto. | `Results{TabsPanel,VerdictStrip}.tsx` |
| **Fetta 2b** | 4 famiglie del workspace Risultati: strip onesta + rilevatore sospetto (warn ambra), Sintesi metriche aggregate, Dati sollecitazioni + reazioni, Verifiche EC3 in chiaro + n/a. | `ResultsSintesi/DatiSollecitazioni/DatiReazioni/Verifiche.tsx` + helper `resultsHonest.ts` |
| **Fetta 2c** | Toast "Analisi completata → Risultati" non invasivo + intent store HMR-safe (rimpiazza window listener fantasma). | `lib/analysisCompleteToast.ts`, `store/shellIntentStore.ts` |
| **Fetta 2d** | FIX A export CSV feedback (era silent click), FIX B equilibrio neutro su distribuiti (era falsa-rossa Δ ✗). | Patch a Verifiche + Dati Reazioni |
| **Fetta 2-tests** | 6 Playwright E2E protezione regressioni 2b/2c/2d: CTA cambia phase (anti-HMR), silent update, TTL autodismiss, badge Validato vs Stima, Δ equilibrio neutro, export CSV toast. | `e2e/results-workspace.spec.ts` + webServer config |
| **Fetta E0-fix** (3 commit) | Foundation alignment Soft v2.1: pulizia `tokens.ts` stale Precision v2.0 + dedupe fonts + JBM 700; default radius Soft md + rimozione ghost block + doc `--c-*` alpha binary; Button.tsx migrato a Soft v2.1. | Adozione Foundation: ~55% → ~95% |
| **Fetta E2-IA · Commit E2.1** | Topbar IA prototipo v3 ADDITIVA: 3 icone fisse Home/Modelli/Jobs accanto al brand + 2 toggle Albero/Focus prima della ⌘K palette + AvatarMenu esteso con gruppo Cronologia/Template/Docs. | `ShellTopBar.tsx`, `AvatarMenu.tsx`, `GlobalRoutingListeners.tsx`, `App.tsx`, `shell.css`. Vitest 991/991, Playwright 6/6 |
| **Fetta D0** | Bootstrap `.claude/ricordi/` cross-progetto: 6 file (README/CONTEXT/CULTURE/ROADMAP/BACKLOG) + 3 ADR (NAFEMS-honest, Soft v2.1, IA prototipo v3) + 3 handoff Claude Code↔Claude Design. | `.claude/ricordi/**` (738+ righe markdown) |
| **Deploy live v3.4** (29/05) | Push branch redesign + fast-forward test/main + `fly deploy --remote-only`. Sito live su <https://fea-pro.fly.dev/> con 4 stati onesti + Soft v2.1 + IA prototipo v3 topbar | Image `01KSS92H2TKTEJGY17BN38CR9Z`, HTTP 200, bundle `index-DyMXagIm.js` |
| **Fetta E3 — Dashboard redesign React** (8 commit, Step E) | Implementazione fetta-per-fetta del mockup Claude Design Round 2 (Handoff 05). DashTopBar replica E2.1, Hero sobrio 3 stati, NewModelTile 1+2, RecentsCarousel + Riprendi, TemplateGallery 9 template, EmptyOnboarding stato C, QuotaBanner sticky condizionale, Settings/Billing page completa. | `frontend/src/dashboard/*` (5 nuovi componenti), `frontend/src/settings/SettingsBillingPage.tsx`, `frontend/src/styles/dashboard-soft.css` + `settings-billing.css`. Vitest 991/991, Playwright 6/6 |
| **Fetta E2-IA · Commit E2.2** | Panel DX della Shell custom in 2 stati (`open` / `closed`). Default `open` → zero regression. Quando `closed` la `ShellRightReopenTab` (32px sticky right) sostituisce ShellPanel nella terza colonna grid e permette di riaprirlo. Bottone X aggiunto nell'header `sp-head-row` accanto al `?` help per chiudere. Nuovo `rightPanelStore` Zustand persisted. Focus mode + takeover restano prioritari. | `frontend/src/store/rightPanelStore.ts(+test)`, `frontend/src/shell/ShellRightReopenTab.tsx(+test)`, edit `Shell.tsx`/`ShellPanel.tsx`/`shell.css` + estensione test esistenti. Vitest 1012/1012 (+21), TypeScript silenzioso |
| **Fetta E2-IA · Commit E2.4** | Panel SX "Albero modello" con gerarchia del modello caricato. Default `closed` → grid `.shell-mid` resta 3-col (zero regression). Quando `open` il `ShellLeftTreePanel` (240px) viene inserito tra Rail e Viewport come 2a colonna; mostra 5 sezioni (Nodi/Elementi/Materiali/Vincoli/Carichi) con count tabular-nums letti read-only da `modelStore`. Empty state quando `model === null`. Cablato al toggle Albero della topbar (E2.1 placeholder → ora store reale). Nuovo `leftTreeStore` Zustand persisted. Focus mode + takeover restano prioritari (`isLeftTreeVisible` boolean condivide la stessa logica tra rendering JSX e data-attribute CSS). | `frontend/src/store/leftTreeStore.ts(+test)`, `frontend/src/shell/ShellLeftTreePanel.tsx(+test)`, edit `Shell.tsx`/`ShellTopBar.tsx`/`shell.css` + estensione `Shell.test.tsx`/`ShellTopBar.test.tsx`. Vitest 1033/1033 (+21), TypeScript silenzioso |

### Fetta D0 (questa)
- **D0 — Memoria di progetto** (29/05/2026) — Bootstrap `.claude/ricordi/`
  cross-progetto. README + CONTEXT + CULTURE + ROADMAP + BACKLOG + 3 ADR.
  Niente codice toccato, baseline test invariata.

## 🟡 In corso

### Fetta E2-IA (5 commit totali) — in pausa post-E3
Adottare l'IA del prototipo v3 dentro Soft v2.1 (opzione B + (c) mix
gerarchizzato — vedi ADR 003). E2.1 chiuso, E2.2-E2.5 in attesa.

- [x] **E2.1** Topbar 3 icone + menu profilo + toggle Albero/Focus (commit `4f9e0a8`)
- [x] **E2.2** Panel DX stato "closed" + reopen tab verticale destra (commit `912e285`)
- [ ] **E2.3** Panel DX stato "inspector" contestuale (selezione bidirezionale)
- [x] **E2.4** Albero modello in panel SX collassato di default (commit `1415f03`)
- [ ] **E2.5** Rail SX eliminazione + verifica accorpamento voci (residue route mancanti `/modelli`, `/jobs`, `/cronologia`, `/docs`)

### Fetta E3 — Dashboard redesign React (CHIUSA 29/05, 8 commit)

Implementazione fetta-per-fetta del mockup Claude Design Round 2.
Pattern stabilito: commit atomico per fetta, baseline verde sempre,
DashTopBar prima (golden reference live = ShellTopBar E2.1).

- [x] **E3.1** DashTopBar replica ShellTopBar (commit `2a9dd0b`)
- [x] **E3.2** DashHero sobrio + 3 stati A/B/C (commit `56a2cbb`)
- [x] **E3.3** NewModelTile 1+2 (1 CTA primaria + 2 link sobri, commit `d59add1`)
- [x] **E3.4** RecentsCarousel + Riprendi (commit `5e42434`)
- [x] **E3.5** TemplateGallery 9 template prominenti (commit `90fc934`)
- [x] **E3.6** EmptyOnboarding stato C (commit `d4641f6`)
- [x] **E3.7** QuotaBanner sticky stato B (commit `711a46e`)
- [x] **E3.8** SettingsBillingPage `/settings/billing` (commit `8a46e96`)

**Dettagli completi**: vedi `handoffs/06-step-E-complete.md` per
sintesi tecnica + cosa è successo + stato repo + TODO non bloccanti.

## 🔵 Prossime

### Sequenza dopo E2-IA

| Fetta | Cosa | Stato spec |
|---|---|---|
| **F1** | Toolbar viste viewport (3D iso / piano / fronte / lato, presets utili) | Brief da decidere |
| **F2** | Selezione bidirezionale viewport ↔ albero ↔ inspector | Brief da decidere |
| **F3** | Tab Reazioni completa (oggi colonne tagliate a dx — vedi BACKLOG Tier-2-A) | Brief da decidere |
| **Mezza-fetta UI toggle** | Toggle utente per `radius` (soft/sharp), `accent` (cyan/altro?), `density` (compatto/normale). Già esiste l'opt-in `data-radius="sharp"` da DESIGN_HANDOFF §1.3, va esposto come UI control. | Brief da decidere |

### Più avanti (visione, non commitment)

- **E3** UI primitives da rifare (vedi BACKLOG `## UI primitives E3`).
- Estensione Workspace Costruisci (MakePanel) e Esegui (SolvePanel) con la
  stessa filosofia 4-stati-onesti del workspace Risultati.
- Validazione strutturale: chiudere LE1 anti-convergenza mesh fine
  (centroide stress recovery) + shear locking Q4 (sospetto, da verificare).

## Convention di chiusura fetta

Una fetta è chiusa solo quando **tutti questi** sono veri:
1. Commit atomico (un solo commit per fetta).
2. Vitest e Playwright restano al contatore precedente (o aumentano).
3. Verifica visiva live: server avviati, login, screenshot della
   feature che dimostra il comportamento.
4. Federico approva e dice "ok" — niente unilateralità.
