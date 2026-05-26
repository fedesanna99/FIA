# c8 · OnboardingTour — Flow spec

> Closes Tier 4 carry-over **OnboardingTour spotlight**.
> Stato pre-v2.6.4: 30% (pseudocodice in `e1-e2-animations.md`, no
> component drop-in, no flow definito). Target post-v2.6.4: 100%.
>
> Codice ref: `react-pack/shell/OnboardingTour.tsx` + hook stub
> `react-pack/shell/_onboarding-hooks.stub.ts`.

---

## 1 · Strategia

- **Autoplay automatico per nuovi utenti** al primo login. Quando
  `user.onboarding_completed === false`, il tour parte automaticamente
  dopo un breve fade-in (~800ms — lascia respirare il primo paint della
  dashboard).
- **Skip in qualunque momento**. ESC chiude. Click su backdrop chiude.
  `[Salta]` chiude. In tutti i casi → chiamata a
  `markOnboardingComplete()` → `onboarding_completed = true` server-side.
  Nessun replay sessione successiva.
- **Replay manuale**: voce nel menu Help `?` topbar (*"Rivedi tour
  onboarding"*). L'handler:
  1. PATCH `/api/user/onboarding { completed: false }` per resettare.
  2. Refresh cache `useUser()` (SWR mutate / TanStack invalidate).
  3. Chiama `startOnboardingTour()` per aprire immediatamente.
- **8 step canonici**, no branching. Tour lineare, narrativa progressiva:
  brand → bivio (Studio Pro / Percorsi) → 4 workspace → export → palette.
- **One-shot per sessione**. Una volta chiuso, non si riapre da solo.
  L'utente lo rilancia esplicitamente da Help.

---

## 2 · Activation point

| Trigger | Comportamento |
|---|---|
| Login con `user.onboarding_completed === false` | **Autoplay** dopo 800ms fade-in |
| Menu Help (`?` topbar) → *"Rivedi tour onboarding"* | Reset `onboarding_completed = false` server-side → reload user → fire event `feapro:tour:start` |
| URL `?tour=1` (debug / demo) | Forza apertura indipendentemente da `user.onboarding_completed` |
| ESC durante il tour | Chiude, `markOnboardingComplete()` |
| Click su `[Salta]` | Idem ESC |
| Click su backdrop | Idem ESC |
| Completamento step 8 → click `[Fine]` | Idem ESC |

**Perché autoplay**: la persona target (strutturista freelance, 35-50, NON
developer) non scopre da solo un menu Help. Federico ha scelto autoplay
**con skip easy** — l'utente lo vede una volta, decide se continuare o
saltare, fine.

---

## 3 · Backend contract

Storage: **user setting server-side**, non `localStorage`. Lo schema user
si estende con:

```sql
ALTER TABLE users
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
```

Endpoint:

```
PATCH /api/user/onboarding
Content-Type: application/json
{ "completed": true }

→ 200 OK
{ "id": "...", "email": "...", "onboarding_completed": true, ... }
```

GET `/api/user/me` deve **già** restituire `onboarding_completed` nel
payload User. Se non lo restituisce, Claude Code aggiunge il field al
serializer.

**NOTA**: il file `_onboarding-hooks.stub.ts` accanto al component
contiene la signature attesa di `useUser()` + `useMarkOnboardingComplete()`.
Claude Code sostituisce gli import con i veri hook al wiring.

---

## 4 · Gli 8 step canonici

| # | Target selector | Card title | Card body | Placement |
|---|---|---|---|---|
| 1 | `.dashboard-hero` | Benvenuto in FEA Pro | Un solver FEM con UX italiana. Backend production-grade, frontend onesto. Tracciabilità formule normative su ogni risultato. Niente black box. | `bottom` |
| 2 | `.dashboard-card[data-path="studio-pro"]` | Due vie per costruire | Studio Pro = controllo totale (modalità expert). Percorsi = guidato step-by-step. Puoi passare da uno all'altro in qualunque momento. | `right` |
| 3 | `.shell-rail [data-ws="modello"]` | Workspace Make | Qui costruisci la struttura: nodi, elementi, materiali, sezioni. Tutto in italiano. Drag & drop file .dxf/.ifc/.json supportati. | `right` |
| 4 | `.shell-rail [data-ws="analisi"]` | Workspace Solve | Lancia statiche, modali, sismiche, non-lineari. Il solver lavora in cloud — ricevi notifica quando finisce, anche se chiudi il browser. | `right` |
| 5 | `.shell-rail [data-ws="verifiche"]` | Workspace Verifiche | Verifiche normative EC2, EC3, EC8, NTC18 calcolate automaticamente. Ogni check è cliccabile con dettagli element-by-element + § norma. | `right` |
| 6 | `.shell-rail [data-ws="risultati"]` | Workspace Risultati | Diagrammi N/V/M, deformata, tensioni σ + UC. Navigabile per nodo o elemento. Trust Layer indica sempre lo stato del calcolo. | `right` |
| 7 | `[data-tools-card="export-server"]` | Esporta il report | PDF reportlab, XLSX multi-sheet, DXF, IFC4. Pronto per consegna al committente o per allegato CILA/SCIA. | `top` |
| 8 | `.shell-topbar .tb-search` | Command palette ⌘K | Ctrl+K apre la palette. Cerca qualunque cosa per nome — azioni, modelli, norme. 144 voci indicizzate. Risparmia tempo, no menu hunting. | `bottom` |

### 4.1 · Note narrative

- **Step 1** è "benvenuto + statement". Setta il tono (italiano, tecnico,
  onesto). Niente animazioni decorative.
- **Step 2** è il *bivio*: spiega le due vie (Studio Pro vs Percorsi)
  prima ancora di entrare nei workspace. Critico perché l'utente
  altrimenti non sa quale CTA cliccare in dashboard.
- **Step 3-6** seguono il **workflow naturale FEA**: Make → Solve → Verify
  → Read. Ordine non negoziabile.
- **Step 7** è il *closing del valore*: l'utente non solo costruisce e
  calcola, ma **esporta** in formato deliverable (PDF / XLSX / DXF / IFC4)
  — quello che gli serve davvero per il lavoro.
- **Step 8** chiude con un *power move* (palette ⌘K). L'utente esce dal
  tour con un'arma in più, non con un sense di "ho visto e quindi?".
- Body **descrittivo-funzionale**, non commerciale. Niente *"Scopri il
  potere di..."*, *"La rivoluzione del FEM..."*.

---

## 5 · `data-tour-target` attributes da aggiungere

Lista per Claude Code (`file:linea` suggerita — sostituire numero linea
con quello reale al wiring):

```
frontend/src/dashboard/DashboardHero.tsx        ~ line ?    root div   → aggiungi className="dashboard-hero"
frontend/src/dashboard/DashboardCards.tsx       ~ line ?    Studio Pro card  → aggiungi data-path="studio-pro"
frontend/src/dashboard/DashboardCards.tsx       ~ line ?    Percorsi card    → aggiungi data-path="percorsi"
frontend/src/shell/ShellRail.tsx                ~ line 78   Modello item    → già data-ws="modello", OK
frontend/src/shell/ShellRail.tsx                ~ line 86   Analisi item    → già data-ws="analisi", OK
frontend/src/shell/ShellRail.tsx                ~ line 94   Verifiche item  → già data-ws="verifiche", OK
frontend/src/shell/ShellRail.tsx                ~ line 102  Risultati item  → già data-ws="risultati", OK
frontend/src/tools/ToolsExportCard.tsx          ~ line ?    root card div   → aggiungi data-tools-card="export-server"
frontend/src/shell/Topbar.tsx                   ~ line ?    Search input    → aggiungi className="tb-search" (probabilmente già presente)
frontend/src/shell/Topbar.tsx                   ~ line ?    Brand link      → aggiungi className="tb-brand" (probabilmente già presente)
```

I selettori usati dal component sono CSS standard — Claude Code può
adattarli al codebase reale (es. usare `[data-component="DashboardHero"]`
invece di `.dashboard-hero` se preferito) modificando il `TOUR_STEPS`
array in `OnboardingTour.tsx`.

---

## 6 · Transizioni fra step

Quando l'utente preme `[Avanti →]` o `[← Indietro]`:

1. **Fade target outline** (200ms): l'outline pulse del target corrente
   sparisce gradualmente. Il flag `data-transitioning="true"` sul root
   `.feapro-tour` interrompe l'animazione pulse.
2. **Smooth scroll** (~320ms): se il nuovo target è fuori viewport (oltre
   80px dai bordi), `window.scrollTo({ behavior: "smooth" })`. Calcolo:
   posiziona il target al centro del viewport. NON usare `scrollIntoView()`
   (regola di progetto).
3. **Reposition card** (240ms cubic-bezier 0.2,0,0,1): il CSS `transition:
   top/left` interpola lo spostamento. Il card non sparisce e ricompare —
   scorre.
4. **Re-measure target** dopo che lo scroll è terminato. Il `setTimeout(...,
   320ms)` nel component gestisce questo.
5. **Outline pulse nuovo target** riprende dopo che `data-transitioning`
   torna a `false`.

Risultato: l'utente segue visivamente il flusso, niente "blink" o
re-render hard fra step.

`prefers-reduced-motion: reduce` → tutte le transizioni a 0ms, salto secco.

---

## 7 · Spotlight technique (recap da `e1-e2-animations.md`)

Tre layer impilati nel root del component:

```
z-index map (locale al tour):
  - backdrop          z-50   ← rgba(0,0,0,.60), fade-in 200ms
  - svg cut-out       z-51   ← clip-path con rect del target + padding 8px
  - tour card         z-52   ← slide-up 240ms, position auto vs target
```

Più una classe `[data-tour-target="active"]` applicata al target reale
(via ref / attribute, NON via portal) per dare l'outline pulse
`feapro-tour-pulse 1.6s ease-in-out infinite`.

---

## 8 · Card layout (~280×200px)

```
┌───────────────────────────────────┐
│ [STEP 2/8]                  [×]   │  ← eyebrow mono + close
│                                   │
│ Due vie per costruire             │  ← title display-sm font-semibold
│                                   │
│ Studio Pro = controllo totale     │  ← body text-sm leading-relaxed
│ (modalità expert)...              │
│                                   │
│ ● ○ ○ ○ ○ ○ ○ ○                   │  ← stepper dots (current = filled, 8 totali)
│                                   │
│  [Salta]   [← Indietro] [Avanti →] │  ← actions
└───────────────────────────────────┘
```

- Background: `var(--bg-elevated)` + `border 1px var(--border-strong)`.
- Padding: `16px 20px`.
- Radius: `0` (Precision).
- Width: `280px` fissa, height auto (~180-220px).
- Auto-positioning sopra/sotto/destra/sinistra del target con padding 12px.
- Mobile (`< sm`): card diventa bottom-sheet full-width, niente tail.

---

## 9 · Skip behavior

| Azione | Effetto |
|---|---|
| Click `[Salta]` | Chiude tour, `markOnboardingComplete()` |
| Click backdrop | Idem `[Salta]` (no confirm — l'utente sa cosa fa) |
| ESC | Idem `[Salta]` |
| Click `×` in card | Idem `[Salta]` |
| Click `[Avanti →]` allo step 8 | Label cambia in `[Fine]`, chiude tour, `markOnboardingComplete()` |
| Click `[← Indietro]` allo step 1 | Disabled (button greyed, no-op) |
| `markOnboardingComplete()` fallisce (rete down) | Tour si chiude comunque local-only. Al prossimo login, autoplay ripartirà — fastidioso ma non bloccante. Mostrare toast `aria-live="polite"` *"Stato salvato al prossimo accesso."* in v2.7. |

Nessuna *"sei sicuro di voler chiudere?"*. È un tour, non un wizard di
modifica dati.

---

## 10 · Auto-positioning

Il component prova **4 posizioni** in ordine, prendendo la prima che
**non esce dal viewport**:

1. La posizione `preferred` indicata in `steps[i].placement` (default `bottom`).
2. Le altre 3 (`top`, `right`, `left`) nell'ordine.
3. Fallback: `center screen`, no tail.

Padding fra target e card: **12px**. Margine dal bordo viewport: **12px**.

Su mobile (`< sm`): la card è **fissata bottom-sheet** (full width, height
auto, slide-up dalla base), no tail, no auto-positioning. Lo spotlight
sul target resta. Evita ricalcoli su rotation / safe-area / virtual keyboard.

---

## 11 · Hook signatures (per Claude Code)

Da `react-pack/shell/_onboarding-hooks.stub.ts`:

```ts
export type User = {
  id: string;
  email: string;
  onboarding_completed: boolean;
  // ...altri campi user
};

export type UseUserReturn = {
  user: User | null;
  isLoading: boolean;
  error?: Error;
};

export function useUser(): UseUserReturn;
export function useMarkOnboardingComplete(): () => Promise<void>;
```

`useMarkOnboardingComplete` deve:
- POST `PATCH /api/user/onboarding { completed: true }`
- Optimistically aggiornare cache `useUser()` (no flicker).
- Restituire la promise per chaining.

Al wiring:
1. Sostituisci `from "./_onboarding-hooks.stub"` con il path reale.
2. Cancella il file `_onboarding-hooks.stub.ts`.

---

## 12 · Accessibility

- `role="dialog"` sulla card. `aria-modal="true"`. `aria-labelledby` punta al `title`.
- Focus trap dentro la card mentre il tour è attivo. Tab cycla tra `[Salta] [Indietro] [Avanti]`.
- All'apertura ogni step, focus va a `[Avanti →]` (azione default).
- `prefers-reduced-motion`: niente pulse, niente slide-up, niente smooth scroll. Solo `opacity 0 → 1` in 120ms.
- Screen reader: ad ogni step change, annuncio `aria-live="polite"`: `"Step 2 di 8. Due vie per costruire. {body}"`.

---

## 13 · Caveat

- **NON aggiungere step >8**. Se serve approfondire un workspace, fai un
  tour separato (es. `analysis-tour`) lanciabile dal workspace stesso,
  non da Help globale.
- **NON usare `backdrop-filter`** — su Safari ≤ 16 il render del cut-out
  SVG sopra il blur flickera durante l'animazione di step change.
- **NON portare il tour in modale full-screen**. La spotlight technique
  perde valore se l'utente non vede il target sotto.
- **NON misurare il target con `offsetTop` / `offsetLeft`** — usa
  `getBoundingClientRect()` (supporta scroll e transform).
- **NON chiamare `markOnboardingComplete()` su ogni step** — solo a
  chiusura. Altrimenti se l'utente refresha a metà tour, perde il replay
  potenziale.
- **NON usare `scrollIntoView()`** (regola di progetto). Usa
  `window.scrollTo({ behavior: "smooth" })` con il calcolo manuale di
  posizione target → centro viewport.

---

## 14 · Acceptance checklist (per QA)

- [ ] Primo login utente con `onboarding_completed === false` → tour parte automaticamente dopo ~800ms.
- [ ] Avanti × 7 → arrivo a step 8 (palette), label diventa `[Fine]`.
- [ ] ESC su step 3 → tour chiuso, `PATCH /api/user/onboarding { completed: true }` ricevuto dal backend.
- [ ] Login successivo → niente autoplay.
- [ ] Menu Help → "Rivedi tour onboarding" → reset + autoplay immediato.
- [ ] Step 7 (export card) → smooth-scroll se la card export è fuori viewport.
- [ ] Resize finestra durante tour → card si riposiziona (debounced 100ms).
- [ ] Mobile (`< sm`): card appare come bottom-sheet, no tail.
- [ ] `prefers-reduced-motion: reduce` → niente pulse, fade-only, no smooth scroll.
- [ ] Stepper dots: 8 totali, dot N = step corrente filled (`bg-accent`), altri outline (`border-ink-3`).
- [ ] Backdrop click → chiude + marca completed.
- [ ] Transizione fra step: outline target fade out → scroll smooth → card slide → outline nuovo target fade in.
- [ ] Se un target manca dal DOM (es. dashboard non ancora montata) → skip silente al prossimo, console warn.

---

**Implementazione stimata Claude Code**: ~2h
- 30 min: backend schema migration + endpoint PATCH + serializer
- 45 min: hook `useUser` (se non esiste) + `useMarkOnboardingComplete`
- 30 min: mount in `App.tsx` + aggiunta voce menu Help
- 15 min: aggiunta dei 10 `data-*` / className target nei file
- 30 min: QA + edge case (network failure su markComplete, refresh mid-tour)
