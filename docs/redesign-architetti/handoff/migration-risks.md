# FEA Pro · Migration Risks · Precision v1.9

> Cosa rompe nel codebase esistente, cosa no, e come mitigare ogni rischio.
> Leggi questo prima di toccare il primo file.

---

## Sommario rischi

| Rischio | Gravità | Mitigazione |
|---|---|---|
| Dark → Light come default | Media | Detect localStorage preferenza utente; mostra prompt al primo accesso |
| Radius azzerati ovunque | Media | Audit visual completo prima di mergiare PR1 |
| Cambio palette (blu → cyan) | Bassa | I componenti referenziano CSS vars, non hex hardcoded |
| Token shadow ridotti a hairline | Media | Componenti che si "perdono" sul bg vanno aggiunti border |
| Inter Tight come display | Bassa | Nuovo font, ma stessa stack famiglia di Inter |
| Snapshot test vitest | Alta | Aggiorna tutti, ma valida 10-15 a mano |
| Componenti shadcn/ui stilati | Media | Re-stilarli, non rimuoverli |
| Tre.js viewport dependency | Bassa | Nessun cambio API, solo styling overlay |
| Performance regression | Media | Lighthouse audit obbligatorio prima del merge |

---

## 1 · Breaking changes nel design

### 1.1 Default tema light invece di dark
**Impatto**: gli utenti esistenti che hanno aperto l'app aspettandosi dark
vedranno light. Sorpresa.

**Mitigazione**:
- Al primo boot dopo il deploy, controlla `localStorage['fea-pro-theme']`
- Se NULL e l'utente è loggato con account che ha aperto l'app prima del
  cutoff date → forza `dark` (per non sorprendere chi era già dark)
- Se NULL e nuovo utente → light (canonical)
- Mostra un piccolo banner "Abbiamo un nuovo tema light — provalo · Mantieni dark"
  per 7 giorni dopo il deploy, poi rimuovi.

### 1.2 Radius 0 ovunque
**Impatto**: ogni `rounded-lg`, `rounded-md` che usavate prima ora renderizza
con spigoli vivi. Bottoni, card, input, badge — TUTTO diventa rettangolare.

**Mitigazione**:
- È una scelta voluta (direzione Precision). Verifica visualmente che
  nessun componente sia diventato "troppo aggressivo" (es. avatar che
  diventa quadrato). Per i casi necessari, mantieni `rounded-full`.

**Casi da preservare circolari**:
- Avatar utente (TopBar) → `rounded-full` ✓
- Dot indicators (status, chip-dot) → mantieni il `border-radius: 50%` ✓
- Pulse animations → ovali ✓

### 1.3 Studio Pro e Percorsi non hanno più due colori distinti
**Impatto**: il vecchio design usava blu per Studio Pro e verde emerald
per Percorsi. Ora entrambi usano lo stesso cyan accent — la distinzione
è data dal **layout** (LeftRail vs Stepper) e dal **modechip in TopBar**.

**Mitigazione**:
- Aggiungi un Tweak/preference utente "Asse cromatico dual" che opzionalmente
  riattiva la doppia palette (se feedback richiede).
- Verifica con utenti reali che la distinzione resti chiara senza colore.

### 1.4 Shadow → hairline only
**Impatto**: dropdown, dialog, panel flottanti prima avevano shadow soft.
Ora hanno solo un 1px outline.

**Mitigazione**:
- Per i pochi casi dove lo shadow era critico per gerarchia (es. modal
  sopra contenuto denso), aggiungi un `bg` con maggior contrasto invece
  che riportare shadow.

### 1.5 Densità aumentata
**Impatto**: body baseline da 14px (era hp) → 13px / 19px lh. Tutto un po'
più stretto.

**Mitigazione**:
- Verifica WCAG: 13px è il minimo. Se qualcuno trova faticoso, aggiungi
  Tweak "comfortable mode" che bumpa a 14/20 (modifica solo `--fs-base`).

---

## 2 · Componenti che richiedono attenzione speciale

### 2.1 Componenti shadcn/ui (se presenti)
shadcn componenti tipici: `Button`, `Dialog`, `Dropdown`, `Select`, `Toast`,
`Tooltip`, `Avatar`, `Tabs`. Questi sono stilati via CSS vars.

**Cosa fare**:
- NON rimuoverli. Re-stilali sostituendo le variabili (`--background`, `--foreground`,
  `--primary`, ecc.) con le nuove (`--bg`, `--ink`, `--accent`).
- Modifica i loro `rounded-*` per renderli a 0.
- Per il `Dialog`, rimuovi la X di chiusura (regola brief: ESC + click backdrop).

### 2.2 Componenti con CSS-in-JS / Emotion / styled-components
Se ci sono componenti che usano stili inline JS (non Tailwind), questi vanno
audited uno per uno. La regex `border-radius:` cercata nel repo ti dà la lista.

### 2.3 Viewport 3D (Three.js)
**Non cambia l'implementazione 3D**. Cambia solo:
- Background color del canvas → `var(--bg-viewport)`
- Color delle linee 2D del wireframe (in modalità senza model) → `var(--ink-2)`
- Color della deformata UC → mantieni la stessa colormap blu→ciano→verde→giallo→rosso
- Gizmo XYZ: rosso/verde/cyan (era blu) per X/Z/Y

### 2.4 Command Palette (cmdk se presente)
Stilare le primitive di `cmdk` con le nuove classi `.pal-item`. Non cambia
la logica di fuzzy search.

### 2.5 LoadingScreen (C5b)
Componente nuovo. Va wired al WebSocket del solver. Il vecchio loading
probabilmente era un semplice spinner — questo è MOLTO più ricco.

---

## 3 · Test che vanno aggiornati

### 3.1 vitest snapshot
**Stima**: ~70-90% degli snapshot vanno rigenerati. Il rendering HTML
cambia per ogni componente che usa colori, radius, font, spacing.

**Strategia**:
- Esegui `vitest -u` (update all snapshots) DOPO aver verificato manualmente
  10-15 componenti chiave.
- I componenti chiave da validare a mano:
  - `Button` (tutte le variant)
  - `TopBar`
  - `Stepper`
  - `CommandPalette`
  - `ModelInfoCard`
  - `Dialog`
- Per ogni snapshot che non è solo "cambia colore" ma cambia struttura DOM,
  investiga prima di accettare.

### 3.2 pytest backend
**Impatto**: nessuno. Backend non viene toccato.

**Verifica**: 660+ test devono restare verdi dopo ogni PR.

### 3.3 E2E (Playwright / Cypress se presente)
Probabilmente i selettori che cercano testo italiano sono OK.
Quelli che cercano colori specifici (es. `[style*="background-color: rgb(90, 177, 238)"]`)
vanno aggiornati.

---

## 4 · Performance

### 4.1 Bundle size
**Rischio**: aggiunta font Inter Tight + animazioni keyframes potrebbero
aumentare il bundle.

**Mitigazione**:
- Self-host font solo se gzip < 400 kB target supera. Altrimenti CDN Google.
- Tree-shake aggressive su Lucide (importa solo le icone usate).
- Lazy-load Three.js (vedi implementation.md sezione 8).

### 4.2 First Contentful Paint
**Rischio**: 3 famiglie di font da caricare → font-display: swap può causare
flash of unstyled text.

**Mitigazione**:
- `font-display: swap` è già in `tokens.css` (default Google Fonts)
- Inlina il critical CSS della Dashboard A1 per il primo paint
- Preload `Inter-VariableFont-Latin.woff2` se self-hosted

### 4.3 Animazioni
**Rischio**: la loading screen C5b ha multiple animazioni concorrenti
(progress + element sweep + log stream + counters).

**Mitigazione**:
- Tutto è `requestAnimationFrame` + CSS animations — performance solida
- Aggiungi `@media (prefers-reduced-motion: reduce)` override in `tokens.css`

---

## 5 · Backward compatibility

### 5.1 URL e routing
**Nessun impatto**. Le 14 schermate mantengono i path attuali (Dashboard `/`,
Workspace `/studio-pro/:modelId`, ecc.). Solo il rendering cambia.

### 5.2 API contract
**Nessun impatto**. Backend invariato.

### 5.3 LocalStorage
**Impatto basso**. Le chiavi esistenti restano valide. Aggiungo:
- `fea-pro-theme`: `"light"` | `"dark"` | `"system"`
- `fea-pro-onboarding-completed`: timestamp
- `fea-pro-tour-step`: int (per E1)

### 5.4 Browser support
**Nessun cambio** rispetto a oggi. Chrome/Firefox/Safari desktop + mobile.
IE non supportato (era già così).

---

## 6 · Checklist pre-merge (per ogni PR)

- [ ] vitest verdi (snapshot aggiornati se necessario)
- [ ] pytest verdi (backend)
- [ ] lighthouse perf > 80 su Dashboard A1 e Studio Pro
- [ ] axe-core audit: 0 violazioni serious/critical
- [ ] dark + light tested manualmente
- [ ] mobile (390px) + tablet (834px) responsive verificato
- [ ] CHANGELOG.md aggiornato

---

## 7 · Cosa fare se qualcosa va male

**Problema: la PR1 (tokens) rompe visualmente metà dei componenti**
- È probabile che alcuni componenti usassero classi Tailwind direttamente
  invece dei CSS vars (`bg-slate-900` invece di `bg-bg-panel`).
- Soluzione: greppa `bg-slate`, `bg-zinc`, `bg-gray`, `text-slate`, `text-zinc`
  e sostituisci con le nuove classi semantiche.

**Problema: il dark theme è "spento" rispetto al vecchio**
- I valori dark in Precision sono volutamente più neutri (no shadow gradient,
  no glow). Verifica con utenti reali. Se feedback negativo, considera Tweak
  "deep dark" che riporta shadow leggere.

**Problema: il viewport 3D non rende come prima**
- Solo CSS è cambiato, non il rendering Three.js. Se sembra diverso, è perché
  l'`background` del canvas è cambiato. Imposta clear color a `--bg-viewport`
  preso da `getComputedStyle`.

**Problema: snapshot test esplodono in massa**
- Aggiorna tutto con `vitest -u`, poi fai diff dei file `.snap` e cerca
  pattern sospetti (es. `display: none` improvviso, `aria-*` cambiati).

---

## 8 · Quando rollback?

Triggers per rollback:
- Bundle gzip main > 450 kB (50 kB sopra target)
- Lighthouse perf < 70
- Più di 3 utenti riportano "non capisco più dove sono Studio Pro vs Percorsi"
- Snapshot test che rivelano cambi DOM strutturali non intenzionali

In caso di rollback, lascia il branch `feature/redesign-precision` aperto
e crea `fix/redesign-precision-v2` da `test` per i fix mirati.
