/**
 * Visual Audit · genera report HTML side-by-side live vs mockup (23 schermate).
 *
 * Output:
 *   ../.claude/tmp-screenshots/visual-audit/*.png
 *   ../.claude/tmp-screenshots/visual-audit/index.html
 *
 * Storage state da ../.claude/tmp-screenshots/storage-state.json
 * (estratto manualmente dal Chrome live tramite javascript_tool).
 *
 * Mockup serviti da http://localhost:8765/ (python http.server).
 *
 * Coverage attesa:
 *   - Auth × 4 (FULL coverage live vs mockup)
 *   - Dashboard / (FULL — Federico è loggato)
 *   - 404 (FULL)
 *   - Mobile login a viewport 375 (FULL — responsive test)
 *   - Tutto il resto: placeholder con nota "Brief Phase X.Y atteso"
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "fs/promises";

const OUT = "../.claude/tmp-screenshots/visual-audit";
await mkdir(OUT, { recursive: true });

const LIVE = "https://fea-pro.fly.dev";
const MOCKUP_BASE = "http://localhost:8765/fea-pro-design-system/project/ui_kits";
const STORAGE = "../.claude/tmp-screenshots/storage-state.json";

const PAIRS = [
  // ── 01 Auth (v2.7.0 deployed) ────────────────────────────────────────────
  { key: "auth-login",  label: "Login",                  section: "01 Auth · v2.7.0 LIVE",
    mockup: "webapp_desktop/Auth.html",      mockupShowState: "login",
    liveUrl: "/login",            needsAuth: false, viewport: { width: 1440, height: 900 } },
  { key: "auth-signup", label: "Signup",                 section: "01 Auth · v2.7.0 LIVE",
    mockup: "webapp_desktop/Auth.html",      mockupShowState: "signup",
    liveUrl: "/signup",           needsAuth: false, viewport: { width: 1440, height: 900 } },
  { key: "auth-forgot", label: "Forgot password",        section: "01 Auth · v2.7.0 LIVE",
    mockup: "webapp_desktop/Auth.html",      mockupShowState: "forgot",
    liveUrl: "/forgot-password",  needsAuth: false, viewport: { width: 1440, height: 900 } },
  { key: "auth-verify", label: "Email verify",           section: "01 Auth · v2.7.0 LIVE",
    mockup: "webapp_desktop/Auth.html",      mockupShowState: "verify",
    liveUrl: "/verify-email",     needsAuth: false, viewport: { width: 1440, height: 900 } },

  // ── 02 Hub (Phase 4.2 — v2.7.1 brief atteso) ────────────────────────────
  { key: "dashboard",   label: "Dashboard new (home)",   section: "02 Hub · v2.7.1 brief atteso",
    mockup: "webapp_desktop/Dashboard new.html",
    liveUrl: "/",                 needsAuth: true,  viewport: { width: 1440, height: 900 } },
  { key: "templates",   label: "Templates gallery",      section: "02 Hub · v2.7.2 brief atteso",
    mockup: "webapp_desktop/Templates.html",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: TemplateGalleryDialog è un overlay (no route dedicata). Richiede interazione." },
  { key: "percorso-uc1", label: "Percorso UC1 stepper",  section: "02 Hub · v2.7.2 brief atteso",
    mockup: "webapp_desktop/Percorso UC1.html",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: PercorsiBeamWizard è un wizard inline. Mockup è full-screen step." },

  // ── 03 Studio workspaces (Phase 5 — v2.7.3 → v2.7.6 brief attesi) ───────
  { key: "studio-modello",   label: "Studio · Modello",  section: "03 Studio Pro · v2.7.3 brief atteso",
    mockup: "webapp_desktop/Studio Modello.html",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Richiede modello caricato + workspace switch. Live: MakePanel ~30%." },
  { key: "studio-analisi",   label: "Studio · Analisi",  section: "03 Studio Pro · v2.7.4 brief atteso",
    mockup: "webapp_desktop/Studio Analisi.html",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: SolvePanel ~25%." },
  { key: "studio-verifiche", label: "Studio · Verifiche", section: "03 Studio Pro · v2.7.5 brief atteso",
    mockup: "webapp_desktop/Studio Verifiche.html",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: VerifyPanel ~40%." },
  { key: "studio-io",        label: "Studio · I/O",     section: "03 Studio Pro · v2.7.6 brief atteso",
    mockup: "webapp_desktop/Studio IO.html",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: ToolsPanel ~25%." },
  { key: "nuovo-guscio",     label: "Nuovo Guscio (Shell rebuild)", section: "03 Studio Pro · v2.6.x DONE",
    mockup: "webapp_desktop/Nuovo Guscio.html",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: Shell custom v2.6.x già implementata ~90% (TopBar + LeftRail + StatusBar). Richiede modello caricato per visualizzare." },
  { key: "inspector-ref",    label: "Inspector spec",   section: "03 Studio Pro · spec reference",
    mockup: "webapp_desktop/Inspector reference.html",
    liveUrl: null,                needsAuth: false, viewport: { width: 1440, height: 900 },
    note: "Spec doc 1671 righe — interaction sequences per dialog inspector (non page diretta)." },

  // ── 04 Dialogs (Phase 6 — v2.7.7 brief atteso) ──────────────────────────
  { key: "dialog-node",  label: "Modifica Nodo",         section: "04 Dialogs · v2.7.7 brief atteso",
    mockup: "webapp_desktop/Dialogs.html#node",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: NodeDialog esistente ma layout diverso." },
  { key: "dialog-load",  label: "Aggiungi Carico",       section: "04 Dialogs · v2.7.7 brief atteso",
    mockup: "webapp_desktop/Dialogs.html#load",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: LoadDialog esistente, layout diverso." },
  { key: "dialog-mesh",  label: "Mesh Parametrica",      section: "04 Dialogs · v2.7.7 brief atteso",
    mockup: "webapp_desktop/Dialogs.html#mesh",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: MeshWizardDialog esistente." },
  { key: "dialog-new",   label: "Nuovo Modello",         section: "04 Dialogs · v2.7.7 brief atteso",
    mockup: "webapp_desktop/Dialogs.html#new",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: NewModelDialog esistente." },

  // ── 05 Settings (Phase 6 — v2.7.8 brief atteso) ─────────────────────────
  { key: "settings",     label: "Settings · Account",    section: "05 Settings · v2.7.8 brief atteso",
    mockup: "webapp_desktop/Settings.html",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: AccountDialog legacy ~10%. Sezioni Profilo/Billing/API keys/Preferenze." },

  // ── 06 States (Phase 6 — v2.7.8 brief atteso) ───────────────────────────
  { key: "state-solver", label: "Solver running",        section: "06 States · v2.7.8 brief atteso",
    mockup: "webapp_desktop/States.html#solver",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: LoadingScreen + SolverPhase esistente. Mockup mostra HUD overlay." },
  { key: "state-empty",  label: "Empty (nessun modello)", section: "06 States · v2.7.8 brief atteso",
    mockup: "webapp_desktop/States.html#empty",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: home dashboard mostra empty state v2.6.6 (RecentModelsGrid empty)." },
  { key: "state-error",  label: "Solver fallito",        section: "06 States · v2.7.8 brief atteso",
    mockup: "webapp_desktop/States.html#error",
    liveUrl: null,                needsAuth: true,  viewport: { width: 1440, height: 900 },
    note: "Live: toast error generic, mockup ha pannello dedicato." },
  { key: "state-404",    label: "404 not found",         section: "06 States · v2.7.8 brief atteso",
    mockup: "webapp_desktop/States.html#404",
    liveUrl: "/this-route-does-not-exist", needsAuth: false, viewport: { width: 1440, height: 900 },
    note: "Live: l'app è SPA — qualsiasi route sconosciuta cade nel fallback. Verifico cosa mostra." },

  // ── 07 Mobile (Phase 6.3 — v2.7.9 brief atteso) ─────────────────────────
  { key: "mobile-login", label: "Mobile · Login (responsive auth)", section: "07 Mobile · v2.7.0 DONE responsive",
    mockup: "webapp_desktop/Auth.html",      mockupShowState: "login",
    liveUrl: "/login",            needsAuth: false, viewport: { width: 375, height: 812 } },
  { key: "mobile-dashboard", label: "Mobile · Dashboard", section: "07 Mobile · v2.7.9 brief atteso",
    mockup: "mobile_redesign/Mobile dashboard.html",
    liveUrl: "/",                 needsAuth: true,  viewport: { width: 375, height: 812 },
    note: "Mockup è solo wireframe del dashboard mobile, non screenshot completo." },
];

const browser = await chromium.launch();
const results = [];

for (const p of PAIRS) {
  const res = { ...p, liveOk: false, mockupOk: false };
  const vp = p.viewport ?? { width: 1440, height: 900 };

  // ── Mockup screenshot ──────────────────────────────────────────────────
  try {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const mockupUrl = `${MOCKUP_BASE}/${p.mockup.replace(/ /g, "%20")}`;
    await page.goto(mockupUrl, { waitUntil: "networkidle", timeout: 15_000 });
    if (p.mockupShowState) {
      await page.evaluate((state) => {
        document.querySelectorAll(".auth-card").forEach((c) => {
          c.style.display = c.dataset.state === state ? "flex" : "none";
        });
        const tabs = document.querySelector(".state-tabs");
        if (tabs) tabs.style.display = "none";
        window.scrollTo(0, 0);
      }, p.mockupShowState);
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${p.key}-mockup.png`, fullPage: false });
    res.mockupOk = true;
    await ctx.close();
  } catch (e) {
    console.error(`[${p.key}] mockup ERROR: ${e.message}`);
  }

  // ── Live screenshot (solo se liveUrl) ──────────────────────────────────
  if (p.liveUrl) {
    try {
      const ctx = p.needsAuth
        ? await browser.newContext({ viewport: vp, deviceScaleFactor: 1, storageState: STORAGE })
        : await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(`${LIVE}${p.liveUrl}`, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${OUT}/${p.key}-live.png`, fullPage: false });
      res.liveOk = true;
      await ctx.close();
    } catch (e) {
      console.error(`[${p.key}] live ERROR: ${e.message}`);
    }
  }

  console.log(`[${p.key}] mockup=${res.mockupOk ? "OK" : "FAIL"} live=${res.liveOk ? "OK" : "SKIP"}`);
  results.push(res);
}

await browser.close();

// ── Generate index.html ─────────────────────────────────────────────────
const sectionGroups = {};
for (const r of results) {
  if (!sectionGroups[r.section]) sectionGroups[r.section] = [];
  sectionGroups[r.section].push(r);
}

const stats = {
  total: results.length,
  fullCoverage: results.filter(r => r.liveOk && r.mockupOk).length,
  mockupOnly: results.filter(r => !r.liveOk && r.mockupOk).length,
};

const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>FEA Pro · Visual Audit (live vs mockup)</title>
<style>
  :root {
    --ink: #15161a; --ink-dim: #6b7280; --bg: #fafafa; --bg-card: #fff;
    --border: #e5e7eb; --accent: #0891b2; --ok: #16a34a; --warn: #f59e0b; --err: #dc2626;
  }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--ink); margin: 0; padding: 24px; max-width: 1600px; margin: 0 auto; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  .sub { color: var(--ink-dim); font-size: 14px; margin-bottom: 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; }
  .stat-v { font-size: 22px; font-weight: 700; color: var(--accent); }
  .stat-k { font-size: 11px; color: var(--ink-dim); text-transform: uppercase; letter-spacing: 0.05em; }
  h2 { margin: 32px 0 12px; font-size: 16px; padding: 8px 12px; background: var(--bg-card); border-left: 4px solid var(--accent); border-radius: 4px; font-weight: 700; }
  .pair { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
  .pair-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; }
  .pair-title { font-weight: 700; font-size: 16px; }
  .pair-meta { font-size: 11px; color: var(--ink-dim); font-family: ui-monospace, monospace; margin-top: 2px; }
  .pair-status { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
  .status-ok { background: rgba(22,163,74,0.12); color: var(--ok); }
  .status-warn { background: rgba(245,158,11,0.12); color: var(--warn); }
  .status-err { background: rgba(220,38,38,0.12); color: var(--err); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .col { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #f5f5f5; }
  .col-head { padding: 6px 10px; background: var(--bg); font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-dim); border-bottom: 1px solid var(--border); }
  .col img { width: 100%; height: auto; display: block; cursor: pointer; transition: transform 0.15s; }
  .col img:hover { transform: scale(1.005); }
  .col .placeholder { padding: 60px 20px; text-align: center; color: var(--ink-dim); font-size: 13px; line-height: 1.6; }
  .placeholder b { color: var(--ink); }
  .note { font-size: 12px; color: var(--ink-dim); padding: 10px 0 0; border-top: 1px dashed var(--border); margin-top: 10px; line-height: 1.5; }
</style>
</head>
<body>
<h1>FEA Pro · Visual Audit live vs mockup</h1>
<div class="sub">
  Generato il ${new Date().toISOString()} · 23 schermate del pack handoff Claude Design v0.3 confrontate con la live <code>${LIVE}</code>.
</div>
<div class="stats">
  <div class="stat"><div class="stat-v">${stats.total}</div><div class="stat-k">Pairs totali</div></div>
  <div class="stat"><div class="stat-v">${stats.fullCoverage}</div><div class="stat-k">Live + mockup ✓</div></div>
  <div class="stat"><div class="stat-v">${stats.mockupOnly}</div><div class="stat-k">Solo mockup (brief atteso)</div></div>
</div>

${Object.entries(sectionGroups).map(([section, items]) => `
<h2>${section}</h2>
${items.map((r) => {
  const statusClass = r.liveOk ? "status-ok" : (r.liveUrl ? "status-warn" : "status-err");
  const statusLabel = r.liveOk ? "✓ Live + Mockup" : (r.liveUrl ? "⚠ Live error" : "✗ Mockup only");
  return `
<div class="pair" id="${r.key}">
  <div class="pair-header">
    <div>
      <div class="pair-title">${r.label}</div>
      <div class="pair-meta">mockup: ${r.mockup}${r.liveUrl ? ` · live: ${r.liveUrl}` : " · live: —"} · viewport: ${r.viewport?.width || 1440}×${r.viewport?.height || 900}</div>
    </div>
    <div class="pair-status ${statusClass}">${statusLabel}</div>
  </div>
  <div class="grid">
    <div class="col">
      <div class="col-head">MOCKUP autoritativo</div>
      ${r.mockupOk ? `<a href="${r.key}-mockup.png" target="_blank"><img src="${r.key}-mockup.png" alt="${r.key} mockup" loading="lazy"></a>` : `<div class="placeholder">Mockup screenshot non disponibile.</div>`}
    </div>
    <div class="col">
      <div class="col-head">LIVE · ${LIVE}</div>
      ${r.liveOk ? `<a href="${r.key}-live.png" target="_blank"><img src="${r.key}-live.png" alt="${r.key} live" loading="lazy"></a>` : `<div class="placeholder">${r.liveUrl ? `Errore caricamento <b>${r.liveUrl}</b>` : `<b>Route live non esiste ancora.</b><br>Richiede brief Phase 4-6 dedicato per implementazione mockup-driven.`}</div>`}
    </div>
  </div>
  ${r.note ? `<div class="note">📝 ${r.note}</div>` : ""}
</div>
`;
}).join("\n")}
`).join("\n")}

</body>
</html>`;

await writeFile(`${OUT}/index.html`, html);
console.log(`\n${stats.fullCoverage}/${stats.total} pairs full coverage. ${stats.mockupOnly} mockup-only (brief attesi).`);
console.log(`Apri: .claude/tmp-screenshots/visual-audit/index.html`);
