# Handoff 07 — Starter pack Fetta E2.2 · Panel DX closed + reopen tab

> Scritto 29/05/2026 pomeriggio da Claude Code (la versione che si sta
> per compattare) come "starter-pack" per il prossimo Claude Code.
> Federico ti dirà "vai E2.2" — questo file ti dice esattamente cosa fare.

## Contesto rapidissimo

Sei un Claude Code nuovo. Federico ti ha passato i ricordi. Stai
riprendendo la **Fetta E2-IA** del prototipo v3 (vedi `ROADMAP.md` e
`decisioni/003-ia-prototipo-v3.md`).

Stato fette E2-IA:
- ✅ E2.1 — Topbar IA (chiusa, commit `4f9e0a8`)
- ⏳ **E2.2 — Panel DX stato "closed" + reopen tab** ← TUO TURNO
- ⏳ E2.3 — Panel DX stato "inspector" contestuale
- ⏳ E2.4 — Albero modello collassabile
- ⏳ E2.5 — Rail SX eliminazione + 4 route mancanti

## Cosa devi fare in E2.2

### Obiettivo

Implementare i 2 stati base del panel DX della Shell custom (workspace,
non Dashboard):

1. **`closed`** — panel chiuso, ma con una **tab verticale destra**
   sempre visibile che permette di riaprirlo. Non sparisce del tutto.
2. **`reopen-tab`** — la tab verticale stessa, larga ~28-32px, full
   height, sticky right. Clicca → panel si apre. Mostra eventuali
   indicatori (es. "1 selezione" o "Risultati pronti").

Il terzo stato (`inspector` contestuale) è E2.3, NON in questa fetta.

### Riferimento mockup

Vedi prototipo v3 caricato da Federico (HTML hi-fi). Se non l'hai, chiedi
a Federico di rilanciartelo come allegato. È quello da cui sono nate le
3 decisioni IA dell'ADR 003.

### Stato attuale del codice (29/05 pomeriggio)

- `frontend/src/shell/Shell.tsx` ha il container shell custom (Soft v2.1).
- `frontend/src/components/shell/RightRail.tsx` + `RightSlidePanel.tsx`
  gestiscono già un panel destro slide-in (alpha.22). Va verificato se
  riusare o sostituire.
- `frontend/src/store/rightRailStore.ts` (Zustand) gestisce lo stato
  `openSection` e `close()`. Probabilmente lo schema va esteso a 3 stati
  (`closed | reopen-tab | inspector`).

### Vincoli hard (eredità del patto)

- **Una fetta = un commit atomico**.
- **Baseline test verde**: Vitest 991/991 (potresti aggiungerne se tocchi
  stato store). Playwright 6/6 (`results-workspace.spec.ts`).
- **Verifica live obbligatoria**: server up, login, screenshot, mostra a
  Federico.
- **Niente push senza ordine esplicito**.
- **Mai toccare** il workspace Risultati (2b/2c/2d), il solver, lo store
  di dominio, `useAnalysis`, viewport engine.
- **Filosofia 🤍 sempre**: niente bugie visive, no marketing.

### Test credentials

```
email:    federico@feapro-qa.com
password: Verifica2026!
```

## Suggerimento di approccio (ma decidi tu)

### 1. Ricognizione

Prima di toccare codice, leggi:
- `Shell.tsx` (struttura grid topbar/mid/statusbar)
- `RightRail.tsx` + `RightSlidePanel.tsx` (panel destro attuale)
- `rightRailStore.ts` (stato attuale)
- `ShellTopBar.tsx` (per capire pattern componenti adottato in E2.1)

### 2. Decisioni di scope

Decidi e dichiara a Federico:
- Riusi `RightSlidePanel` o ne fai uno nuovo?
- Estendi `rightRailStore` con `state: 'closed' | 'reopen-tab' | 'inspector'`?
- Tab verticale come componente nuovo `RightReopenTab.tsx`?

### 3. Implementazione

Pattern stabilito in E2.1 e Step E (rispettalo):
- Componente isolato in file nuovo
- Stili in CSS scope con classe radice (es. `.shell .right-reopen-tab`)
- Convention: data-testid per ogni elemento navigabile
- Usa lucide-react per icone stroke 1.8

### 4. Verifica

- Vitest verde
- Playwright verde
- Screenshot live (apri modello, panel destro chiuso vs reopen tab)

### 5. Commit + checkpoint

Commit message format come quelli di stamattina:
```
feat(shell): Panel DX 2 stati closed + reopen tab (Fetta E2.2)
```

## Cosa NON fare in E2.2

- Lo **stato inspector contestuale** (selezione bidirezionale viewport ↔
  panel) → quello è E2.3, separato.
- Refactor profondi di `RightRail.tsx` o `Shell.tsx` se non strettamente
  necessari (pattern "additivo prima, sottrattivo dopo").
- Rifare lo schema dello store senza prima parlare a Federico.

## Quando finisci

Aggiorna `ROADMAP.md` ricordi:
- Sposta E2.2 da pending a chiuso, aggiungi SHA del commit
- Aggiungi voce "Fetta E2.2 · Panel DX closed + reopen tab" nella sezione
  Chiuse della tabella commit recenti

E aggiorna `handoffs/07-...` se vuoi marcarlo "consumed" (rinomina o
aggiungi sezione "Status: consumato in commit XYZ").

## Saluto

Buon lavoro col tuo Federico. Lui guida benissimo — ascoltalo, fai
domande quando c'è ambiguità, e quando non sei sicuro fermati e chiedi.
Pattern "fermati e segnala" (vedi `CULTURE.md`).

🤍 — Claude Code 29/05 pomeriggio (che ora si compatta)
