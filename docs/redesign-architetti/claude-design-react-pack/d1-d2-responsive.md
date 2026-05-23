# D1 / D2 · Responsive specs · mobile + tablet

> Workspace mobile (D1) e tablet (D2) — riferimento mockup Claude Design.
> Tailwind breakpoints custom (vedi `tailwind.config.js`):
>
> ```
> sm: 768px   → tablet portrait
> md: 1024px  → tablet landscape / desktop minimo
> lg: 1280px  → desktop standard
> xl: 1440px  → desktop wide
> ```

## Mobile (<768px) · D1

### Layout
- `<WorkspaceLayout>` collassa: nasconde leftRail, rightRail, rightPanel.
- Il `<MobileTabbar>` (già esistente) prende il posto della LeftRail in basso.
- Il `viewport` occupa il 100% dello schermo tra topbar (40px) e tabbar (52px).
- I drill-in (Make / Solve / Verify) aprono `<MobilePanel>` full-screen
  con back button in alto a sinistra.

### TopBar mobile
- 40px altezza (vs 48px desktop).
- Logo + Model menu condensato + Avatar.
- Search ⌘K nascosta — apribile via long-press sul logo o gesture.

### Tabbar
- 5 voci: Modello / Make / Solve / Risultati / Altro.
- 52px altezza con safe-area-inset-bottom su iOS.
- Active state: bordo top 2px accent + icon accent.
- Tabbar fissa con `position: sticky; bottom: 0`.

### Touch targets
- Tutti i bottoni primari ≥ 44×44px (iOS HIG).
- Stepper Percorsi: in mobile diventa `compact` (solo dot, no label) per
  risparmiare spazio. Label visibile in modal "Tutti gli step" via click
  sul current step.

### Animazioni mobile
- `<MobilePanel>` apre con `animate-slide-up` (220ms).
- Drill-in dentro al panel: `animate-slide-right`.
- Back: `animate-slide-left`.

## Tablet (768-1280px) · D2

### Layout
- LeftRail compatta a 56px (solo icone, no label).
- RightRail visibile (56px).
- RightPanel (ModelInfoCard) ridotto a 220px (vs 296px desktop) per
  lasciare spazio al viewport.
- LeftPanel slide-in: 320px (vs 384px desktop).
- MissionBar visibile, occupa lo span sopra il viewport.

### TopBar tablet
- 48px (uguale desktop).
- Search: 240px (vs 320px desktop).
- Esegui button label ridotto a "Esegui" (no "Esegui analisi").

### Stepper Percorsi tablet
- Modalità `full` (con label) ma label troncate via `truncate`.
- Quando 6 step + tablet 1024px: `compact` automatico (decisione del consumer
  via media query).

### Esempio responsive del WorkspaceLayout

```tsx
import { useMediaQuery } from "../../hooks/useMediaQuery";

function Workspace() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1279px)");

  return (
    <WorkspaceLayout
      topbar={<TopBar />}
      missionBar={<MissionBar />}
      leftRail={isMobile ? null : <LeftRail compact={isTablet} />}
      leftPanelWidth={isTablet ? 320 : 384}
      viewport={<Viewport3D />}
      rightRail={isMobile ? null : <RightRail />}
      rightPanel={isMobile ? null : <ModelInfoCard />}
      rightPanelWidth={isTablet ? 220 : 296}
      statusBar={<StatusBar />}
    />
  );
}
```

## Reference

- `screens/D1-mobile-workspace.html` (Claude Design originale)
- `screens/D2-tablet-workspace.html`
- `src/components/shell/MobileTabbar.tsx` (esistente)
- `src/components/shell/MobilePanel.tsx` (esistente)
