# S1 · Tokens + Atoms · report

**Data**: 2026-05-24
**Sprint**: `v2.5.0-redesign-precision` · Sprint 1 di 7
**Branch**: `feature/redesign-precision`
**Tipo**: feature (frontend-only, PR1 atomica)
**Tag intermedio post-merge**: `v2.5.0-pr1-tokens-atoms`

---

## Sintesi

Allineamento sistema tokens + ridisegno polish dei 6 atoms a deviazione
non-Precision (Button, Badge, Input, IconButton, Toggle, **+ index.css** per
spacing/z-index/type scale + h1-h5 token var-based).

Scoperta chiave: il codebase post v2.4.x-followup-fixes era **già in
larga parte aligned a Precision v2.0** (rifatto da handoff REDESIGN
ARCHITETTI 2026-05-23). S1 ha fatto solo polish residuo, non rewrite
massivo come stimato dal brief.

---

## Task completati

| Task | Output | Esito |
|---|---|---|
| **S1.T1** Sostituire `index.css` con `tokens.css` | NO sostituzione (già aligned). Solo aggiunta di 3 token group mancanti (spacing, z-index, type scale) + h1-h5 var-based. | ✅ |
| **S1.T2** Merge `tailwind.config.snippet.js` | Nessuna modifica. Config già allineato a Precision (darkMode `[data-theme="dark"]`, sharp radius 0, hairline shadow, fontSize px, letterSpacing tight-N, animazioni). | ✅ |
| **S1.T3** Ridisegnare 11 atoms | **Button**, **Badge**, **Input**, **IconButton**, **Toggle** ridisegnati. **Chip**, **Kbd**, **Spinner**, **Skeleton**, **Avatar**, **FormField** già Precision-compliant — verificati, no changes. | ✅ |

---

## File toccati

| File | Tipo | Note |
|---|---|---|
| `frontend/src/index.css` | modified | +49 / -8 (3 token group nuovi + h1-h5 var-based) |
| `frontend/src/components/ui/Button.tsx` | modified | sharp radius, no shadow, run variant flat success |
| `frontend/src/components/ui/Badge.tsx` | modified | sharp (era rounded-full), font-mono uppercase, 2 nuove variant (`draft`, `ghost`) |
| `frontend/src/components/ui/Input.tsx` | modified | sharp, hairline border, focus outline (no ring), Field label uppercase mono 10px |
| `frontend/src/components/ui/IconButton.tsx` | modified | focus outline (era ring) |
| `frontend/src/components/ui/Toggle.tsx` | modified | focus outline (era ring) |
| `docs/redesign-precision/S0_codebase_map.md` | modified | aggiunta nota convenzione versioning + APP_VERSION update plan S2 |

---

## Quality gates

| Gate | Pre S1 | Post S1 |
|---|---|---|
| pytest | 1675/2 | **1675/2** ✓ invariato |
| tsc | 0 errori | **0 errori** ✓ |
| vitest | 584/584 | **584/584** ✓ — **zero snapshot aggiornati** (le edit Tailwind class non hanno cambiato DOM serializzato) |
| Vite build | OK | **OK** — index chunk gzip **372.81 kB** (< 400 kB target S7) |

---

## Comportamento BEFORE / AFTER (atoms)

### Button
- BEFORE: `bg-accent text-white shadow-sm border border-accent-hover/30 rounded-md`
- AFTER: `bg-accent text-white border border-accent` (hairline, sharp)
- Run variant: era gradient emerald multilayer shadow → ora `bg-success` flat solid (Precision)

### Badge
- BEFORE: `rounded-full` + tinted variants
- AFTER: sharp, font-mono uppercase, 2 nuove variant `draft` (Trust Layer DRAFT) + `ghost` (outlined accent)

### Input
- BEFORE: `rounded-md` + `focus:ring-2 focus:ring-accent/30`
- AFTER: sharp, `border-border-light` (lighter default), `focus:border-accent focus:outline-none` (border-only focus, no ring)

### Field label (in Input.tsx)
- BEFORE: `text-xs font-medium text-ink-3`
- AFTER: `text-[10px] font-mono font-semibold uppercase tracking-wide-1 text-ink-3` (Precision micro-label)

### IconButton, Toggle
- Solo focus: ring → outline 2px offset 1px (consistenza con Button)

---

## Tokens aggiunti a `index.css`

Erano referenziati dal `tailwind.config.js` ma non definiti nelle CSS vars:
- **Spacing scale**: `--s-px` (1px), `--s-0_5` (2px), `--s-1` (4px) → `--s-16` (64px)
- **Z-index scale**: `--z-viewport` (0) → `--z-tooltip` (60)
- **Type scale**: `--fs-xs` (11px) → `--fs-4xl` (44px) + `--lh-*` paired

h1-h5 ora usano `var(--fs-3xl)` etc. invece di `30px` etc. hardcoded.

---

## Modifiche UI extra-scope (Policy C)

Nessuna in S1. (Il bump APP_VERSION è confermato per S2 — vedi `S0_codebase_map.md` §12.)

---

## STOP rules monitoring S1

| STOP rule | Esito |
|---|---|
| tsc errori > 0 | 0 errori ✓ |
| vitest perde test | 584/584 invariati ✓ |
| Snapshot rivelano cambi DOM strutturali | **Zero snapshot rotti** — non c'è stato bisogno di update ✓ |
| Backend pytest FAIL aumenta | 1675/2 invariato ✓ |

---

## Atoms già Precision-compliant (verificati, no edits)

- **Chip** (`shell\Chip.tsx`): `border-bg-*` tone classes, sharp, font-medium 11px
- **Kbd**: `font-mono text-[10px]`, hairline border, inset shadow
- **Spinner**: Loader2 + `animate-spin text-accent`
- **Skeleton**: `animate-shimmer` + bg-bg-hover
- **Avatar**: `rounded-full` (eccezione Precision per cerchi puri), hash-based tone
- **FormField**: `font-mono text-[10px] uppercase tracking-wide-4` label

---

## Verifiche pre-merge PR1 (Federico instruction)

### 1 · Gap copertura test snapshot

I 4 atom modificati nel commit fix `c78dbed` (Dialog, Card, DropdownMenu, Tooltip in `components/ui/`) **hanno copertura snapshot diretta minima**:

- **1 test** importa direttamente uno dei 4 atom modificati:
  - `frontend/src/components/shell/ClimateContextBadge.test.tsx:7` →
    `import { TooltipProvider } from "../ui/Tooltip"`

- **Altri 8 test** che matchano i nomi sono **false positive** (testano i `dialogs/*` co-locati, non gli atom `ui/*`):
  - `shell/panels/SolvePanel.test.tsx`, `MakePanel.test.tsx`
  - `shell/topbar/TopBarParts.test.tsx`
  - `shell/RightRail.test.tsx`, `LeftRail.test.tsx`,
    `ClimateContextBadge.test.tsx`, `CommandPalette.test.tsx`
  - `layout/statusbar/StatusBarParts.test.tsx`
  - `dialogs/Dialog.test.tsx` (testa `components/dialogs/Dialog.tsx`, file
    diverso da `components/ui/Dialog.tsx`)

**Conseguenza per S2-S7**: la verifica delle modifiche a Dialog/Card/
DropdownMenu/Tooltip si basa principalmente su:
1. visual review umana di Federico (PR-by-PR)
2. test integrati indiretti (componenti che li USANO renderizzano OK)
3. DOM inspection via `preview_inspect` (più accurata di JPEG)

**Brief candidato post-redesign**: `v2.5.x-ui-atoms-snapshot-coverage` per
aggiungere test snapshot dedicati per i 11 atom in `components/ui/` (~30
test nuovi attesi). Bassa priorità, non bloccante per v2.5.0.

### 2 · Alias `percorsi` vivi (NON rimuovere ora)

`grep "var(--c-percorsi|var(--c-bg-percorsi|--percorsi|bg-percorsi|text-percorsi"`
ha trovato **4 occorrenze in 2 file** — gli alias sono ANCORA VIVI:

| File | Riga | Uso |
|---|---|---|
| `components/shell/panels/HistoryPanelContent.tsx` | 129 | `bg-percorsi/15 border-percorsi/40 text-percorsi` |
| `components/shell/panels/HistoryPanelContent.tsx` | 148 | `border border-percorsi/30 bg-percorsi/5` |
| `components/shell/TopBar.tsx` | 371 | commento `bg-bg-percorsi / text-accent (emerald, asse Percorsi)` |
| `components/shell/TopBar.tsx` | 388 | `pro: "bg-bg-percorsi text-accent border-percorsi/30"` (variant mode chip) |

**Decisione**: NON rimuovere gli alias da `index.css` né da `tailwind.config.js`.
Riproveremo la rimozione dopo aver migrato `HistoryPanelContent.tsx` (S5+
in scope inspect panel) e `TopBar.tsx` (S2 chrome) — quando entrambi
useranno direttamente `bg-accent-subtle` invece del legacy `bg-percorsi`.

Annotato dettaglio in `S0_codebase_map.md` §13 (alias legacy ancora vivi).

### 3 · Verifica precedente "REDESIGN ARCHITETTI" — contestualizzazione

**Verbale**: In `index.css` (pre-PR1) esisteva commento "rifatto dal handoff
REDESIGN ARCHITETTI.zip 2026-05-23". Era un **primo tentativo Precision
pre-questo brief v2.5.0**, eseguito in uno sprint backend precedente
(probabilmente parte del compound v2.4.x-followup-fixes o prima).

Questo spiega perché:
- I tokens `--c-*` erano già allineati a Precision (`--c-accent: 8 145 178`)
- Il `tailwind.config.js` aveva già `darkMode: [selector, '[data-theme="dark"]']`, radius 0, hairline shadow
- 51 file (`grep "Precision v2.0|REDESIGN ARCHITETTI"`) hanno commenti
  che dichiarano allineamento Precision:
  - 11 atom in `components/ui/`
  - 13 dialog files in `components/dialogs/`
  - 22+ shell files in `components/shell/`
  - `App.tsx`

**Conseguenza per S2-S7**:
- Il rischio "fork del lavoro precedente" è reale. Per ogni file con
  commento `Precision v2.0`, **verificare se il codice è davvero migrato**
  prima di darlo per fatto.
- Non fidarsi del commento come single source of truth: ispezionare
  classi Tailwind concrete vs precision.css patterns.
- Se troviamo `bg-emerald-*`, `from-*-500 to-*-600`, `rounded-md/lg/xl`,
  `shadow-md/lg`, `border-zinc-*`, `text-slate-*` in file con commento
  "Precision v2.0", è probabile che il commento sia stato aggiunto come
  promessa ma la patch non sia stata applicata in tutti i punti.

**Strategia S2-S7**: per ogni file in scope di uno sprint, lanciare un
mini-audit del tipo eseguito nel punto D di questa correzione post-review.

---

## Prossimo passo

**PR1 atomica** su `feature/redesign-precision` → review Federico → merge a `test`.

Federico:
1. Review PR sul GitHub (`feature/redesign-precision → test`)
2. Approva o richiede modifiche
3. Merge
4. Sincronizza con tutto
5. Tag `v2.5.0-pr1-tokens-atoms`
6. Claude Code ricomincia per S2 da `test` aggiornato

Se review trova divergenze cosmetiche su componenti specifici (es. ChecksRail che usa Button), saranno polish da fare in S2 (chrome navigazionale) o S3 (screens) — fuori scope S1.
