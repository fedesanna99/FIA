# Make panel duplication · investigazione

> Bug report utente: "Su mobile, aprendo Make da percorsi diversi si vedono
> due UI diverse: (A) hub-card 5 card verticali, (B) tab orizzontali +
> breadcrumb. Entrambe vivono nel codice contemporaneamente."

## TL;DR

**NON è una vera duplicazione di componenti.** È **un singolo componente
`MakePanel.tsx`** che ha due modalità di rendering condizionali:

- **Modalità hub** (`isHub === true`) → 5 hub-card grandi verticali.
- **Modalità drill-in** (`isHub === false`) → tab bar orizzontale +
  breadcrumb + contenuto sub-view.

Lo switch è guidato dallo store `workspaceStore.currentLeftTab`:
- `null | undefined` → hub
- `"geometria" | "mesh" | "carichi" | "vincoli" | "io"` → drill-in

I due "percorsi diversi" che vede l'utente non sono entry-point diversi,
sono **due click consecutivi sullo stesso componente**:
1. Tap "Make" da `MobileTabbar` → vede hub.
2. Tap su una hub-card (es. "Geometria") → `setLeftTab("geometria")` →
   stesso componente, ora in modalità drill-in.

## Componente

Un solo file: **`frontend/src/shell/panels/MakePanel.tsx`**.

### Modalità hub (riga 81-98)

```tsx
if (isHub) {
  return (
    <PanelChrome side="left" title="Make" Icon={IconShape3} ...>
      <PanelHub
        cards={HUB_CARDS}              // 5 card: geometria/mesh/carichi/vincoli/io
        onSelect={(id) => setTab(id)}  // ← click card → drill-in
        testId="make-hub"
      />
    </PanelChrome>
  );
}
```

`HUB_CARDS` è definito alle righe 41-47.

### Modalità drill-in (riga 100+)

```tsx
return (
  <PanelChrome
    side="left" title="Make" Icon={IconShape3}
    tabs={TABS}                        // ← tab bar orizzontale 5 voci
    activeTab={tab}
    onTabChange={setTab}
    ...
  >
    <PanelBreadcrumb                   // ← breadcrumb sotto la tab bar
      root="Make"
      current={TAB_LABELS[tab] ?? tab}
      onBack={() => setTab(null)}
    />
    {tab === "geometria" && <ModelTree />}
    {tab === "mesh"      && <MeshDescription />}
    {/* ... */}
  </PanelChrome>
);
```

`TABS` è definito alle righe 30-36 (5 PanelTab).

### Header del componente

```tsx
const tabRaw = useWorkspaceStore((s) => s.currentLeftTab);
const isHub  = tabRaw === null || tabRaw === undefined;
const tab    = tabRaw ?? "geometria";
```

## Entry-point

Un solo punto di ingresso effettivo per ciascun device:

### Desktop
`frontend/src/components/shell/LeftSlidePanel.tsx` riga 31:
```tsx
if (openSection === "model") return <MakePanel />;
```

### Mobile
`frontend/src/App.tsx` riga 381:
```tsx
make: { title: "Make", content: <MakePanel /> },
```
Montato dentro `MobilePanel` quando `currentMobileTab === "make"`.

**Stesso componente** in entrambi i casi. Il render condizionale interno
fa la differenza, non l'entry-point.

## Perché lo stesso bug NON si verifica su InspectPanel

Nel sprint v1.7 T2 (commit `67f0539`), InspectPanel è stato riscritto
per usare **solo PanelBreadcrumb in drill-in, senza tab bar**:

```tsx
// InspectPanel.tsx in drill-in mode
return (
  <PanelChrome ... /* NO tabs prop */>
    <PanelBreadcrumb root="Inspect" current={...} onBack={...} />
    {/* contenuto */}
  </PanelChrome>
);
```

Make/Solve/Verify invece passano ancora `tabs={TABS}` a `PanelChrome` in
drill-in, **oltre** al `PanelBreadcrumb`. È **ridondanza visiva**:
l'utente vede sia la tab bar orizzontale (Geometria | Mesh | Carichi |
Vincoli | I/O) sia il breadcrumb "← Make › Geometria" sotto. Sono due
modi di dire la stessa cosa.

## File con stesso pattern misto (audit completo)

```
frontend/src/shell/panels/MakePanel.tsx       riga 106  tabs={TABS}
frontend/src/shell/panels/SolvePanel.tsx      riga 135  tabs={TABS}
frontend/src/shell/panels/VerifyPanel.tsx     riga  87  tabs={TABS}
frontend/src/shell/panels/InspectPanel.tsx    nessuna   (gia' fixato in v1.7 T2)
```

3 panel su 4 hanno la ridondanza tab+breadcrumb. Inspect è l'unico
pulito.

## Screenshot evidenza

In `.codex-temp/`:
- `make-dup-A-hub-card.png` (variante hub, 5 card grandi verticali)
- `make-dup-B-tab-legacy.png` (variante drill-in dopo click su "Geometria")

Viewport iPhone 14 Pro 390×844 @ 2x DPR. Entrambi raggiungibili nello
stesso ciclo di vita dell'app, l'uno dopo l'altro.

## Proposta di fix (per round successivo, NON in questo)

Rimuovere `tabs={TABS}` da Make/Solve/Verify in drill-in, allineandoli
al pattern Inspect. Conservare il `PanelBreadcrumb` come unico
navigation control nel drill-in.

### File da toccare (3 file, ~3 righe ognuno)

1. `frontend/src/shell/panels/MakePanel.tsx` (riga 106): rimuovere `tabs={TABS}` + `activeTab={tab}` + `onTabChange={setTab}` dal `<PanelChrome>`.
2. `frontend/src/shell/panels/SolvePanel.tsx` (riga 135): stessa cosa.
3. `frontend/src/shell/panels/VerifyPanel.tsx` (riga 87): stessa cosa.

Le costanti `TABS` locali nei 3 file diventano dead code (rimuoverle nello stesso commit). I test esistenti `MakePanel.test.tsx` riga 56 ("renders all 5 tabs") vanno aggiornati o rimossi.

### Effetto visivo atteso

- Drill-in: solo PanelBreadcrumb sticky in alto ("← Make › Geometria"), poi il contenuto sub-view.
- Navigazione tra sub-view: non più via tab bar orizzontale ma via "back to hub" → re-click su altra card. Coerente con pattern InspectPanel + mockup_reference.html sezione 03.

### Rischi

- Rimuovere la tab bar significa "1 tap in più" per switchare da Geometria a Mesh (back to hub + tap Mesh, invece di un singolo tap sulla tab Mesh). UX trade-off: meno coerenza visiva (tab bar duplica breadcrumb), ma anche meno scorciatoia per power-user.
- I 5-6 test `MakePanel.test.tsx` che si aspettano la tab bar vanno aggiornati.

### Stima sforzo

- Codice: ~30 minuti (3 file, righe minime).
- Test aggiornamento: ~1h.
- Cattura BEFORE/AFTER + report: ~30 min.
- **Totale**: ~2h per il fix completo.

## STOP

Niente è stato modificato lato `src/`. Solo report + screenshot in
`.codex-temp/`. Aspetto conferma esplicita prima di rimuovere
`tabs={TABS}` dai 3 panel.

Domanda all'utente:
- **Opzione A**: rimuovere `tabs={TABS}` da Make/Solve/Verify, allineando
  al pattern Inspect (1 navigation control: solo breadcrumb).
- **Opzione B**: mantenere lo status quo (tab + breadcrumb coesistono in
  drill-in), accettando la ridondanza visiva come "scorciatoia power-user".
- **Opzione C**: invertire — rimuovere il breadcrumb da Inspect e tenere
  la tab bar ovunque. Meno consigliato (mockup_reference sezione 03
  mostra il pattern "hub-card → drill-in con breadcrumb", senza tab bar).
