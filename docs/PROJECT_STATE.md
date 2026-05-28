# PROJECT STATE · FEA Pro

> Stato vivo. Aggiornare a fine di ogni sprint.
> Letto a inizio di ogni nuova chat.

**Ultimo aggiornamento**: 2026-05-28 (sera · post v3.2.0 audit-driven E2E completo)
**Versione corrente**: `v3.2.0-audit-driven-e2e-complete`
**Branch attivo**: `design-rebuild/v2.6` (= origin/test = origin/main)
**Ultimo SHA**: `fb73fbd` (pre rollup v3.2.0)
**Deploy live**: Fly.io · https://fea-pro.fly.dev/ (in fase deploy v3.2.0)

---

## ⚡ Stato attuale · post v3.2.0 audit-driven (2026-05-28 sera tardi)

Sessione audit-driven cumulativa: **4 round audit** + workflow E2E live confermato.

**Pipeline**: v3.1.0 → v3.1.1 (round 1: 3 P0+13 P1+4 P2) → v3.1.2 (round 2: 5 P0+13 P1+4 P2) → v3.1.3 (round 3 visuale: 1 P0+2 P1+5 P2/P3) → v3.1.4 (round 4 E2E: 1 P1) → **v3.2.0** rollup finale.

**Bug chiusi**: 39 totali · 10 P0 + 26 P1 + ~10 P2/P3.

**Workflow ingegnere E2E** verificato live (Marco Rossi · IPE300/S355/L=6m):
- signup → modello vuoto → mesh 11 nodi/10 beam2d
- 2 vincoli + 10 carichi q=-10kN/m
- analisi statica: **δ=9.62mm match formula 99.9%**
- EC3 verify: 10/10 OK · UR_max=0.229
- Export PDF/XLSX/DXF/IFC: 4/4 ✅

**Architettura nuova**: `GlobalRoutingListeners.tsx` cross-route + sessionStorage activeId persistence + security backend hardened (JWT enforce / rate-limit register / timing-safe login).

**Score totale**: 80% (v3.1.0) → **~96%** (v3.2.0).

Per dettagli: vedi `HANDOFF_2026-05-28-v3.2.md`.

---

## Stato precedente · post Fase 1-3 v3.1.0 (2026-05-28 sera)

Giornata di consolidamento: 3 fix critici Dashboard (mattina) + 6 audit paralleli (pomeriggio) + 3 fasi piano operativo (sera). **Fase 4 cleanup file morti saltata per scelta utente** — file orfani restano in repo per safety.

**Nuove feature accessibili** (10 sepolte → recuperate):
- AvatarMenu rich in Shell custom (Focus/Account/Location/Theme/Export/Logout)
- Settings link visibile in topbar (era solo URL manuale)
- ViewPanel 6° workspace nella rail (deformata/colormap/diagrammi)
- 4 Climate Loads buttons in MakePanel (Vento/Neve/Sismica/Altimetria)
- Custom material/section CTA in Make hub
- Percorsi guidati link in AvatarMenu
- 5 panel orfani wirati in InspectPanel (Buckling/FFT/Spectrum/ModeSup/ZZError)

**Design trapianto Shell custom** (riskinning CSS):
- Nuovo `frontend/src/styles/shell-mockup-v3.css` (310 righe override)
- TopBar/Rail/Panel/StatusBar replicano look mockup Studio v2 `.s-*`
- ZERO modifiche JSX. Cascade vince. Reversibile.

**Studio v2 degradate a showcase**:
- 4 pages `/studio/{modello,analisi,verifiche,io}` con `<ShowcaseBanner>` top giallo
- Restano vive come vetrina design ma non più presentate come workspace operativo

**Score complessivo**: app ~90% production-ready funzionalmente, ~95% visivamente.

---

## 0. Sessione attiva · Phase 4-6 marathon + audit roadmap CHIUSE

### Pipeline tag 2026-05-27 (13 tag pushati, 13 deploy live)

| Tag | Deploy | Cosa |
|---|---|---|
| `v2.7.0-auth-mockup-driven` | v94 | Phase 4.1 Auth refactor |
| `v2.7.0.1-auth-fix-font` | v95 | Font fix Inter + visual-audit tool |
| `v2.7.1-dashboard-mockup-driven` | v96 | Phase 4.2 Dashboard home refactor |
| `v2.7.1.1-dashboard-fullscreen` | v97 | Hotfix chrome legacy attorno home |
| `v2.7.2-templates-mockup-driven` | v98 | Phase 4.3 Templates gallery |
| `v2.7.3-percorso-uc1-mockup-driven` | v99 | Phase 4.3b stepper UC1 |
| `v2.7.7-studio-workspaces-mockup-driven` | v100 | Phase 5.1-5.4 (4 Studio workspace rollup) |
| `v2.8.0-dialogs-settings-states-mobile` | v101 | Phase 6.1-6.3 rollup |
| `v2.8.0.1-auth-mobile-form-first` | v102 | Card overflow + mobile UX |
| `v2.8.0.2-body-scroll-fix` | v103 | Tentativo scroll fix v1 |
| `v2.8.0.3-body-scroll-fix-v2-app-wide` | v104 | Scroll fix definitivo |
| `v2.8.1-sprint-a-mobile-legal-userdata` | v105 | **Sprint A** Mobile + legal pages + user data |
| `v2.9.0-sprint-b-studio-backend-wired` | v106 | **Sprint B** Studio backend wiring |
| `v2.9.1-sprint-c-settings-cmdk-trust` | v107 | **Sprint C** Settings 8 tab + Cmd K + Trust |
| `v2.9.2-sprint-d-showcase-disclaimer` | v108 | **Sprint D** Showcase disclaimer |
| **`v3.0.0-sprint-ef-p1-p2-complete`** | **v109** ✅ | **Sprint E+F** UX gap + tech debt subset |

### Stato Phase 4-6 implementazione

| Sezione | Schermate | Implementato | Match | Backend wired |
|---|---|---|---|---|
| 00 Foundation (tokens) | 3 | ✅ in repo | 100% | n/a |
| 01 Auth (4 stati) | Auth.html | ✅ v2.7.0 + hotfix v2.8.0.1 | **~98%** | ✅ |
| 02 Dashboard | 1 | ✅ v2.7.1 + dynamic hero v3.0.0 | **~98%** | ✅ |
| 02 Templates | Templates.html | ✅ v2.7.2 + mobile responsive Sprint A | **~95%** | ✅ |
| 02 Percorso UC1 | Percorso UC1.html | ✅ v2.7.3 + responsive R5 | **~85%** (step 3 only) | ⚠️ partial |
| 03 Studio Modello | Studio Modello.html | ✅ v2.7.4 + Sprint B wire + empty banner | **~80%** | ✅ |
| 03 Studio Analisi | Studio Analisi.html | ✅ v2.7.5 + Sprint B wire + Beta disabled | **~75%** | ✅ |
| 03 Studio Verifiche | Studio Verifiche.html | ✅ v2.7.6 + Sprint B wire | **~70%** | ✅ |
| 03 Studio I/O | Studio IO.html | ✅ v2.7.7 + Sprint B + drag&drop M12 | **~75%** | ✅ |
| 04 Dialogs | Dialogs.html | ✅ v2.8.0 + disclaimer Sprint D | **~60%** showcase | n/a |
| 05 Settings | Settings.html | ✅ v2.8.0 + 8 tab Sprint C | **~85%** | partial |
| 06 States | States.html | ✅ v2.8.0 + disclaimer | **~65%** showcase | n/a |
| 07 Mobile | Mobile.html | ✅ v2.8.0 + disclaimer | **~50%** showcase | n/a |

**Media handoff design system**: **~80%** (era ~25% pre-marathon).

### 9 nuove route Phase 4-6 live

```
/login /signup /forgot-password /verify-email  (4 auth · 98%)
/                                              (dashboard · 98%)
/templates                                     (gallery · 95%)
/percorsi/uc1                                  (stepper · 85%)
/studio/modello /studio/analisi /studio/verifiche /studio/io  (4 workspace · 70-80%)
/settings                                      (8 tab · 85%)
/design/dialogs /design/states /design/mobile  (3 showcase · 50-65%)
/privacy /terms /about /preliminary            (4 legal · 100% Sprint A)
```

---

## 1. Audit 2026-05-27 · 31 findings → 9 residui

3 audit cumulati documentati. Score completeness post v3.0.0:

| Audit | File | Findings | Risolti | % |
|---|---|---|---|---|
| CSS × Shell wrapper | `audit-css-shell-wrapper-2026-05-27.md` | 12 (F1-F12) | 5 | 42% |
| Responsive breakpoints | `audit-responsive-breakpoints-2026-05-27.md` | 9 (R1-R9) | 4 | 44% |
| Mockup completeness | `audit-mockup-completeness-2026-05-27.md` | 13 + 4 nuovi | 13 | **100%** P0+P1 |
| **Totale** | | **31** | **22** | **71%** |

### Findings P2 residui (tech debt v3.1)

- F2: cascade `body { font-family }` consolidamento (~30 min)
- F6+F10: reset dedup + `@layer` Tailwind (~1h)
- F7: naming wrapper refactor (~2h, breaking)
- F9: split `index.css` monolitico 700 righe (~1h)
- F11+F12: docs `:has()` complexity + shell-sharp variant
- R1+R6: breakpoint unification cross-wrapper (~1.5h)
- R8+R9: breakpoint magic numbers docs
- M13 residual 2 minor links (StudioIO + StudioVerifiche internal anchors)

**Totale stimato v3.1 cleanup**: ~5-6h.

---

## 2. Carry-over commerciale (NON audit-driven)

| Item | Priorità | Stima | Note |
|---|---|---|---|
| Stripe live billing setup | P1 | 3-5 giorni | sblocca subscription Pro tier |
| Test sessione utente alpha (Paolo) | P1 | 30-60 min | feedback real user |
| Catalogo tubolari + sezioni custom | P2 | 2-3 giorni | feature richiesta |
| Pushover/Seismic backend integration UI | P2 | 4-6h | API esiste, UI da wirare |
| Backend timestamp sort Recent | P2 | 2-3h | UX gap dashboard |
| Jobs cronologia panel | P2 | 4-6h | placeholder presente |
| WCAG 2.1 AA full audit | P2 | 2-3h | compliance |

---

## 3. Convenzioni progetto (invariate)

- Branch standard: `test`. Worktree: `design-rebuild/v2.6`
- Versioning: `vN.M.X-slug`, `vN.M.X.y-slug` hotfix, rollup compound
- Sync test↔main solo al rollup finale
- Deploy Fly.io region `fra` single-instance rolling
- localStorage `feapro:rail:expanded`
- Pattern `data-testid` per E2E robusti
- Pattern mockup-driven Phase 4-6: "vince il mockup"
- Audit-driven sprint pattern (post v2.7.x): 3 audit → roadmap → sprint A-F → deploy chunked

---

## 4. Pattern mockup-driven (regola d'oro Phase 4-6)

Da `DESIGN_HANDOFF.md`:
> "Quando il codice React diverge dal mockup, vince il mockup."

### Workflow per ogni brief (consolidato post 2026-05-27)

1. **Pre-brief**: `cd frontend && node scripts/visual-audit.mjs` → identifica gap reale
2. **Brief Claude Chat** scope ristretto (1-2 mockup HTML/sprint)
3. **Implementazione**:
   - copia CSS verbatim → namespace sotto wrapper class (`.dash`, `.tg`, `.puc`, `.studio`, ecc.)
   - traduci HTML in JSX mantenendo class names
   - drop-in alias import per replacement non breaking
4. **Quality gate intermedio**: tsc + vitest (target 860/860)
5. **Visual audit re-run** PRIMA del rollup tag → screenshot probe
6. **Hotfix architecture** se chrome legacy / Shell custom interferisce
7. **Rollup tag + push + deploy**
8. **Visual audit re-run live** post-deploy + DOM probe per confermare

### Lezioni cumulative (2026-05-27 audit-driven roadmap)

**Marathon Phase 4-6**: il design system handoff Claude Design v2.1 era **visivamente completo al ~95%** ma **funzionalmente solo al ~25%**. Sprint A-F (totale ~24h work distribuito su 6 deploy) ha portato a **funzionalmente ~80%**.

**Pattern di audit funzionante**: 3 audit consecutivi (CSS × wrapper · responsive breakpoints · mockup completeness) → ROADMAP consolidata → sprint chunked di 4-11h ognuno → deploy frequenti per validation incrementale.

**Pattern hotfix in user testing**: 3 bug scroll/overflow scoperti da Federico aprendo le pagine nel preview pane → fix in <30 min ciascuno con push+deploy.

---

## 5. File project knowledge

**Vivi (sempre aggiornati)**:
- `PROJECT_STATE.md` (questo) — stato attuale
- `OPERATING_RULES.md` v3 — regole permanenti
- `HANDOFF_MESSAGE.md` — testo standard nuove chat
- `FEA_PRO_CAPABILITY_MAP.md` v2.0

**Audit-driven (consultivi)**:
- `docs/audit-css-shell-wrapper-2026-05-27.md` (12 findings)
- `docs/audit-responsive-breakpoints-2026-05-27.md` (9 findings)
- `docs/audit-mockup-completeness-2026-05-27.md` (13 findings + 4 nuovi)
- `docs/ROADMAP_2026-05.md` (Sprint A-F consolidata + carry-over)
- `docs/HANDOFF_2026-05-27.md` (post-compact resume text)

**Implementazione**:
- `frontend/src/dashboard/DashboardPage.tsx` (Phase 4.2 hero dinamico)
- `frontend/src/templates/TemplatesPage.tsx` (Phase 4.3)
- `frontend/src/percorsi/PercorsoUC1Page.tsx` (Phase 4.3b)
- `frontend/src/studio/` (4 Studio workspace + StudioShell + useFirstModelId + StudioEmptyBanner)
- `frontend/src/dialogs/DialogsShowcasePage.tsx` (Phase 6.1)
- `frontend/src/settings/SettingsPage.tsx` (Phase 6.2 con 8 sezioni)
- `frontend/src/states/StatesShowcasePage.tsx` (Phase 6.2)
- `frontend/src/mobile/MobileShowcasePage.tsx` (Phase 6.3)
- `frontend/src/legal/LegalPage.tsx` (4 pagine compliance)
- `frontend/src/design-showcase/ShowcaseBanner.tsx` (disclaimer)
- `frontend/src/styles/*.css` (12 file namespaced)

---

## 6. Prossimi step raccomandati (priorità ordinata)

1. **Federico user testing v3.0.0** (~30 min): apri https://fea-pro.fly.dev/, naviga le 13 route, segna eventuali bug residui
2. **Stripe live setup** (~3-5 giorni): sblocca paying user (P1 commerciale)
3. **v3.1 tech debt** (~5-6h): chiusura findings P2 architetturali (Sprint G future)
4. **Pushover/Seismic UI wiring** (~4-6h): completa Studio Analisi solver non-implementati

---

**Conclusione**: marathon Phase 4-6 + audit-driven roadmap completata in 1 giornata. App **production-ready a livello UX/UI ~80%** (era 25% mattina). Tutti i P0+P1 critici risolti. Restano carry-over commerciali + tech debt v3.1.
