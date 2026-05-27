# Audit Responsive Media Breakpoints · 2026-05-27

**Scope**: tutte le `@media` query in `frontend/src/**/*.css` + tailwind.config.ts → mapping breakpoint × wrapper × bug.

## Breakpoint inventory (9 diversi nello stesso codebase)

| Breakpoint | Dove | Cosa fa |
|---|---|---|
| `max 374px` | `index.css:710` | tiny phones edge case |
| `max 640px` | `shell.css:170` | mobile small |
| `max 767px` / `min 768px` | `index.css:626/629/713/721` | tablet (Tailwind md) |
| `max 920px` | `dashboard.css:688` | dashboard custom |
| `max 980px` | `auth.css:566` | auth split→stack (F2 Federico bug fix) |
| `max 1023px` | `index.css:721` | Tailwind lg |
| `max 1080px` | `dashboard.css:685` + `percorso-uc1.css:792` | dashboard/percorso 2-col→1-col |
| `min/max 1280px` | `index.css:716` + `shell.css:167` + `percorso-uc1.css:789` | desktop |
| `min 1400px` | `studio-io.css:200` | studio IO wide |

**Tailwind config separato**: sm:640 md:768 lg:1024 xl:1280 2xl:1536 → **doppio sistema parallelo**.

## Findings P0 — Critical (3 pagine certamente rotte mobile)

| # | Finding | File | Severità | Suggested fix |
|---|---|---|---|---|
| **R1** | 9 breakpoint diversi senza sistema unificato. A viewport intermedi (800-1000px) il comportamento è incoerente | tutto | 🔴 | Unify a Tailwind breakpoints |
| **R2** | 4 pagine Phase 4-6 hanno **zero @media**: templates.css, dialogs.css, settings.css, states.css. **3 sono rotte su mobile** (templates grid overflow, dialogs dialog 580-820 overflow, settings sidebar 280+content 580 overflow) | `templates.css`, `dialogs.css`, `settings.css`, `states.css` | 🔴 | Add @media (max-width: 767px) con stack layout |

## Findings P1 — Important

| # | Finding | File | Severità | Suggested fix |
|---|---|---|---|---|
| **R3** | dashboard.css ha 2 breakpoint (920+1080), auth.css ne ha 1 (980). Navigando /login → / a viewport 950px: auth stack, dashboard split = incoerenza UX | `auth.css` + `dashboard.css` | 🟡 | Allineare entrambi a md:768 + lg:1024 |
| **R4** | studio.css ha `s-mid: 52+280+1fr+380 = min 712px viewport`. NESSUN media query mobile. 4 Studio workspace Phase 5 broken su tablet/mobile | `studio.css` | 🟡 | Add @media stack layout + sub-rail collapse |
| **R5** | percorso-uc1.css ha 2 breakpoint (1080+1280) per 3-col grid Coach/Canvas/Inspector. Sotto 1080 canvas fissato 480px → schiacciato su tablet | `percorso-uc1.css:792` | 🟡 | Canvas dovrebbe avere min-height responsive |

## Findings P2 — Code smell

| # | Finding | Nota |
|---|---|---|
| **R6** | Tailwind config definisce sm/md/lg/xl/2xl ma file CSS custom usano 374/920/980/1080/1400 magic numbers. **Doppio sistema parallelo** |
| **R7** | `index.css:629` + `:713` 2 blocchi separati per stesso breakpoint 768px, hard to maintain |
| **R8** | Naming breakpoint non documentato. Cosa significa 980? 1080? Magic numbers |

## Pagine totalmente rotte su mobile (375x812)

| Route | Bug visibile | Severità |
|---|---|---|
| `/templates` | Grid horizontal scroll (no media query) | 🔴 |
| `/design/dialogs` | Dialog width 580-820 fisso → overflow viewport | 🔴 |
| `/settings` | Sidebar 280 + content min 580 = 860 → overflow | 🔴 |
| `/studio/modello` | Layout 712+px min, no fallback | 🔴 |
| `/studio/analisi` | Layout 712+px min, no fallback | 🔴 |
| `/studio/verifiche` | Layout 712+px min, no fallback | 🔴 |
| `/studio/io` | Layout 712+px min, no fallback | 🔴 |

**Tot: 7 route con problemi mobile su 9 nuove** (78%).

## Pagine OK su mobile

| Route | Status |
|---|---|
| `/login`, `/signup`, `/forgot`, `/verify` | ✅ Fix v2.8.0.1 form-first |
| `/` (dashboard) | ✅ Stack a 1080px |
| `/percorsi/uc1` | ⚠️ Funziona ma canvas schiacciato |
| `/design/states` | ✅ Card centrale 540 max → ok |
| `/design/mobile` | ✅ Designed per 375 phone-frame |

## Suggested unified breakpoint system

```css
/* Allineato a Tailwind: */
@media (max-width: 767px)   { /* mobile (sm-) */ }
@media (min-width: 768px)   { /* tablet (md+) */ }
@media (min-width: 1024px)  { /* laptop (lg+) */ }
@media (min-width: 1280px)  { /* desktop (xl+) */ }
@media (min-width: 1536px)  { /* large (2xl+) */ }
```

**Eliminare** custom 374/920/980/1080/1400.

## Plan fix (priorità)

| Step | Effort | Outcome |
|---|---|---|
| 1. Add `@media (max-width: 767px)` to templates/dialogs/settings | ~30 min | 3 pagine non più broken su mobile |
| 2. Add stack mobile a 4 studio.css | ~45 min | 4 workspace usabili su tablet |
| 3. Allineare auth 980 → 1024, dashboard 920/1080 → 768/1024 | ~20 min | UX coerente tra pagine |
| 4. Fix percorso canvas height responsive | ~15 min | Canvas leggibile su tablet |
| 5. Documenta breakpoint system | ~10 min | Future-proof |
| **Tot** | **~2h** | Phase 4-6 completamente responsive |

---

**Riferimento**: questo audit segue v2.8.0.3 + audit-css-shell-wrapper-2026-05-27.md. I findings R2 sono **bug certi** (verificabili aprendo le route a 375px viewport). I findings R3-R5 sono **degrado UX** (le pagine funzionano ma malamente).

---

## 📊 Status post Sprint A-F (v3.0.0 · 2026-05-27 sera)

Re-eseguito audit dopo Sprint A-F. **4/9 findings risolti** (44%).

| ID | Finding | Status v3.0.0 | Sprint |
|---|---|---|---|
| R1 | 9 breakpoint diversi nel codebase | ⚠️ partial | Sprint A ha aggiunto 4 @media a 767px (più coerenza per Phase 6, ma custom 920/980/1080/1400 rimasti) |
| R2 | 4 pagine Phase 6 senza @media | ✅ FIXED | Sprint A (templates/dialogs/settings + studio) |
| R3 | auth 980 vs dashboard 920/1080 incoerenti | ❌ open | skipped per safety (rischio rompere layout) |
| R4 | Studio min 712px no fallback mobile | ✅ FIXED | Sprint A (stack vertical + scroll override body lock) |
| R5 | percorso canvas height fixed | ✅ FIXED | Sprint E (minmax 420-60vh tablet, 280-50vh mobile) |
| R6 | Tailwind config vs custom CSS doppio sistema | ❌ open | — |
| R7 | index.css 768 blocchi semantici (non veri duplicati) | ⚠️ chiarito | semanticamente diversi (.mobile-only + html font-size), non sono duplicati |
| R8 | Breakpoint magic numbers no docs | ❌ open | — |
| R9 | Sprint A 767px vs Tailwind sm 640px | ⚠️ docs | accettato il piccolo mismatch (Tailwind sm=640 vs custom 767) |

**Score**: 3 fixed (R2+R4+R5) + 1 partial (R1) + 1 chiarito (R7) / 9 → **44%**.

**Findings P2 residui per v3.1**: R3+R6 (breakpoint unification ~2h), R8+R9 (docs ~10 min).
