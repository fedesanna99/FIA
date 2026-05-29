# ADR 002 — Design System Soft v2.1

- **Data**: 26-28/05/2026
- **Stato**: ✅ CHIUSO
- **Commit chiave**:
  - `02bd4ea` — pulizia `tokens.ts` v2.0 stale + dedupe fonts + JBM 700
  - `3fadf14` — default radius Soft md + rimozione ghost block + doc `--c-*`
  - `b2b0bcc` — Button.tsx migrato a Soft v2.1
- **Documento maestro**: `design-handoff/DESIGN_HANDOFF.md` (gitignored,
  ma è il contratto visivo del progetto)

## Contesto

Pre-decisione: il redesign aveva attraversato due tentativi consecutivi
falliti:

- **Precision v2.0**: stile strict/severo (accent `#3DA9FC` blue,
  tipografia precedente non Plus Jakarta, radius 0/2, hairline ovunque).
  Troppo aggressivo visivamente per il pubblico italiano ingegnere
  strutturale → percepito come "tool da hacker", non come strumento
  professionale.
- **Tentativo successivo** (internamente chiamato "trapianto v2.5+
  destruttivo" dal commento nel codice — gergo nostro, non
  terminologia ufficiale): aveva introdotto inconsistenze multiple
  (Inter Tight aggiunto poi non usato, ghost color block in Tailwind
  config, due `<link>` Google Fonts ridondanti).

Foundation alignment stimato pre-fetta E0: **~75-80% adozione effettiva**
del design system dichiarato. I componenti usavano un mix di token
Precision stale + Soft v2.1 + valori inline. Il numero è una stima a
occhio sul codice, non una misura strumentale.

## Problema diagnosticato (audit E0-fix Commit 2)

Durante la diagnosi del Tailwind bridge è emerso che i token RGB-triplet
`--c-accent: 8 145 178` / `--c-ink: 21 22 26` / ecc. **non sono fossili
Precision**: sono il **binario alpha intenzionale** di Tailwind v3 (servono
per `bg-accent/50`, `text-ink/70` → Tailwind risolve `rgb(var(--c-accent) / 0.5)`).
Senza i `--c-*`, tutti i modificatori alpha si rompono silenziosamente.

→ **Strada A confermata**: tenere `--c-*` come binario alpha, NON
rimuoverli. Documentarli esplicitamente per non riaprire la discussione.
Eventuale rename `--c-* → --*-rgb` in foundation finishing (vedi
`BACKLOG.md`), ma la semantica resta.

## Decisione

### Foundation Soft v2.1

| Asse | Valore |
|---|---|
| Tono | Soft (radius non-zero, hairline border, shadow morbida) |
| Tema default | Light |
| Accent | Cyan singular `#0891B2` (light) / `#6EDDF5` (dark) |
| Triade font | Display Plus Jakarta Sans 700 + Body Inter 400/500/600/700 + Mono JetBrains Mono 500/600/700 |
| Radius scale | 4/6/8/10/12/16/20 (`--r-xs` → `--r-3xl`) |
| Radius default | `var(--r-md) = 8px` (Tailwind `borderRadius.DEFAULT`) |
| Sharp opt-in | `<html data-radius="sharp">` azzera tutti i radii |
| Numerici | Sempre Mono + `font-variant-numeric: tabular-nums` |
| Token CSS | Fonte unica `src/tokens.css`, mirror TS in `src/tokens.ts` |
| Token RGB-triplet | `--c-*` come binario alpha intenzionale Tailwind, documentati |

### Convention "vince il mockup"

Quando il codice React diverge dai mockup HTML hi-fi in
`design-handoff/`, **vince il mockup**. I file HTML sono il contratto
visivo. Cambiare il codice senza aggiornare prima il mockup è violazione.

## Conseguenze

- **Adozione Foundation Soft v2.1**: post E0-fix Commit 3 è
  **sostanzialmente completa per la foundation** (tokens, radii,
  triade font, Button.tsx). Le UI primitives residue (Input, Select,
  Tabs, Dialog, DataTable, ecc.) restano in `BACKLOG.md` per la
  Fetta E3. Niente misura strumentale del post — solo evidenza
  qualitativa che le cose stanno in piedi.
- **`Button.tsx`** è ora la primitive consolidata: tutte le variant
  hanno `rounded-md` (8px Soft), `hover:shadow-hover`, `transition-[colors,
  box-shadow,border-color]`, sharp opt-in tramite tokens. Sostituisce le
  N varianti precedenti.
- **Tailwind `borderRadius.DEFAULT`** è ora `var(--r-md)` invece di `0`.
  Tutti i `rounded` Tailwind senza modificatore (es. `<div className="rounded">`)
  prendono 8px Soft automaticamente.
- **Ghost block rimosso** (24 righe duplicate Soft in `tailwind.config.js`).
- **JetBrains Mono 700** aggiunto per allineamento `§typography handoff`
  (era 400/500/600 only).
- **`--c-*` documentati**: chi tocca i token CSS sa che NON sono fossili
  e va aggiornata la doc se cambiano.

## Cosa ha sbloccato

- **Fetta E2-IA** parte da una foundation pulita: la topbar IA prototipo
  v3 (E2.1) riusa direttamente `tb-iconbtn` con `rounded-md` Soft, niente
  override una-tantum.
- **Evidenza concreta del pattern "fermati e segnala"**: durante E0
  Commit 2 il piano di lavoro iniziale prevedeva l'abolizione dei
  `--c-*` come "fossili Precision". La verifica intermedia ha mostrato
  che avrebbero rotto tutti i modificatori alpha Tailwind (`bg-accent/50`,
  `text-ink/70`, ecc.) — e i test attuali non li coprono, quindi la
  regressione sarebbe arrivata in main invisibile. Strada A
  (mantenere `--c-*` come binario alpha documentato) è stata decisa
  prima di toccare codice. Il valore qui è la regressione **evitata**,
  non la procedura usata.
- Stabilita la convention **"contratto visivo = mockup HTML hi-fi"** —
  ogni nuova fetta riferisce un mockup specifico (es. `Nuovo Guscio.html`
  per ShellTopBar). Vincola Claude a verificare contro un riferimento
  prima di implementare libero.
- **Sharp opt-in per Precision-lovers**: l'utente che ama Precision strict
  può attivare `data-radius="sharp"` senza che dobbiamo mantenere due
  design system in parallelo. Il toggle UI verrà esposto nella
  mezza-fetta UI (vedi ROADMAP).
