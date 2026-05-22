# FEA Pro v1.7.0-ui-coerence · Report

> Data chiusura: 2026-05-22
> Branch: `test` (sincronizzato con `main` su `origin`)
> Tag: `v1.7.0-ui-coerence`
> Deploy live: https://fea-pro.fly.dev/

---

## Sintesi

Sprint v1.7 "coerenza UI" eseguito in modalità atomica BEFORE → modifica
→ AFTER → diff → commit → sync → deploy → STOP. **6 task, 6 commit
atomici**, ognuno deployato in produzione subito dopo il sync. Nessuna
nuova feature: solo allineamento del design system esistente al
`mockup_reference.html` fornito col brief.

Risultato: hub-card uniformi su Make/Solve/Verify/Inspect/Tools, esegui
verde emerald, dismiss UX senza crocette, topbar/tabbar mobile con
respiro.

---

## Task completati

| # | Tema | Commit | File toccati |
|---|---|---|---|
| T1 | Hub-icon palette tokens (6 toni info/success/purple/coral/warn/**gray**) | `4e56aa7` | tailwind.config, PanelHubNav, ToolsHub |
| T2 | InspectPanel hub-first coerente con Make/Solve/Verify | `67f0539` | InspectPanel, shell/types |
| T3 | Drill-in: bottone Esegui verde emerald uniforme | `604eb03` | Button, Pushover/Nonlinear/ArcLengthPanel |
| T4 | ElementDialog + LibraryPicker mobile no overflow | `07bd204` | LibraryPicker, ElementDialog |
| T5 | Dismiss UX: rimosse crocette modal | `4c50b7e` | Dialog, TemplateGallery, WizardShell, LibraryPicker, Dialog.test |
| T6 | Topbar respiro + MobileTabbar 56px tono info-40 | `068fea1` | TopBar, MobileTabbar |

---

## Quality gates (uguali in ogni commit, mai regrediti)

| Gate | Risultato |
|---|---|
| `pnpm tsc --noEmit` | **0 errori** |
| `pnpm test --run` (vitest) | **55 file / 447 verdi** (uguale a v1.6.1-polish baseline) |
| `pnpm build` | success (gzip 358 kB index, 232 kB three, 152 kB charts) |
| `git ls-remote origin main test` | sempre stesso SHA dopo ogni sync |
| Deploy Fly.io | **6 deploy live** (uno per task), HTTP 200 su /api/health |

---

## Effetti visivi concreti

### Hub-card (T1+T2)
- 6 toni centralizzati: `info / success / purple / coral / warn / gray`.
- Single source of truth: `TONE_STYLE` in `PanelHubNav`.
- ToolsHub refactored per usare `<PanelHub>` componente (no duplicazione).
- InspectPanel convertito da tab-bar a hub-first (5 card: statica/modale/
  dinamica/iso3d/fatica).

### Drill-in (T3)
- Bottone Esegui (statica, modale, buckling, pushover, non-lineare,
  arc-length) ora usa `Button variant="run"` con gradient emerald
  `from-emerald-500 to-emerald-600`. **Eliminati hex hardcoded**
  (#1da97a, #138855) — palette emerald-* Tailwind centralizzata.
- CostPreviewCard gradient blu→purple già coerente da prima.
- PanelBreadcrumb sticky già presente in tutti i 4 panel.

### Mobile UX (T4+T6)
- LibraryPicker: stack su mobile (famiglie come chip orizzontale), 2-cols su md+.
- ElementDialog: ID+Tipo stack su <640px, no overflow del select Tipo.
- TopBar mobile: padding 12px + gap 8px (era 8/6) → più respiro.
- MobileTabbar: height fissa 56px (h-14), stato attivo `bg-bg-info/40`.

### Dismiss UX (T5)
- **15+ modal perdono la crocetta X** (in cascata da `Dialog.tsx` base).
- Dismiss via: ESC, click-outside (con stopPropagation interno),
  swipe-back mobile (via `useModalBackButton`).
- Pannelli laterali (Make/Solve/Verify/Inspect/Tools/View) mantengono X
  perché sono "chiudi pannello", non modal.

---

## Cosa NON è stato toccato (regole brief)

- Backend: ZERO modifiche.
- Viewport 3D rendering: ZERO modifiche.
- Store / router / types architecture: invariati (eccetto micro-fix
  `setRightTab` signature per coerenza con `setLeftTab`).
- Nessuna nuova feature.
- Nessun nuovo design system (riusati i tokens esistenti).

---

## Screenshots audit

Cartella `.codex-temp/` (gitignored):
- `before-T{1..6}-{mobile,desktop}-{01-dashboard,08-palette}.png`
- `after-T{1..6}-{mobile,desktop}-{01-dashboard,08-palette}.png`
- `diff-T{1..6}.md` (uno per task, dettaglio modifiche)

**Limite documentato**: backend offline durante audit → galleria
template vuota → screenshot delle hub-card Make/Solve/Verify/Inspect
non catturati via Playwright. Il diff reale è visibile in produzione su
https://fea-pro.fly.dev caricando un template.

---

## Problemi residui / debiti tecnici

Nessuno introdotto in v1.7. Restano i debiti già noti da audit
precedenti:
- `R4` Engine GPU senza glow per selected (v1.6.1 audit).
- `P2` Bundle gzip 358 kB (warning >700 kB) — dynamic import in v1.8.
- Mockup target `Percorsi` (v0.3 mockup_pack 02-08) richiede sprint
  feature dedicato — vedi `docs/UI_GAP_ANALYSIS.md`.

---

## Prossima milestone consigliata

**v1.8.0 — Product Alignment Sprint** (raccomandazione UI Gap Analysis):
- Naming Studio Pro / Percorsi nel codice (workspaceStore rename).
- CTA doppia su Home (Studio Pro / Percorsi blu + verde emerald).
- Placeholder "Percorsi" non funzionale (apre toast "v1.9").
- Token `--c-accent-percorsi` come 2° asse semantico.

Da fare prima del Demo Slice "Verifica telaio 2D" (~6-10 settimane,
flagship feature).

---

## Comando di chiusura

```bash
git tag -a v1.7.0-ui-coerence -m "v1.7.0-ui-coerence — 6 task coerenza UI"
git push origin v1.7.0-ui-coerence
```

**Demo coerente pronta. Stabilità prima di tutto.** 🟢
