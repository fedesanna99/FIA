# Accessibility spec

> Closes utile **B.3**. WCAG 2.1 AA gate per Stripe-live launch.
> Non bloccante per il release 100% formale — applicare solo se Federico
> dichiara compliance al lancio.
>
> Scope: tab order, aria-live, color contrast dark mode, screen reader
> announcements per le 4 surface critiche.

---

## 1 · Target compliance

**WCAG 2.1 livello AA**. Non AAA — i target touch ≥ 44px (AAA SC 2.5.5)
sono già implementati via `@media (pointer: coarse)`, ma non li dichiariamo
nel claim ufficiale.

**Esenzioni note** (documentate ma fuori scope):
- Viewport 3D Three.js: non navigabile da tastiera, no aria-label sui nodi
  3D. **Mitigation**: ogni interazione viewport è duplicata in:
  - `ModelTree` (sidebar, tab-navigable)
  - `Inspector` (pannello a destra, lettura completa di proprietà)
- Command palette: `kbd` shortcuts pubblicati ma `⌘K` non funziona senza
  tastiera fisica. **Mitigation**: pulsante `Cerca` esplicito in topbar.

---

## 2 · Tab order globale

Ordine di lettura dell'app, da TAB su carico pagina:

```
1. Skip-link "Salta al contenuto principale"   ← visible solo on focus
2. Topbar:
   2.1 Brand (link Dashboard)
   2.2 Search input (palette trigger)
   2.3 Workspace selector (dropdown)
   2.4 Notifications bell
   2.5 Help (?)
   2.6 User avatar (menu)
3. Rail sinistro (workspaces):
   3.1 Modello
   3.2 Analisi
   3.3 Verifiche
   3.4 Risultati
   3.5 I/O & Collab
4. Workspace main:
   4.1 Title / breadcrumb
   4.2 Primary actions (Esegui, Salva, ...)
   4.3 Content (table, viewport, form fields in document order)
5. Panel destro (se aperto):
   5.1 Panel header (titolo + close)
   5.2 Panel content (form, list, ...)
6. Statusbar (fondo):
   6.1 Solver status indicator
   6.2 Save chip
```

**Implementazione**:
- Usare l'ordine naturale del DOM. NO `tabindex > 0` mai (genera traps imprevedibili).
- Skip-link in `App.tsx` come primo child, `position: absolute; top: -100px; left: 0;` + `:focus { top: 0; }`.
- Pannelli modali (Dialog, palette, tour) **trap focus** dentro di sé via
  `focus-trap-react` o equivalente — re-emit focus al trigger su chiusura.

---

## 3 · Aria-live regions

Quattro `aria-live` ben definite, mai più. Troppi live region in pagina = screen reader sovraccarico.

### 3.1 · Solver status (polite)

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {solverState === "queued" && "Analisi in coda."}
  {solverState === "running" && `Analisi in corso, step ${currentStep} di ${totalSteps}.`}
  {solverState === "completed" && "Analisi completata."}
  {solverState === "failed" && "Analisi fallita."}
</div>
```

- **Polite**: non interrompe. L'utente lo sente al prossimo gap di lettura.
- **Una sola region attiva** per solver — sostituire content, non duplicare DOM.

### 3.2 · Toast errori (assertive)

```tsx
<div role="alert" aria-live="assertive" className="sr-only">
  {currentErrorToast?.message}
</div>
```

- **Assertive**: interrompe lettura corrente. Riservato a errori user-blocking (errore solver, errore di rete, salvataggio fallito).
- Toast info / success usano `polite` (vedi §3.1 pattern).

### 3.3 · Filtri ChecksDetailTable (polite)

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {filteredCount} {filteredCount === 1 ? "elemento" : "elementi"} dopo filtro.
</div>
```

Annuncio dopo che l'utente applica un filtro o cambia search query (debounced 500ms).

### 3.4 · Command palette navigation (polite)

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {highlightedResult?.label} selezionato. {totalResults} risultati totali.
</div>
```

Annuncio quando l'utente naviga con `↑↓` tra i risultati palette.

---

## 4 · Color contrast (dark mode)

**Light mode**: già verificato in handoff originale, tutti i pair AA+.
**Dark mode**: verifica per i 5 tone semantici. Target: contrast ratio ≥ 4.5:1
per text body, ≥ 3:1 per UI components.

| Pair | Light ratio | Dark ratio | AA pass |
|---|---|---|---|
| `--ink` su `--bg` | 16.8:1 | 13.2:1 | ✅ |
| `--ink-muted` su `--bg` | 7.4:1 | 5.8:1 | ✅ |
| `--ink-dim` su `--bg` | 4.9:1 | 4.6:1 | ✅ |
| `--ink-faint` su `--bg` | 2.8:1 | 2.4:1 | ⚠ no body, OK borders |
| `--accent` su `--bg-panel` | 5.1:1 | 6.2:1 | ✅ |
| `--success` su `--bg-panel` | 4.7:1 | 5.4:1 | ✅ |
| `--warn` su `--bg-panel` | 5.8:1 | 6.1:1 | ✅ |
| `--coral` su `--bg-panel` | 6.3:1 | 5.9:1 | ✅ |
| `--danger` su `--bg-panel` | 5.5:1 | 5.2:1 | ✅ |
| `--accent` (button bg) + `#FFF` text | 6.8:1 | 4.9:1 | ✅ |

⚠ Caveat: `--ink-faint` dark (`#555C66`) è sotto 4.5:1 — **non usare per body text**, solo per:
- Border decorative (`border-faint`)
- Tickmark / divider
- Disabled state (esente da AA per `aria-disabled="true"`)

**Verifica**: WAVE / axe-core su tutte le screen del redesign. Logging
del report in `audit/wcag-2026-05.md` (allegato post-audit).

---

## 5 · Screen reader announcements (per surface)

### 5.1 · ChecksDetailTable

- Header table: `<th scope="col">` ovunque.
- Riga selezionata: `aria-selected="true"` + `tabindex="0"` (sequential keyboard navigation con `↑↓`).
- Filter change → live region §3.3.
- UR cell critico: `aria-label="UR 0.98, supera soglia 0.95"` per leggibilità SR (oltre al coloring visivo).

### 5.2 · Command palette

- Container: `role="listbox"`, `aria-label="Cerca azioni, modelli, norme"`.
- Items: `role="option"`, `aria-selected={isHighlighted}`.
- Navigation `↑↓` → §3.4.
- ESC chiude → focus torna al trigger (`.tb-search`).

### 5.3 · Percorso step change

- Container percorso: `role="region"`, `aria-label="Percorso guidato"`.
- Step list: `<ol>` semantico, ogni `<li>` ha `aria-current="step"` sul current.
- Change step → live region polite: `"Step 3 di 6. {stepTitle}. {validation status}"`.

### 5.4 · OnboardingTour

Già coperto in `c8-onboarding-tour-flow.md` §10. Sintesi:
- Card `role="dialog"` `aria-modal="true"` `aria-labelledby`.
- Focus trap dentro la card.
- Step change → live region polite `"Step N di 6. {title}. {body}"`.

---

## 6 · Focus visible

- **Outline globale**: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }`.
- **No `outline: 0`** mai, in nessun browser reset. Se serve nascondere il default browser, ricomporlo con `:focus-visible`.
- **Button / input primary**: oltre l'outline, `ring-2 ring-accent/30` (offset interno) per visibilità extra in viewport densi.
- **Focus su elementi dentro viewport 3D**: skipped — viewport è aria-hidden, focus salta direttamente alla statusbar.

---

## 7 · Keyboard shortcuts

Tutti documentati in `Help → Scorciatoie` (matrice testuale):

| Shortcut | Azione | Surface |
|---|---|---|
| `⌘K` / `Ctrl K` | Apri palette | globale |
| `Esc` | Chiudi dialog / palette / tour | globale |
| `↑↓` | Navigate palette results | palette |
| `Enter` | Esegui comando | palette |
| `?` | Apri menu Help | globale |
| `⌘S` / `Ctrl S` | Salva modello | workspace Make/Solve |
| `⌘Z` / `Ctrl Z` | Undo | workspace Make |
| `⌘⇧Z` / `Ctrl ⇧Z` | Redo | workspace Make |
| `R` | Esegui ultima analisi | workspace Solve |
| `F` | Focus su elemento selezionato (viewport) | viewport |

Tutti gli shortcut **non interferiscono** con shortcut OS / browser di
livello superiore (`⌘W`, `⌘T`, ecc.).

---

## 8 · Forms

- Ogni `<input>` ha un `<label>` associato via `htmlFor` (non placeholder-only).
- `<input required>` ha `aria-required="true"` esplicito.
- Errori inline: `aria-invalid="true"` + `aria-describedby` al messaggio errore.
- Fieldset / legend per gruppi semantici (es. "Vincoli del nodo 1" — radio set tipo vincolo).

---

## 9 · Acceptance checklist (per QA)

- [ ] axe-core run su tutte le screen → 0 critical, 0 serious.
- [ ] Tab navigation completo da home → arriva a statusbar senza incagli.
- [ ] Skip-link visibile su primo TAB.
- [ ] Screen reader (NVDA / VoiceOver) annuncia solver state change.
- [ ] Screen reader annuncia filter result count su ChecksDetailTable.
- [ ] Focus visible su tutti gli interactive (button, input, link, checkbox).
- [ ] Dark mode: tutti i pair table §4 verificati con tool contrast (es. Stark, Polypane).
- [ ] Form errori: SR legge correttamente messaggio errore al focus.
- [ ] Tour: ESC chiude, focus torna al trigger.
- [ ] Palette: ↑↓ funziona, Enter esegue, ESC chiude e restituisce focus.

---

## 10 · Roadmap (post v2.6.4)

- **v2.7**: aggiungere `prefers-color-scheme: dark` auto-detection (oggi è opt-in via setting).
- **v2.7**: `prefers-contrast: more` → variant high-contrast del theme (border-strong ovunque, ink puro nero/bianco).
- **v2.8**: localizzazione completa SR string (oggi italiano-only, in futuro inglese + tedesco per export UE).
- **v3.x**: claim AAA su touch targets + audit completo viewport (alternativa tabellare per modello 3D).

---

**Implementazione stimata Claude Code**: ~2h (skip-link + 4 live regions + axe run + fix critical + dark contrast audit). Aggiungere 1h per il documento audit finale.
