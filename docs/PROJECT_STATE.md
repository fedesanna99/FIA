# PROJECT STATE · FEA Pro

> Stato vivo del progetto. Aggiornare a fine di ogni sprint.
> Letto a inizio di ogni nuova chat.

**Ultimo aggiornamento**: 2026-05-26 (sera)
**Versione corrente**: `v2.6.3.1-precision-wiring-fix`
**Branch attivo**: `design-rebuild/v2.6` (= `origin/test`)
**Ultimo SHA**: post-tag rollup wiring-fix (vedi `git rev-parse HEAD`)
**⚠ Decisione strategica attiva**: Wiring fix architettonico applicato (BUG-#1 ChecksDetailTable + BUG-#2 PercorsoStep). Handoff Precision v2.0 ora visibile come da design.

---

## 1. Decisione strategica corrente

Compound **v2.6.3-precision-handoff** chiuso il 2026-05-26. La Shell
custom in `frontend/src/shell/` resta intatta (Opzione 1 confermata). I 7
componenti dell'handoff Precision v2.0 sono droppati come design system
additivo per i workspace content (Verify, Percorsi, Dashboard,
Report dialog, MakePanel hub-cards, InsightPanel post-solve).

### Prossime scelte aperte

1. **Sessione Paolo (Tier 1)**: validation utente reale sul deploy live
   v2.6.3 (30-60 min user time, no Claude Code)
2. **Strada A · Mobile rebuild** (`v2.6.4-mobile-shell`, ~3-4h): estendere
   `useNewShell` removendo `!isMobile`, adattare Shell con responsive
   ≤md, integrare MobileTabbar nella nuova Shell
3. **OnboardingTour spotlight refactor** (`v2.6.5-onboarding-spotlight`,
   ~4h): migra da welcome-modal a vera spotlight tour
4. **Hub-card axis-tag pattern uniformato** (`v2.6.4-hub-axis-tag`,
   ~1-2h): estende `PanelHubNav.tsx` con `axisTag?` prop applicato a
   tutti i panel hub

## 2. Stato sintetico tecnico

Aggiornato dopo compound v2.6.3-precision-handoff:

- **Frontend Shell custom**: 6 shell components + 6 floating HUD + useTheme,
  desktop-first con codepath legacy per mobile
- **Design system Soft v2.1**: Plus Jakarta Sans + Inter + JetBrains Mono,
  tokens.css + Tailwind mapping completo (utility Precision esposte come alias)
- **Drop-in Precision v2.0**: 7 componenti in `components/shell/`
  (TrustLayerBadge, PercorsoStep, InsightPanel, ChecksRail,
  ChecksDetailTable, ModelsTable, WorkspaceLayout) — tutti coperti da
  vitest (+31 nuovi test)
- **Wiring nei consumer**:
  - ChecksRail+ChecksDetailTable → VerifyPanel/VerifyChecksLive ✅
  - PercorsoStep → PercorsoFullScreenDemo ✅
  - ModelsTable → ModelliBrowser ✅
  - TrustLayerBadge banner → ReportExportDialog ✅
  - InsightPanel post-solve → ResultsInsightAuto ✅
- **Backend**: nessuna modifica in tutto il compound (pytest 1677
  collected invariato)

## 3. Sprint chiusi recenti (cronologia)

| Tag | Tipo | Cosa ha chiuso |
|---|---|---|
| `v2.6.1-foundation` | foundation | Tokens Soft v2.1 + Plus Jakarta + Inter + lib install |
| `v2.6.2-shell` | feat | Studio Pro Shell rebuild (6 shell + 6 HUD + theme) |
| `v2.6.2-shell-deploy` | deploy | Fly.io release v86 |
| `v2.6.2-shell-smoke-live` | E2E | Smoke live 3 test (F1/F2/F3 trovati) |
| `v2.6.2.1-shell-polish` | fix | F1 ViewportHud legacy + F2 palette registry + F3 slug semantico |
| `v2.6.2.2-mobile-hud-quickfix` | fix mobile | M1 chip overlap + M2 truncate + M3 tabs schiacciati |
| `v2.6.3.0-precision-tokens` | foundation | Tailwind utility mapping caretColor + precision-pulse-ring |
| `v2.6.3.1-precision-dropin` | test | 7 componenti drop-in (già presenti) + 31 vitest nuovi |
| `v2.6.3.2-precision-verify-percorsi` | docs | Validazione ChecksRail+Table+PercorsoStep wired |
| `v2.6.3.3-precision-dashboard-report` | docs | Validazione ModelsTable+TrustLayer+Insight wired |
| `v2.6.3.4-precision-anim-responsive` | docs | Animations+responsive validation |
| `v2.6.3-precision-handoff` (rollup) | rollup | Tag finale + sync test↔main + deploy + smoke E2E live |
| `v2.6.3.1-precision-wiring-fix` | fix P0 ×2 | VerifyPanel → workspace takeover (ChecksDetailTable readable). PercorsiBeamWizard → full-page overlay con PercorsoStep template wrap. Fix architettonico post-audit BUG-#1+#2. |

## 4. Baseline test (aggiornata)

- **pytest**: 1677 collected (invariato, no backend changes)
- **vitest**: **732/732 PASS** (92 file, +6 nuovi vs v2.6.3 stato 726)
- **tsc**: 0 errori
- **build**: ~1301 kB main (gzip ~382 kB, delta +0.12 kB gzip)
- **smoke E2E live**: pending verifica post-deploy v90+

## 5. Carry-over P1/P2 (NON in scope di questo compound)

### Tier 1 (subito dopo deploy)

- **Sessione Paolo · validation utente** (~30-60 min)

### Tier 2 (post-Paolo)

- **Strada A · Mobile rebuild dentro nuova Shell** (`v2.6.4-mobile-shell`, 3-4h)
- **Fase 3 desktop · Workspace content refactor** (`v2.6.4-workspace-content`, 3-4h)

### Tier 3 (tech debt)

- DEC-A1 workspace store legacy cleanup (1-2h, P1)
- Migration legacy `CommandPalette.tsx` → `usePaletteDispatch` (1-2h, P2)
- 25 callsite `disabled={!model}` → `FeatureButton` (P1)
- 30 caller Categoria B `toastApiError` migration (P2)
- Migration Button → Button2 50+ callsite (2-3h)
- Rimozione Inter Tight font (15 min)

### Tier 4 (polish opzionale)

- ShellCommandPalette polish e2 (caret-accent, footer counter, close
  animation reverse, ~1h totale)
- OnboardingTour spotlight refactor (`v2.6.5-onboarding-spotlight`, ~4h)
- Hub-card axis-tag pattern uniformato (`v2.6.4-hub-axis-tag`, ~1-2h)
- PDF preview iframe + TrustLayerBadge watermark in ReportExportDialog
  (~2-3h)
- Touch gestures viewport mobile (pinch zoom, two-finger pan, ~2h)
- Mobile landscape orientation (~1h)
- Smoke E2E webkit reale (richiede `npx playwright install webkit` su CI)
