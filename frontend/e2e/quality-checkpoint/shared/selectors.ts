/**
 * Selettori comuni — preferire `data-testid` su stringhe localizzate
 * (italiano cambia, testid no).
 */
export const S = {
  // Shell
  topbar: '[data-testid="topbar"]',
  leftRail: '[data-testid="left-rail-desktop"]',
  mobileTabbar: '[data-testid="mobile-tabbar"]',
  commandPalette: '[data-testid="command-palette"]',
  // Home/Dashboard
  homeCTAStudioPro: '[data-testid="home-cta-studio-pro"]',
  homeCTAPercorsi: '[data-testid="home-cta-percorsi"]',
  templateGallery: '[data-testid="template-gallery"]',
  templateCard: '[data-testid^="template-card-"]',
  // Viewport HUD
  viewportHudChip: '[data-testid="viewport-hud-chip"], [data-testid="viewport-hud-open-view"]',
  viewport: '[data-testid="viewport"], canvas',
  // Mission
  missionBar: '[data-testid="mission-bar"]',
  missionBarHint: '[data-testid="mission-bar-hint"]',
  // Panels
  panelMakeHub: '[data-testid="panel-make-hub"]',
  // Auth
  authGate: '[data-testid="auth-gate"]',
};
