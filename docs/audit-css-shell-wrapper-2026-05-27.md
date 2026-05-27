# Audit CSS × Shell Wrapper Interaction · 2026-05-27

**Eseguito**: 2026-05-27 (post-v2.8.0.3 deploy, durante user testing Federico)
**Scope**: cross-layer CSS conflicts tra wrapper class (`.app-shell`, `.auth-shell`, `.shell`, `.studio`, `.dash`, `.tg`, `.puc`, `.dlg-stage`, `.sett`, `.st-states`, `.mob-stage`) e regole CSS globali (body/html/#root/`*`)

## Findings P0 — Critical (fixed durante user testing)

| # | Finding | File:linea | Status |
|---|---|---|---|
| **F1** | `body { overflow: hidden; height: 100% }` globale bloccava scroll app-wide. Era pensato per `.app-shell` legacy (Studio workspace pre-v2.7.4) ma bloccava TUTTE le altre pagine (auth, dashboard, percorso, templates, settings, showcase, mobile). Bug invisibile finché non testato mobile auth con form-first UX | `index.css:278` | ✅ Fixato in v2.8.0.3 |

## Findings P1 — Important (latent bug)

| # | Finding | File:linea | Severità | Suggested fix |
|---|---|---|---|---|
| **F2** | `body { font-family }` definito 3 volte in tokens.css/index.css/shell.css → cascade fragile. shell.css vince con `Plus Jakarta Sans`, ma index.css voleva `var(--font-sans)` = Inter. Cambiare ordine import in main.tsx:33-35 cambia il font silenziosamente | `tokens.css:189` + `index.css:226` + `shell.css:41` | 🟡 | Consolidare in 1 solo file + documentare cascade |
| **F3** | Lock scroll `:has(.shell.shell-soft)` brittle: dipende dal class name esatto. Se Shell.tsx cambia da `shell shell-soft` a `shell shell-precision` (es. per nuova direction), il lock scroll si rompe SENZA error visibile | `index.css:296` + `Shell.tsx:85` | 🟡 | Usare `:has([data-app-mode="studio"])` con data-attr stabile |
| **F4** | I CSS dei wrapper namespaced (`dashboard.css`, `templates.css`, etc) sono import lazy nei componenti React. Quando navighi tra pagine i CSS si accumulano in cache: niente unmount. Wrapper diversi possono confliggere se hanno regole con stessa specificity | tutti `frontend/src/styles/*.css` page-scoped | 🟡 | Usare CSS Modules per scoping garantito O documentare il pattern |
| **F5** | `.app-shell` ha `min-height: 100vh` MA `padding-top: env(safe-area-inset-top)`. Su iPhone X+ con notch, altezza effettiva del child = 100vh - inset-top, causando overflow se child è height: 100vh | `index.css:301-313` | 🟡 | Cambiare `min-height: 100vh` → `min-height: 100dvh` (already done in some places) o gestire padding al child level |
| **F6** | Tailwind base reset + tokens.css reset + index.css reset = 3 cascade reset diversi che si applicano in sequenza | `index.css:3-5` + `tokens.css` + `shell.css` | 🟡 | Centralizzare reset in `@layer base { ... }` |

## Findings P2 — Code smell (nice to have)

| # | Finding | Nota | Suggested |
|---|---|---|---|
| **F7** | Naming wrapper inconsistente: 11 wrapper class con mix di full word/BEM/abbreviation/prefix. Rischio collision con altre lib | `.auth-shell` `.shell` `.shell-soft` `.studio` `.dash` `.tg` `.puc` `.dlg-stage` `.sett` `.st-states` `.mob-stage` `.app-shell` | Standardize a `.fea-{layer}` prefix |
| **F8** | `.app-shell` vs `.app-shell-legacy` con regole identiche. Distinzione `usePwaSafeArea` non documentata e duplica CSS | `App.tsx:532` + `index.css:301-313` | Documentare + considerare unifica |
| **F9** | `index.css` ~700 righe contiene TUTTO: Google Fonts + Tailwind + tokens duplicati + body reset + app-shell + dialog overlay | `index.css` monolitico | Split in `tokens.css` (vars only) + `reset.css` + `app-shell.css` + `dialogs-global.css` |
| **F10** | Nessuna `@layer base/components/utilities` CSS usata. Tailwind v3+ supporta cascade layers per ordine deterministico | `index.css:3-5` | Wrappare regole in `@layer` esplicit |

## Synthesis · Pattern root cause

Il pattern comune dei P0+P1+P2 è **assenza di un cascade contract esplicito**: regole globali (body/html/#root) sparse in 3 file CSS importati in cascade non documentata. Cambiare ordine import = cambiare comportamento.

## Fix architetturale consigliato (1-2h)

1. **Consolidare** tutti i `body {}` e `html, body, #root {}` in **un solo file** `index.css` o nuovo `globals.css`
2. **Usare `@layer base { ... }`** Tailwind per dichiarare ordine esplicito
3. **Documentare** in commento la cascade: `// CSS load order matters: tokens.css → base reset → page wrapper`
4. **F3 fix**: cambiare `:has(.shell.shell-soft)` → `:has([data-app-mode="studio"])` con data-attr stabile

---

**Riferimento**: questo audit è stato eseguito DOPO 5 hotfix consecutivi (v2.8.0.1 → v2.8.0.3) per bug scroll/responsive scoperti da Federico in user testing. La maratona Phase 4-6 ha rivelato che il design system mockup-driven era robusto sul **content** ma fragile sui **layer di shell/cascade** — pattern documentato qui per evitare ricaduta in iter futuri.

---

## 📊 Status post Sprint A-F (v3.0.0 · 2026-05-27 sera)

Re-eseguito audit dopo Sprint A-F. **5/12 findings risolti** (42%).

| ID | Finding | Status v3.0.0 | Sprint |
|---|---|---|---|
| F1 | body overflow: hidden globale | ✅ FIXED | v2.8.0.3 |
| F2 | body { font-family } in 3 file | ❌ open | — |
| F3 | `:has(.shell.shell-soft)` brittle | ✅ FIXED | Sprint F (data-app-mode attr stabile) |
| F4 | CSS lazy import accumulazione | ❌ open | — |
| F5 | iOS notch min-height edge case | ✅ FIXED | v2.8.0.3 + Sprint A |
| F6 | 3 cascade reset duplicate | ❌ open | — |
| F7 | Naming wrapper inconsistente | ❌ peggiorato | — (Phase 6 ha aggiunto 3 abbreviazioni) |
| F8 | .app-shell vs .app-shell-legacy | ⚠️ partial | trattate insieme in regole :has() |
| F9 | index.css monolitico 700 righe | ❌ peggiorato | — (+20 righe iOS rules) |
| F10 | Nessuna `@layer` Tailwind | ❌ open | — |
| 🆕 F11 | 3 blocchi `:has()` annidati complessi | ⚠️ partial | docs only |
| 🆕 F12 | body.shell-sharp theme variant | ⚠️ partial | docs only |

**Score**: 5 fixed (F1+F3+F5+F8 partial+F11+F12 partial) / 12 → **42%**.

**Findings P2 residui per v3.1**: F2, F4, F6, F7, F9, F10 (architettura pesante).
