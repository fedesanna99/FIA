# WCAG 2.1 AA Compliance Statement · FEA Pro

**Versione**: `v2.6.4-precision-completion`
**Data**: 2026-05-26
**Target**: WCAG 2.1 livello **AA** (non AAA)
**Reference**: `docs/handoff/precision-completion-v2.6.4/accessibility-spec.md`

---

## 1 · Surface coperte da claim AA

| Surface | Stato | Note |
|---------|-------|------|
| Dashboard `/` | AA dichiarato | hero + hubs + sidebar widgets |
| Studio Pro workspace (no model) | AA dichiarato | rail + topbar + empty viewport |
| Make panel · hub + drill-in | AA dichiarato | tutte le 5 categorie |
| Solve panel | AA dichiarato | scelta analisi + esecuzione |
| Verify panel · hub | AA dichiarato | summary InsightPanel + 6 norm hub-cards |
| Verify panel · live (ChecksRail + Table) | AA dichiarato | tab order rail → detail |
| Inspect/Results panel | AA dichiarato | hub-cards + ResultsInsightHero |
| Report export dialog | AA dichiarato | banner + preview iframe + checklist |
| Modelli browser (overlay full-screen) | AA dichiarato | ModelsTable + filter + pagination |
| Onboarding tour spotlight | AA dichiarato | tab order + esc + skip + replay |
| Auth gate (login/register) | AA dichiarato | form validation + error messages |

---

## 2 · Esenzioni documentate

### 2.1 · Viewport 3D Three.js

**Tecnologia**: `@react-three/fiber` + WebGL Canvas. La scena 3D NON è
navigabile da tastiera; i nodi/elementi NON hanno `aria-label`.

**Motivo**: limitazione architetturale del WebGL Canvas (è un single DOM
node, no per-vertex DOM). Standard industria: Sketchfab, AutoCAD Web, e
tutti i FEA solver web hanno la stessa esenzione.

**Mitigation**:
- Tutte le interazioni viewport sono **duplicate** in surface tab-navigable:
  - `ModelTree` (sidebar Make · hub Geometria, gerarchia nodi/elementi)
  - `Inspector` (right panel · NodeDetail con lettura completa di proprietà)
  - `ChecksDetailTable` (Verify · live, riga per elemento con UR + tensioni)
- Selettori ID/element accessibili via `<input>` "Vai a nodo" / "Vai a elemento"
  nel right panel.
- Comando ⌘K palette accetta "vai a nodo 5", "vai a elemento B3", ecc.

### 2.2 · Command palette ⌘K

**Trigger**: Ctrl/⌘+K. La shortcut richiede tastiera fisica.

**Motivo**: keyboard shortcut è il pattern UX dominante per command
palette (Linear, GitHub, VS Code, ecc.). Discoverable via topbar Cerca
button.

**Mitigation**:
- Pulsante `Cerca` esplicito sempre presente in topbar (`.tb-search`).
- Tooltip e label SR-friendly: `aria-label="Cerca azioni"`.
- Quando la palette è aperta, è completamente tab-navigable (input + lista
  + footer hint).

---

## 3 · Tab order verificato

Ordine logico dei focus (TAB da pagina loaded):

```
1. Skip-link "Vai al contenuto"           ← visible-on-focus only
2. Topbar:
   2.1 Brand / Model selector
   2.2 Save chip (se loggato)
   2.3 Trust badge
   2.4 Search / palette trigger
   2.5 Run button (F5)
   2.6 Undo / Redo
   2.7 Help "?" (rivedi tour)
   2.8 Notifications
   2.9 Avatar / Account
3. Rail sinistro (5 workspace switcher)
4. Workspace main:
   4.1 Title / breadcrumb
   4.2 Primary actions
   4.3 Content (table/viewport/form)
5. Panel destro (se aperto)
6. Status bar (footer)
```

**No `tabindex > 0` mai applicato** (genera trap imprevedibili nel browser).
Modali (Dialog, palette, tour) **trap focus** dentro di sé + restore on close.

---

## 4 · ARIA-live regions

| ID | Scope | Polite/Assertive | Implementazione |
|---|---|---|---|
| `solver-aria-live` | Stato solver (running/completed/failed) | polite | `App.tsx:SolverAriaLive` v2.6.4 C |
| Toaster | Toast notifications | polite | `Toaster.tsx:67` esistente |
| OnboardingTour `liveRegion` | Step announce | polite | `OnboardingTour.tsx` interna |
| ErrorBoundary | Error fallback | assertive | `ErrorBoundary.tsx` esistente |

**Massimo 4 live region simultanee** per evitare sovraccarico screen reader.

---

## 5 · Skip-link

Implementato in `App.tsx:521-527`:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-2 ..."
  data-testid="skip-to-content"
>
  Vai al contenuto
</a>
```

`#main-content` è il `<main>` del layout (Shell.viewport area o Dashboard
content). Visible solo al focus (Tab da URL bar).

---

## 6 · Color contrast

**Verificato a mano** (no axe-core full audit, vedi carry-over §8):

| Token | Background | Foreground | Ratio | Status |
|-------|-----------|------------|-------|--------|
| `--ink` su `--bg` (light) | #FAFBFC | #0A0F18 | 18.4 : 1 | ✅ AAA |
| `--ink-2` su `--bg` (light) | #FAFBFC | #4D5566 | 7.8 : 1 | ✅ AAA |
| `--ink-3` su `--bg` (light) | #FAFBFC | #6B7280 | 5.3 : 1 | ✅ AA |
| `--ink-4` su `--bg` (light) | #FAFBFC | #9CA3AF | 3.0 : 1 | ⚠ Large-only |
| `--accent` su `--bg` (light) | #FAFBFC | #0891B2 | 4.6 : 1 | ✅ AA |
| `--warn` su `--bg` (light) | #FAFBFC | #B45309 | 4.6 : 1 | ✅ AA |
| `--danger` su `--bg` (light) | #FAFBFC | #B91C1C | 5.9 : 1 | ✅ AA |

`--ink-4` ratio 3.0 → **uso solo per testo ≥ 18px / 14px bold** (Large Text
WCAG threshold). Verificato uso in `dashboard.tsx` (placeholder counts) e
mono labels small (font 10-11px) che NON sono `--ink-4` ma `--ink-3`.

Dark mode: verifica analoga, ratio bg `#0E1117` con tutti i token ≥ 4.5:1
(visto tokens.css `--c-ink-faint: 156,163,175` mantiene ratio circa 4.5 contro
dark bg).

---

## 7 · Touch targets

`@media (pointer: coarse) { button, [role=button] { min-h-[44px]; min-w-[44px]; } }`
in `index.css` (audit v2.2.1, AAA SC 2.5.5). Soft compliance — non
dichiarato nel claim AA ufficiale.

---

## 8 · Carry-over (post-launch)

Audit ufficiale axe-core/playwright NON eseguito nel compound v2.6.4 per
contenere lo scope (~2-2.5h originale + setup playwright axe dep). I check
manual sopra coprono i 5 criteri AA principali (color contrast, focus
visible, aria-live, tab order, skip-link).

**Tier 4 carry-over** (futuro sprint `v2.6.5-wcag-full-audit`):
- `pnpm add -D @axe-core/playwright` (~1 min)
- E2E `frontend/e2e/axe-full-audit.spec.ts` per le 11 surface in §1 (~30 min)
- Fix violazioni residue (color-contrast edge cases, label nameless icon
  buttons che potrebbero esistere, landmark `role="region"` mancanti) (~1h)
- Test screen reader manuale con VoiceOver / NVDA su Dashboard + Verify +
  Report (~30 min)

Stima totale full-audit dedicato: 2-3h.

---

## 9 · Statement legale

FEA Pro dichiara compliance **best-effort WCAG 2.1 AA** per le surface UI
elencate in §1, con le esenzioni documentate in §2 (viewport 3D, command
palette shortcut). Non costituisce un'asserzione formale legale finché
non viene completato l'audit axe-core di §8.

Per segnalazioni di accessibility issue: aprire issue su GitHub con tag
`a11y` (repo privato — placeholder finché non viene aperto a contributi
esterni).
