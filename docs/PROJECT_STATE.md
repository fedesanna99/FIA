# PROJECT STATE · FEA Pro

> Stato vivo. Aggiornare a fine di ogni sprint.
> Letto a inizio di ogni nuova chat.

**Ultimo aggiornamento**: 2026-05-27 (sera)
**Versione corrente**: `v2.6.6-home-legacy-shell-refactor` (post deploy v93)
**Branch attivo**: `design-rebuild/v2.6` (= `origin/test` = `origin/main`)
**Ultimo SHA**: `cb17c8f`
**Deploy live**: release Fly.io **v93** · https://fea-pro.fly.dev/

---

## 0. Sessione attiva · Design Handoff Phase 4-6

**Stato**: in corso, NON ancora iniziata implementazione

Federico ha consegnato il vero pacchetto handoff Claude Design completo
(`FEA_Pro_Design_System-handoff.zip`) con 22 schermate hi-fi autoritative.

### Documenti maestri ricevuti

| File | Cosa |
|---|---|
| `DESIGN_HANDOFF.md` | Documento maestro. Regola d'oro: "quando codice diverge dal mockup, vince il mockup" |
| `SKILL.md` | Skill `fea-pro-design` con 7 UX principles + 10 brand musts |
| `uploads/UX_REDESIGN_BRIEF.md` | Brief originale Federico → Claude Design con 20 finding Paoletto + persona |
| `Sitemap.html` | Hub navigabile 8 sezioni · 22 schermate marcate `done` |
| `colors_and_type.css` + `src/tokens.css/ts` | Tokens v2.1 (già in repo) |
| `Inspector_reference.html` (1671 righe) | Inspector spec: 6 stati + 3 bonus + interaction sequences |

### Pending da Claude Design

1. **Mockup mobile aggiuntivi** (~11 schermate residue del UX_REDESIGN brief)
2. **NumericInput convertitore unità spec** (finding Paoletto #11)

### Stato implementazione vs mockup autoritativi

| Sezione | Schermate | Implementato | Match |
|---|---|---|---|
| 00 Foundation (tokens) | 3 | ✅ in repo | **100%** |
| 03 Studio Risultati (Nuovo Guscio) | Shell custom | ✅ v2.6.x | **~90%** |
| 02 Dashboard new | 1 | ⚠️ home v2.6.6 | **~20%** |
| 01 Auth (4 stati) | Auth.html | ❌ legacy esistente | **~10%** |
| 02 Templates | Templates.html | ⚠️ galleria v2.5.x | **~30%** |
| 02 Percorso UC1 | Percorso UC1.html | ⚠️ Wizard inline | **~20%** |
| 03 Studio Modello | Studio Modello.html | ⚠️ MakePanel | **~30%** |
| 03 Studio Analisi | Studio Analisi.html | ⚠️ SolvePanel | **~25%** |
| 03 Studio Verifiche | Studio Verifiche.html | ⚠️ VerifyPanel | **~40%** |
| 03 Studio I/O | Studio IO.html | ⚠️ ToolsPanel | **~25%** |
| 04 Dialogs | Dialogs.html | ❓ esistono ma layout diverso | **~30%** |
| 05 Settings | Settings.html | ❌ legacy | **~10%** |
| 06 States | States.html (4 stati) | ⚠️ parziale | **~25%** |
| 07 Mobile | Mobile.html | ❌ legacy MobileTabbar | **~5%** |

**Media handoff design system**: **~25%**

### Phase 4-6 roadmap (DESIGN_HANDOFF.md §8)

| Brief | Phase | Stima |
|---|---|---|
| `v2.7.0-auth-mockup-driven` | 4.1 Auth (4 stati) | ~8-9h · brief PRONTO |
| `v2.7.1-dashboard-mockup-driven` | 4.2 Dashboard new | ~10-12h |
| `v2.7.2-templates-percorsi` | 4.3 Templates + Percorso UC1 | ~12-14h |
| `v2.7.3-studio-modello` | 5.1 Studio Modello (usa Inspector) | ~8-10h |
| `v2.7.4-studio-analisi` | 5.2 Studio Analisi (usa Inspector) | ~6-8h |
| `v2.7.5-studio-verifiche` | 5.3 Studio Verifiche (usa Inspector) | ~8-10h |
| `v2.7.6-studio-io` | 5.4 Studio I/O | ~6-8h |
| `v2.7.7-dialogs-wizards` | 6.1 Dialogs (Dialogs.html 5 dialog) | ~10-12h |
| `v2.7.8-states-settings` | 6.2 States + Settings | ~6-8h |
| `v2.7.9-mobile-refactor` | 6.3 Mobile (richiede 11 mockup extra) | ~8-10h |
| **Totale Phase 4-6** | | **~75-95h** |

### Brief operativo immediato

**`v2.7.0-auth-mockup-driven.md`** pronto in
`/mnt/user-data/outputs/BRIEF_v2.7.0-auth-mockup-driven.md`.

8 sprint atomici + rollup, 15 decisioni anticipate locked, smoke visivo
checklist 46/46 obbligatorio.

### File handoff da committare nel repo

```
docs/design_handoff/
├── FEA_Pro_Design_System-handoff.zip          (pack autoritativo)
├── Inspector_reference.html                    (1671 righe)
├── [mobile mockup aggiuntivi quando arrivano]
└── [NumericInput spec quando arriva]
```

---

## 1. Pipeline 2026-05-26/27 chiusa

5 brief consecutivi · 5 deploy verdi · ~14 ore lavoro:

| Tag | Cosa | Deploy |
|---|---|---|
| `v2.6.3-precision-handoff` | rollup compound 5-sprint precision wiring | v89 |
| `v2.6.3.1-precision-wiring-fix` | fix P0 ChecksDetailTable + PercorsiBeamWizard | v90 |
| `v2.6.4-precision-completion` | OnboardingTour + Insight + Empty states + WCAG | v91 |
| `v2.6.5-dashboard-a1-composition` | LeftRail expanded + RecentModels Shell custom | v92 |
| `v2.6.6-home-legacy-shell-refactor` | Stesso refactor su chrome legacy home | v93 |

### Baseline tecnica corrente (post v2.6.6)

- pytest: **1688 collected**, ~99.9% PASS, 1 FAIL noto (USGS network)
- vitest: **816/816 PASS** (99 file)
- tsc: 0 errori
- build main: 1316.90 kB / gzip 387.64 kB
- Playwright E2E live: 8/8 PASS (3 v2.6.2 + 5 v2.6.6)
- Deploy verificato visualmente 12/13 ✅ desktop

### Carry-over tecnico

| Item | Priorità | Stima |
|---|---|---|
| CSP frame-src fix preventivo | P1 | 30min |
| Radix Dialog titles a11y | P1 | 30min |
| WCAG full audit | P2 | 2-3h |
| DEC-A1 workspace store legacy cleanup | P1 | 1-2h |
| Migration legacy `CommandPalette.tsx` → `usePaletteDispatch` | P2 | 1-2h |
| 25 callsite `disabled={!model}` → `FeatureButton` | P1 | 2h |
| 30 caller Categoria B `toastApiError` | P2 | 3h |
| Migration Button → Button2 | P2 | 2-3h |
| Backend timestamp sort Recent | P2 | 2-3h |
| Jobs cronologia panel placeholder | P2 | 4-6h |

### Carry-over commerciale

- **Stripe live setup** (~3-5 giorni) — sblocca billing
- **Test sessione Paolo** (30-60min)
- **Catalogo tubolari + sezioni custom** (~2-3 giorni)

---

## 2. Convenzioni progetto

- Branch standard: `test`. Worktree: `design-rebuild/v2.6`
- Versioning: `vN.M.X-slug`, `vN.M.X.y-slug` hotfix, rollup compound
- Sync test↔main solo al rollup finale
- OPERATING_RULES v3 baseline: pytest 1688, vitest 695→816
- Deploy Fly.io region `fra` single-instance rolling
- localStorage `feapro:rail:expanded`
- Pattern `data-testid` per E2E robusti
- Pattern mockup-driven Phase 4-6: "vince il mockup"

---

## 3. Pattern mockup-driven (regola d'oro Phase 4-6)

Da `DESIGN_HANDOFF.md`:
> "Quando il codice React diverge dal mockup, vince il mockup. Se hai dubbi
> su un dettaglio, apri il mockup, ispeziona, copia i valori dal CSS computato."

**Workflow per ogni brief**:
1. Leggi mockup HTML autoritativo (full file)
2. Estrai CSS dedicato (copia verbatim in `frontend/src/styles/`)
3. Traduci HTML → React mantenendo class names
4. JS vanilla → useEffect/useState/event handlers
5. Backend integration via store esistenti
6. Smoke E2E composition-level
7. **Smoke visivo manuale checklist obbligatorio**

### Lezioni cumulative v2.6.x (documentate)

- Token-level audit ≠ handoff completo
- Smoke E2E base ≠ verifica composition
- Federico è fonte di verità sul scope
- "100% reale" senza smoke visivo manuale = errore PM

---

## 4. File project knowledge

**Vivi**:
- `PROJECT_STATE.md` (questo) — stato attuale
- `OPERATING_RULES.md` v3 — regole permanenti
- `HANDOFF_MESSAGE.md` — testo standard nuove chat
- `FEA_PRO_CAPABILITY_MAP.md` v2.0

**Da committare in repo** (Phase 4-6 prereq):
- `docs/design_handoff/FEA_Pro_Design_System-handoff.zip`
- `docs/design_handoff/Inspector_reference.html`
- Brief Phase 4-6 in `/mnt/user-data/outputs/`

---

**Prossimo passo raccomandato**: aspetta arrivo 2 file pending Claude Design
(mobile + NumericInput) prima di lanciare brief `v2.7.0`. Quando arrivano,
salvali nel repo + io aggiorno questo PROJECT_STATE + lancio brief v2.7.0
quando confermi.
