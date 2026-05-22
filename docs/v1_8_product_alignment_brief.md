# FEA Pro · v1.8 Product Alignment Sprint · Brief Claude Code

> Esegui task per task. **6 task atomici, 3-4 giorni.**
> Branch `test`. MAI force-push. MAI `--no-verify`.
> Pattern atomico per ogni task: BEFORE → modifica → AFTER → diff → QG → commit → sync → deploy → STOP.

---

## REGOLA ZERO

**Allineare il linguaggio del prodotto, non implementare feature.**

Questo sprint introduce nella UI i due assi semantici del prodotto futuro — **Studio Pro** (controllo esperto) e **Percorsi** (workflow guidati) — senza ancora implementare un singolo Percorso end-to-end (quello sarà il Demo Slice v1.9, sprint dedicato).

L'utente che apre l'app deve **capire al primo sguardo** che esistono due porte sullo stesso modello, anche se il bottone "Percorsi" mostra solo un toast `Percorsi · disponibili da v1.9`.

**Niente nuovi data-model**. Niente nuovo routing. Niente nuovi store. Solo CSS, JSX, naming, qualche componente di shell.

Se durante un task vedi qualcosa che assomiglia a "feature nuova" oltre ai placeholder, FERMA e chiedi.

---

## CONTESTO

**Stato di partenza** (verificato):
- Branch `test`, tag `v1.7.0-ui-coerence` (commit `3275079`)
- v1.8 step 0 già committato (`70c72c5`): token `--c-percorsi` (emerald) + alias Tailwind `bg.percorsi` / `ink.percorsi` / `percorsi`. Token base, non ancora usato in componenti.
- Live: https://fea-pro.fly.dev/
- 447/447 vitest verdi
- Mockup target: `docs/mockups-reference/01..08_*.png` (pacchetto v0.3)
- UI Gap Analysis: `docs/UI_GAP_ANALYSIS.md` (P0 blocking gap mappati)

**Riferimento visuale principale**: mockup `01_home_no_model_studio_pro_vs_percorsi.png` (la CTA doppia che vogliamo introdurre).

---

## SETUP (una volta sola, prima del T1)

### 1. Pre-flight gates

```bash
cd frontend
node_modules/.bin/tsc --noEmit          # 0 errori atteso
node_modules/.bin/vitest run            # 447 verdi atteso
node_modules/.bin/vite build            # success atteso
```

Se uno fallisce: FERMA, descrivi cosa è cambiato dalla baseline `70c72c5`, NON procedere.

### 2. Preview server background

```bash
cd frontend
node_modules/.bin/vite preview --port 5173 --strictPort &
sleep 2
curl -sf http://localhost:5173 > /dev/null && echo "preview OK" || (echo "preview FAILED" && exit 1)
```

### 3. Cartella output audit

```bash
mkdir -p .codex-temp
```

### 4. Capture spec già pronto

`.codex-temp/capture.spec.ts` + `.codex-temp/capture.config.ts` esistono dal sprint v1.7. Sono pronti per essere riusati con env `TASK=T1..T6 PHASE=before|after`.

---

## INDICE TASK

| # | Tema | File principali | Stima |
|---|---|---|---|
| T1 | CTA doppia Studio Pro / Percorsi su Home Dashboard | `Dashboard.tsx` | 3 h |
| T2 | Pagina/dialog placeholder "Percorsi" (apre toast `v1.9`) | `Dashboard.tsx`, eventualmente `PercorsiPlaceholder.tsx` nuovo file | 2 h |
| T3 | Mission Bar minima nella TopBar (stato modello + "Prossimo passo") | `TopBar.tsx` o `MissionBar.tsx` nuovo file | 4 h |
| T4 | Sidebar destra "Model info" always-on card (preview Studio Pro mode) | `Dashboard.tsx` (panel dx) | 3 h |
| T5 | LeftRail sezioni categoriali label-uppercase | `LeftRail.tsx` | 3 h |
| T6 | Tier badge "Pro" nello shell + edit nome modello inline | `TopBar.tsx`, `EditModelDialog.tsx` | 3 h |

**Totale**: ~18 ore = **3-4 giorni** Claude Code in pattern atomico.

---

## PATTERN OPERATIVO PER OGNI TASK (obbligatorio)

```
1. Cattura BEFORE: TASK=Tn PHASE=before node_modules/.bin/playwright test \
     --config=../.codex-temp/capture.config.ts capture.spec.ts \
     -g "01-dashboard-empty|08-palette" --reporter=line
2. Modifica SOLO i file indicati nel task
3. pnpm tsc --noEmit → 0 errori
4. pnpm test --run → tutti verdi (447 esistenti + eventuali nuovi)
5. pnpm build → success
6. Cattura AFTER: stessa spec con PHASE=after
7. Scrivi .codex-temp/diff-Tn.md con:
   - File modificati
   - Cosa è cambiato (layout/colore/comportamento)
   - Riferimento esplicito al mockup_reference o mockup_pack
   - Tokens usati (devono derivare da v1.7 T1 + v1.8 step 0)
8. Commit atomico
9. sincronizza test con tutto (git pull --ff-only + push test:test + test:main)
10. flyctl deploy --remote-only
11. curl /api/health → HTTP 200
12. STOP. Manda all'utente: link diff-Tn.md + URL produzione + 1 frase di sintesi.
    Aspetta "procedi" prima del task successivo.
```

---

## TASK T1 · CTA doppia Studio Pro / Percorsi su Home

### Diagnosi

Oggi la Home (Dashboard) mostra 4 quick action paritarie (Nuovo modello / Da template / Importa file / Esempi). Manca la **dualità Studio Pro / Percorsi** che è l'asse semantico principale del prodotto.

Mockup target: `01_home_no_model_studio_pro_vs_percorsi.png` — 2 grandi card centrali "Studio Pro" (blu solido) e "Percorsi" (verde emerald solido) sopra le quick action minori.

### Fix

In `frontend/src/components/shell/Dashboard.tsx`:

**Step 1** — sopra la sezione "Quick actions" attuale, aggiungi una nuova hero CTA section a 2 colonne:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-7 max-w-5xl mx-auto">
  {/* Studio Pro CTA (blu primary, comportamento attuale: apre New Model) */}
  <button
    type="button"
    onClick={() => window.dispatchEvent(new Event("feapro:open-new-model"))}
    data-testid="home-cta-studio-pro"
    className="text-left bg-accent text-white border border-accent-hover/30 rounded-lg p-5 shadow-pop hover:bg-accent-hover transition-colors"
  >
    <div className="text-[10px] uppercase tracking-wider font-mono opacity-80 mb-1">Modalità esperto</div>
    <div className="text-lg font-semibold mb-1">Studio Pro</div>
    <div className="text-xs opacity-90">Tutti gli strumenti, controllo completo. Per ingegneri che sanno cosa fare.</div>
  </button>

  {/* Percorsi CTA (verde emerald, placeholder T2) */}
  <button
    type="button"
    onClick={() => window.dispatchEvent(new Event("feapro:open-percorsi"))}
    data-testid="home-cta-percorsi"
    className="text-left bg-percorsi text-white border border-percorsi/30 rounded-lg p-5 shadow-pop hover:bg-percorsi/90 transition-colors"
  >
    <div className="text-[10px] uppercase tracking-wider font-mono opacity-80 mb-1">Workflow guidato</div>
    <div className="text-lg font-semibold mb-1">Percorsi</div>
    <div className="text-xs opacity-90">Step-by-step verso il risultato. Per esperti che vogliono un assistente, per principianti che vogliono imparare.</div>
  </button>
</div>
```

**Step 2** — le 4 quick action esistenti diventano "azioni secondarie" più piccole, sotto la CTA doppia (mantieni testi/testid, riduci visual weight: meno padding, label più piccola, icone meno enfatiche).

**Step 3** — Disable entrambe le CTA quando `modelsUnavailable === true` (banner backend offline). Stesso pattern delle quick action attuali.

**Step 4** — Aggiungi 1 test in `Dashboard.test.tsx`:

```tsx
it("mostra CTA doppia Studio Pro / Percorsi (v1.8 T1)", () => {
  render(<Dashboard models={[]} onSelect={() => {}} />, { wrapper });
  expect(screen.getByTestId("home-cta-studio-pro")).toBeInTheDocument();
  expect(screen.getByTestId("home-cta-percorsi")).toBeInTheDocument();
});
```

### Commit

```bash
git add frontend/src/components/shell/Dashboard.tsx frontend/src/components/shell/Dashboard.test.tsx
git commit -m "feat(home): CTA doppia Studio Pro / Percorsi su Dashboard (v1.8 T1)"
```

**STOP**, sync, deploy, attendi conferma.

---

## TASK T2 · Placeholder Percorsi (toast `v1.9`)

### Obiettivo

Il click su "Percorsi" CTA aperto in T1 deve produrre **feedback visivo immediato** ma non bloccante. La feature non esiste — l'utente lo capisce subito.

### Fix

In `App.tsx` aggiungi listener per `feapro:open-percorsi`:

```tsx
useEffect(() => {
  const handler = () => {
    import("./store/toastStore").then(({ toast }) => {
      toast("info", "Percorsi · disponibili da v1.9 (Demo Slice 'Verifica telaio 2D')", 5000);
    });
  };
  window.addEventListener("feapro:open-percorsi", handler);
  return () => window.removeEventListener("feapro:open-percorsi", handler);
}, []);
```

In alternativa più "ricca": un mini-dialog placeholder con icona Sparkles + descrizione + bottone "Iscriviti alla beta" → apri mailto: o link esterno. Stima +1h. Lascia decidere all'utente alla fine del task T2 (annota le 2 opzioni nel `diff-T2.md`).

### Commit

```bash
git add frontend/src/App.tsx
git commit -m "feat(home): placeholder Percorsi → toast 'disponibili da v1.9' (v1.8 T2)"
```

---

## TASK T3 · Mission Bar minima nella TopBar

### Obiettivo

Sotto la TopBar (o integrata in essa), una barra minima che mostra:
1. Stato del modello attivo (vuoto / WIP / risolto / verificato)
2. **"Prossimo passo"** suggerito (rule-engine semplice, no AI)
3. Link "apri Studio Pro" se l'utente è in modalità Percorso (placeholder per ora)

### Implementazione minima

Nuovo componente `frontend/src/components/shell/MissionBar.tsx`:

```tsx
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";

export function MissionBar() {
  const model = useModelStore((s) => s.model);
  const staticRes = useResultsStore((s) => s.staticResults);

  // Rule engine semplice (no AI): mapping stato → prossimo passo
  let status: "empty" | "wip" | "solved" = "empty";
  let nextStep = "Crea un modello da zero o carica un template";

  if (model && !staticRes) {
    status = "wip";
    if ((model.constraints?.length ?? 0) === 0) {
      nextStep = "Aggiungi almeno un vincolo (struttura attualmente labile)";
    } else if ((model.loads?.length ?? 0) === 0) {
      nextStep = "Aggiungi almeno un carico";
    } else {
      nextStep = "Lancia l'analisi statica · Tasto F5 o ▶ Esegui";
    }
  } else if (model && staticRes) {
    status = "solved";
    nextStep = "Verifica i risultati nel pannello Inspect o esporta il report";
  }

  if (!model && status === "empty") return null; // Home gestisce empty hero

  return (
    <div className="h-8 flex-shrink-0 border-b border-border bg-bg-page/80 backdrop-blur-sm px-3 flex items-center gap-2 text-[11px]" data-testid="mission-bar">
      <span className={`px-1.5 py-0.5 rounded font-mono uppercase tracking-wider text-[9px] ${
        status === "solved" ? "bg-bg-success text-ink-success" :
        status === "wip" ? "bg-bg-warn text-ink-warn" :
        "bg-bg-gray text-ink-gray"
      }`}>
        {status}
      </span>
      <span className="text-ink-muted">Prossimo passo:</span>
      <span className="text-ink font-medium">{nextStep}</span>
    </div>
  );
}
```

In `App.tsx` montalo subito sotto `<TopBar />`, prima del viewport.

**Note**:
- Mantieni il rule engine pure-data (no chiamate API).
- Nasconde se backend offline (model = null → return null).
- Niente animazioni complesse.

### Test

`MissionBar.test.tsx` con 3 scenari (empty, wip-no-constraints, solved).

### Commit

```bash
git add frontend/src/components/shell/MissionBar.tsx frontend/src/components/shell/MissionBar.test.tsx frontend/src/App.tsx
git commit -m "feat(shell): MissionBar minima con stato modello + prossimo passo (v1.8 T3)"
```

---

## TASK T4 · Sidebar destra "Model info" card always-on (preview Studio Pro mode)

### Obiettivo

Mockup `08_studio_pro_same_model_from_percorsi.png` mostra la sidebar destra come **colonna sempre visibile** con card dense (Model info, Analysis summary, Results overview). Oggi la RightRail è slide-in con icone.

T4 introduce **solo la Model info card** come banner persistente, non l'intera sidebar. Sotto la MissionBar (T3), sopra il viewport, occupando ~280px width su desktop, nascosta su <md.

### Implementazione minima

In `App.tsx` (o `Workspace.tsx`), aggiungi un wrapper `<aside className="hidden md:block md:w-72 ...">` con dentro un `<ModelInfoCard>` (nuovo file).

```tsx
// frontend/src/components/shell/ModelInfoCard.tsx
import { useModelStore } from "../../store/modelStore";

export function ModelInfoCard() {
  const model = useModelStore((s) => s.model);
  if (!model) return null;

  return (
    <div className="border-b border-border p-3 space-y-1.5" data-testid="model-info-card">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">Model information</div>
      <div className="text-sm font-semibold text-ink">{model.name}</div>
      <div className="text-[11px] text-ink-muted">
        {model.nodes.length} nodi · {model.elements.length} elementi · {model.constraints.length} vincoli · {model.loads.length} carichi
      </div>
      <div className="text-[10px] text-ink-dim font-mono">
        {model.is_3d ? "3D" : "2D"} · {model.units}
      </div>
    </div>
  );
}
```

**Vincoli**:
- Solo desktop (`md:`+). Su mobile: nessun cambiamento, MobileTabbar invariato.
- Layout root deve adattarsi (`flex` con `w-72` fissa per la nuova sidebar quando model attivo).
- **Non rompere** layout esistente quando model = null (la sidebar non si mostra).

### Test

`ModelInfoCard.test.tsx`: render con e senza model, verifica counts.

### Commit

```bash
git add frontend/src/components/shell/ModelInfoCard.tsx frontend/src/components/shell/ModelInfoCard.test.tsx frontend/src/App.tsx
git commit -m "feat(shell): ModelInfoCard always-on sidebar destra preview (v1.8 T4)"
```

---

## TASK T5 · LeftRail sezioni categoriali label-uppercase

### Obiettivo

Mockup 01/08 mostrano la LeftRail organizzata per sezioni:
```
WORKSPACES (Home / Models / History)
MAKE (Geometry / Mesh / Loads / Supports / Connections)
ANALYSIS SETUP / SOLVE
RESULTS (Inspect / Checks / Reports)
TEMPLATES
EXAMPLES
DOCUMENTATION
RELEASE NOTES
```

Oggi è una lista piatta di 3-4 icone. T5 riorganizza in sezioni con label uppercase (collassabili in futuro, per ora statiche).

### Fix

In `frontend/src/components/shell/LeftRail.tsx`, raggruppa le voci in sezioni:

```tsx
const SECTIONS: { label: string; items: RailItem[] }[] = [
  { label: "WORKSPACES", items: [/* Home */] },
  { label: "MAKE", items: [makeItem] },
  { label: "ANALYSIS", items: [solveItem] },
  { label: "RESULTS", items: [verifyItem] },
  { label: "DOCUMENTATION", items: [/* helpItem */] },
];

// Render:
{SECTIONS.map((sec) => (
  <div key={sec.label}>
    <div className="text-[8px] uppercase tracking-wider text-ink-faint font-mono px-2 py-1">{sec.label}</div>
    {sec.items.map(item => <RailItem ... />)}
  </div>
))}
```

**Vincoli**:
- Mantieni esattamente gli stessi `data-testid` attuali (`left-rail-model`, `left-rail-analysis`, `left-rail-verify`) — i test smoke E2E (v1.6.1 T6) dipendono da quelli.
- Niente nuovi store/state.
- Solo cosmetic re-layout.

### Test

Aggiorna `LeftRail.test.tsx` per verificare presenza delle label di sezione (`WORKSPACES`, `MAKE`, ecc.).

### Commit

```bash
git add frontend/src/components/shell/LeftRail.tsx frontend/src/components/shell/LeftRail.test.tsx
git commit -m "feat(shell): LeftRail con sezioni categoriali label-uppercase (v1.8 T5)"
```

---

## TASK T6 · Tier badge "Pro" nello shell + edit nome modello inline

### Obiettivo

Due piccoli polish coerenti col mockup 08:
1. **Tier badge "Pro"** accanto a "FEA Pro" nel logo TopBar (verde percorsi se Pro/Studio Pro mode, grigio se Free).
2. **Edit nome modello inline**: cliccando il nome modello nel breadcrumb/HUD, diventa `<input>` editabile, submit con Enter / Esc per cancel.

### Fix

#### Tier badge

In `frontend/src/components/shell/TopBar.tsx` accanto al logo:

```tsx
<span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-percorsi/15 text-percorsi border border-percorsi/30">
  Pro
</span>
```

(Per ora hardcoded "Pro" — il tier reale viene da `useAuthStore().tier` ma può essere wire successivo.)

#### Edit nome modello inline

Componente `<ModelNameEditor>` nuovo, montato dove ora c'è il nome modello in TopBar/HUD viewport. Click → input → Enter → `modelsApi.update()`.

```tsx
// Pseudocodice
const [editing, setEditing] = useState(false);
const [value, setValue] = useState(model.name);

if (!editing) {
  return <button onClick={() => setEditing(true)}>{model.name}</button>;
}
return (
  <input
    autoFocus
    value={value}
    onChange={(e) => setValue(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") { saveName(value); setEditing(false); }
      if (e.key === "Escape") { setValue(model.name); setEditing(false); }
    }}
    onBlur={() => setEditing(false)}
  />
);
```

### Test

- TopBar render: tier badge visibile.
- ModelNameEditor: click → edit mode, Enter → save call, Esc → cancel.

### Commit

```bash
git add frontend/src/components/shell/TopBar.tsx frontend/src/components/shell/ModelNameEditor.tsx [test files]
git commit -m "feat(shell): tier badge Pro + edit nome modello inline (v1.8 T6)"
```

**STOP finale** — closure.

---

## QUALITY GATES PER OGNI TASK

Identici a v1.7:

```bash
cd frontend
node_modules/.bin/tsc --noEmit    # 0 errori
node_modules/.bin/vitest run      # tutti verdi (447 baseline + nuovi)
node_modules/.bin/vite build      # success
```

Niente regressioni. Se un test esistente fallisce: FERMA e descrivi.

---

## QUALITY GATES FINALI (dopo T6)

```bash
cd frontend
pnpm install               # opzionale, lockfile uguale
pnpm tsc --noEmit          # 0 errori
pnpm test --run            # tutti verdi
pnpm build                 # success
pnpm exec playwright test  # smoke E2E v1.6.1 ancora verdi
```

Backend invariato — niente da fare lì.

---

## OUTPUT FINALE

`docs/v1_8_product_alignment_report.md`:

```markdown
# FEA Pro v1.8.0 · Product Alignment · Report

## Sintesi
[3-4 frasi: cosa è cambiato dal punto di vista utente]

## Task completati
- [x] step 0 — token --c-percorsi emerald (gia' fatto, commit 70c72c5)
- [x] T1 — CTA doppia Studio Pro / Percorsi su Home
- [x] T2 — Placeholder Percorsi toast v1.9
- [x] T3 — Mission Bar minima
- [x] T4 — ModelInfoCard sidebar destra always-on
- [x] T5 — LeftRail sezioni categoriali
- [x] T6 — Tier badge Pro + edit nome inline

## Quality gates
[tsc/vitest/build counts]

## Effetti visivi
[lista cosa vede ora l'utente che prima non vedeva]

## Cosa NON è ancora implementato (atteso v1.9)
- Percorsi end-to-end (Demo Slice "Verifica telaio 2D")
- GPS Strutturale (rule engine criticità)
- Trust Layer report
- Compute profiles cards

## Prossima milestone
**v1.9 — Demo Slice "Verifica telaio 2D"**: implementare end-to-end UN
percorso completo (mockup 02-07). Sprint da ~6-10 settimane.
```

Poi tag:

```bash
git tag -a v1.8.0-product-alignment -m "v1.8.0 — Product Alignment Sprint"
git push origin v1.8.0-product-alignment
```

---

## REGOLE ASSOLUTE

- Branch `test`. MAI force-push. MAI `--no-verify`.
- Tokens da v1.7 T1 + v1.8 step 0 — niente nuovi tokens.
- NIENTE backend modifiche.
- NIENTE viewport 3D rendering modifiche.
- NIENTE refactor store/router/types (eccetto micro-fix se inevitabili, da motivare nel diff).
- NIENTE feature complete: Percorsi resta placeholder, GPS resta non-implementato, Trust Layer resta non-implementato.
- Pannelli laterali Make/Solve/Verify/Inspect/Tools/View: NON toccarli.
- Componenti viewport (Viewport3D, EngineNodeRenderer, ecc.): NON toccarli.

---

## SE TI BLOCCHI

NON improvvisare. FERMA. Descrivi:
- Task T<n>
- Trovato: [file:riga + osservazione]
- Provato: [tentativo]
- Aspetto: [comportamento atteso]
- Domanda: [opzione A o B]

Aspetta risposta esplicita.

---

**Buon lavoro. Allineamento prima dell'implementazione.**
