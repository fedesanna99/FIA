/**
 * DashboardPage · v2.7.1 Phase 4.2 mockup-driven
 *
 * Hub home dell'app, sostituisce `components/shell/Dashboard.tsx` legacy
 * (Tailwind 95% mockup A1) con implementazione mockup-driven secondo
 * `ui_kits/webapp_desktop/Dashboard new.html` del pack handoff v0.3.
 *
 * Composizione (top → bottom):
 *   1. DashTopBar    · brand + 5-link nav + cmd-pill ⌘K + notifications +
 *                      help + avatar
 *   2. Hero          · greeting personalizzato + title + sub + usage-card
 *                      (Free tier 3/5 progetti attivi)
 *   3. ActionRow     · 3 big tile (Nuovo modello / Apri template /
 *                      Percorso guidato) — primary, purple, warn
 *   4. RecentSection · "Continua dove ti sei fermato" + seg filter
 *                      Tutti/Acciaio/CA/Sismica + grid 4 card SVG-thumb
 *   5. DualRow       · Percorsi guidati (list con progress circle) +
 *                      Changelog (4 entries NEW/FIX/IMP)
 *   6. DashFoot      · status + preliminary disclaimer + 3 link
 *
 * Backward compat con Dashboard.tsx legacy: stessi Props (models +
 * modelsUnavailable + modelsRefreshing + onRetryModels + onSelect).
 * L'integrazione in App.tsx è single-line (import alias).
 *
 * Reference: `ui_kits/webapp_desktop/Dashboard new.html` (566 righe) +
 * `dashboard-new.css` (672 righe namespaced sotto `.dash`).
 */
import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Bell, HelpCircle, LayoutGrid, ListChecks, Plus, Search,
} from "lucide-react";

import { getQuota } from "../api/billing";
import { useAuthStore } from "../store/authStore";
import { useAnalysisStore } from "../store/analysisStore";
import { APP_TAG, APP_VERSION } from "../lib/version";
import type { FEAModel } from "../types/model";

import "../styles/dashboard.css";


// v2.7.2 Phase 4.3: hook condiviso per navigare a /templates da qualsiasi
// sub-component della DashboardPage (nav link, action tile, "Vedi tutti",
// demo cards). Estratto perché useNavigate si chiama in 4 sub-components
// distinti.
function useGoTemplates(): () => void {
  const navigate = useNavigate();
  return () => navigate("/templates");
}

// v2.7.3 Phase 4.3b: hook condiviso per navigare a /percorsi/uc1 (Percorso
// guidato Use Case 1 · Trave bi-appoggiata). Usato dal tile ActionRow e
// dal link "UC1 · Trave bi-appoggiata" nell'Hero.
function useGoPercorsoUC1(): () => void {
  const navigate = useNavigate();
  return () => navigate("/percorsi/uc1");
}


interface Props {
  models: FEAModel[];
  modelsUnavailable?: boolean;
  modelsRefreshing?: boolean;
  onRetryModels?: () => void;
  onSelect: (id: string) => void;
}


export function DashboardPage({
  models,
  modelsUnavailable = false,
  modelsRefreshing = false,
  onRetryModels,
  onSelect,
}: Props) {
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id ?? "demo_user";

  const { data: quota } = useQuery({
    queryKey: ["billing-quota", userId],
    queryFn: () => getQuota(userId),
    staleTime: 30_000,
    retry: 1,
  });

  // User-visible models (esclude template "ex_*")
  const userModels = useMemo(() => models.filter((m) => !m.id.startsWith("ex_")), [models]);

  // Saluto contestuale ora del giorno
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const firstName = useMemo(() => extractFirstName(authUser?.email, authUser?.nome), [authUser]);

  // Usage card: deriva da quota.tier + progetti attivi (proxy: userModels.length)
  const tierLabel = (quota?.tier ?? "free").toUpperCase();
  const projCap = quota?.tier === "free" ? 5 : 50;
  const projUsed = Math.min(userModels.length, projCap);

  return (
    <div className="dash" data-testid="dashboard-page">
      <DashTopBar />
      <main className="dash-main">
        <Hero
          greeting={greeting}
          firstName={firstName}
          modelsCount={userModels.length}
          tierLabel={tierLabel}
          projUsed={projUsed}
          projCap={projCap}
          isRunning={isRunning}
        />
        <ActionRow />
        <RecentSection
          models={userModels}
          modelsUnavailable={modelsUnavailable}
          modelsRefreshing={modelsRefreshing}
          onRetryModels={onRetryModels}
          onSelect={onSelect}
        />
        <DualRow />
      </main>
      <DashFoot />
    </div>
  );
}


// ── DashTopBar ──────────────────────────────────────────────────────────
function DashTopBar() {
  const goTemplates = useGoTemplates();
  const openPalette = () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }));
  return (
    <header className="dash-topbar" data-testid="dash-topbar">
      <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
        <span className="brand-square">F</span>
        <div className="brand-stack">
          <span className="brand-name">FEA Pro</span>
          <span className="brand-ver">{APP_VERSION}</span>
        </div>
      </a>

      <nav className="dash-nav" aria-label="Navigazione principale">
        <button type="button" className="nav-link is-active">Home</button>
        <button type="button" className="nav-link" onClick={() => goTemplates()}>
          Progetti
        </button>
        <button type="button" className="nav-link" onClick={() => goTemplates()}>
          Template
        </button>
        <button type="button" className="nav-link" onClick={() => window.dispatchEvent(new Event("feapro:open-percorso-uc1"))}>
          Percorsi
        </button>
        <button type="button" className="nav-link" onClick={() => window.dispatchEvent(new Event("feapro:open-help"))}>
          Docs
        </button>
      </nav>

      <button type="button" className="cmd-pill" onClick={openPalette} data-testid="dash-cmd-pill">
        <Search width={14} height={14} aria-hidden="true" />
        <span>Cerca progetti, template, azioni…</span>
        <kbd>⌘ K</kbd>
      </button>

      <button type="button" className="icon-btn" aria-label="Notifiche" data-testid="dash-notifications">
        <span className="dot" />
        <Bell width={16} height={16} aria-hidden="true" />
      </button>
      <button type="button" className="icon-btn" aria-label="Help" onClick={() => window.dispatchEvent(new Event("feapro:open-help"))}>
        <HelpCircle width={16} height={16} aria-hidden="true" />
      </button>
      <button type="button" className="avatar" aria-label="Profilo" data-testid="dash-avatar" onClick={() => window.dispatchEvent(new Event("feapro:open-account-dialog"))}>
        {initialsFromEmail(useAuthStore.getState().user?.email)}
      </button>
    </header>
  );
}


// ── Hero ────────────────────────────────────────────────────────────────
interface HeroProps {
  greeting: string;
  firstName: string;
  modelsCount: number;
  tierLabel: string;
  projUsed: number;
  projCap: number;
  isRunning: boolean;
}
function Hero({ greeting, firstName, modelsCount, tierLabel, projUsed, projCap, isRunning }: HeroProps) {
  const projsActive = isRunning ? "1 analisi in corso" : `${modelsCount} progett${modelsCount === 1 ? "o" : "i"} in lavorazione`;
  const pct = projCap > 0 ? Math.round((projUsed / projCap) * 100) : 0;
  const openBilling = () => window.dispatchEvent(new Event("feapro:open-billing"));
  const goPercorsoUC1 = useGoPercorsoUC1();
  return (
    <section className="hero" data-testid="dash-hero">
      <div className="hero-l">
        <span className="eyebrow">{greeting}, {firstName}</span>
        <h1 className="hero-title">Da dove ricominci<br />oggi?</h1>
        <p className="hero-sub">
          {projsActive} · 2 percorsi guidati attivi · ultima sessione su{" "}
          <a href="/percorsi/uc1" onClick={(e) => { e.preventDefault(); goPercorsoUC1(); }}>
            UC1 · Trave bi-appoggiata
          </a>.
        </p>
      </div>
      <div className="hero-r">
        <div className="usage-card" data-testid="dash-usage-card">
          <span className="eyebrow">Piano {tierLabel} · Utilizzo</span>
          <div className="usage-row">
            <div className="usage-bar"><span style={{ width: `${pct}%` }} /></div>
            <span className="usage-val">{projUsed} / {projCap}</span>
          </div>
          <span className="usage-meta">progetti attivi · upgrade a Pro per illimitati</span>
          <button type="button" className="usage-cta" onClick={openBilling}>Scopri Pro →</button>
        </div>
      </div>
    </section>
  );
}


// ── ActionRow ───────────────────────────────────────────────────────────
function ActionRow() {
  const goTemplates = useGoTemplates();
  const goPercorsoUC1 = useGoPercorsoUC1();
  return (
    <section className="action-row" data-testid="dash-action-row">
      <ActionTile
        primary
        iconBg="rgba(8,145,178,0.10)"
        iconColor="var(--accent)"
        icon={<Plus width={24} height={24} aria-hidden="true" />}
        title="Nuovo modello vuoto"
        desc="Costruisci da zero: scegli unità, sistema coordinato, e parti dal canvas."
        metaLeft={<><kbd>⌘ N</kbd></>}
        metaRight="3 step di setup"
        onClick={() => window.dispatchEvent(new Event("feapro:open-new-model"))}
        testId="dash-action-new"
      />
      <ActionTile
        iconBg="rgba(83,74,183,0.10)"
        iconColor="var(--purple)"
        icon={<LayoutGrid width={24} height={24} aria-hidden="true" />}
        title="Apri un template"
        desc="9 modelli ricorrenti: trave, mensola, telaio, torre, piastra, reticolare…"
        metaLeft={<span className="badge-tag">9 template</span>}
        metaRight="configurati EC3/NTC18"
        onClick={() => goTemplates()}
        testId="dash-action-template"
      />
      <ActionTile
        iconBg="rgba(180,83,9,0.10)"
        iconColor="var(--warn)"
        icon={<ListChecks width={24} height={24} aria-hidden="true" />}
        title="Segui un percorso guidato"
        desc="Onboarding step-by-step su casi d'uso reali. Ideale alle prime esperienze FEM."
        metaLeft={<span className="badge-tag">2 attivi</span>}
        metaRight="UC1 al 50% · UC3 al 12%"
        onClick={() => goPercorsoUC1()}
        testId="dash-action-percorso"
      />
    </section>
  );
}

interface ActionTileProps {
  primary?: boolean;
  iconBg: string;
  iconColor: string;
  icon: ReactNode;
  title: string;
  desc: string;
  metaLeft: ReactNode;
  metaRight: string;
  onClick: () => void;
  testId: string;
}
function ActionTile({ primary, iconBg, iconColor, icon, title, desc, metaLeft, metaRight, onClick, testId }: ActionTileProps) {
  return (
    <button type="button" className={`action-tile${primary ? " action-primary" : ""}`} onClick={onClick} data-testid={testId}>
      <div className="tile-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div className="tile-body">
        <h3>{title}</h3>
        <p>{desc}</p>
        <div className="tile-meta">
          {metaLeft}
          <span>{metaRight}</span>
        </div>
      </div>
      <span className="tile-arrow">
        <ArrowRight width={16} height={16} aria-hidden="true" />
      </span>
    </button>
  );
}


// ── RecentSection ───────────────────────────────────────────────────────
interface RecentSectionProps {
  models: FEAModel[];
  modelsUnavailable?: boolean;
  modelsRefreshing?: boolean;
  onRetryModels?: () => void;
  onSelect: (id: string) => void;
}
function RecentSection({ models, modelsUnavailable, modelsRefreshing, onRetryModels, onSelect }: RecentSectionProps) {
  // Top 4 per ordine di mantenimento. Se vuoto, mostra demo cards mockup.
  const recent = useMemo(() => models.slice(0, 4), [models]);
  const showDemos = recent.length === 0;
  const goTemplates = useGoTemplates();

  return (
    <section className="block" data-testid="dash-recent">
      <header className="block-head">
        <div>
          <span className="eyebrow">Progetti recenti</span>
          <h2>Continua dove ti sei fermato</h2>
        </div>
        <div className="block-actions">
          <div className="seg" role="group" aria-label="Filtro categoria">
            <button type="button" className="seg-btn is-active">Tutti</button>
            <button type="button" className="seg-btn">Acciaio</button>
            <button type="button" className="seg-btn">CA</button>
            <button type="button" className="seg-btn">Sismica</button>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => goTemplates()}>
            Vedi tutti
            <ArrowRight width={12} height={12} aria-hidden="true" />
          </button>
        </div>
      </header>

      {modelsUnavailable && (
        <div className="usage-card" data-testid="dash-recent-error">
          <span className="eyebrow" style={{ color: "var(--danger)" }}>Errore caricamento</span>
          <span className="usage-meta">Impossibile recuperare i modelli. Verifica la connessione.</span>
          {onRetryModels && (
            <button type="button" className="usage-cta" onClick={onRetryModels} style={{ color: "var(--accent)" }}>
              Riprova →
            </button>
          )}
        </div>
      )}

      <div className="recent-grid">
        {showDemos ? <DemoRecentCards /> : recent.map((m, i) => (
          <RecentModelCard
            key={m.id}
            model={m}
            active={i === 0}
            onClick={() => onSelect(m.id)}
          />
        ))}
      </div>

      {modelsRefreshing && !showDemos && (
        <span className="eyebrow" style={{ alignSelf: "flex-end" }}>Aggiornamento…</span>
      )}
    </section>
  );
}


// ── DemoRecentCards (mockup hardcoded UC1/UC2/UC3/UC5) ──────────────────
function DemoRecentCards() {
  const goTemplates = useGoTemplates();
  return (
    <>
      <button type="button" className="recent-card recent-card-active" onClick={() => goTemplates()}>
        <div className="recent-thumb">
          <BeamThumb />
          <span className="recent-trust trust-prelim">PRELIM</span>
        </div>
        <div className="recent-body">
          <div className="recent-head">
            <span className="recent-id">UC1</span>
            <h3>Trave bi-appoggiata</h3>
            <span className="recent-status status-running">
              <span className="status-dot" />Solved
            </span>
          </div>
          <p className="recent-desc">Statica lineare · q = 10 kN/m · σ_max = 178 MPa · UR EC3 = 0.24</p>
          <div className="recent-meta">
            <span>14:32 · oggi</span>
            <span className="recent-dot" />
            <span>11 nodi · 10 beam</span>
            <span className="recent-dot" />
            <span className="recent-pill recent-pill-ec3">EC3</span>
          </div>
        </div>
      </button>

      <button type="button" className="recent-card" onClick={() => goTemplates()}>
        <div className="recent-thumb">
          <PortalThumb />
          <span className="recent-trust trust-draft">DRAFT</span>
        </div>
        <div className="recent-body">
          <div className="recent-head">
            <span className="recent-id">UC2</span>
            <h3>Portale 2D · vento</h3>
            <span className="recent-status status-modified">
              <span className="status-dot" />In bozza
            </span>
          </div>
          <p className="recent-desc">Da rieseguire · modifiche post-analisi · cerchi statica + modale</p>
          <div className="recent-meta">
            <span>ieri · 18:14</span>
            <span className="recent-dot" />
            <span>9 nodi · 6 beam</span>
            <span className="recent-dot" />
            <span className="recent-pill recent-pill-ec3">EC3</span>
          </div>
        </div>
      </button>

      <button type="button" className="recent-card" onClick={() => goTemplates()}>
        <div className="recent-thumb">
          <TowerThumb />
          <span className="recent-trust trust-prelim">PRELIM</span>
        </div>
        <div className="recent-body">
          <div className="recent-head">
            <span className="recent-id">UC3</span>
            <h3>Torre 8 piani · sismica</h3>
            <span className="recent-status status-running">
              <span className="status-dot" />Modale OK
            </span>
          </div>
          <p className="recent-desc">f₁ = 1.82 Hz · modale lineare · pendente verifica EC8 spettro</p>
          <div className="recent-meta">
            <span>2 giorni fa</span>
            <span className="recent-dot" />
            <span>72 nodi · 96 elem</span>
            <span className="recent-dot" />
            <span className="recent-pill recent-pill-ec8">EC8</span>
          </div>
        </div>
      </button>

      <button type="button" className="recent-card" onClick={() => goTemplates()}>
        <div className="recent-thumb">
          <CantileverThumb />
          <span className="recent-trust trust-prelim">PRELIM</span>
        </div>
        <div className="recent-body">
          <div className="recent-head">
            <span className="recent-id">UC5</span>
            <h3>Mensola incastrata</h3>
            <span className="recent-status status-running">
              <span className="status-dot" />Solved
            </span>
          </div>
          <p className="recent-desc">δ_tip = 4.2 mm · σ_VM = 89 MPa · UR EC3 = 0.31</p>
          <div className="recent-meta">
            <span>5 giorni fa</span>
            <span className="recent-dot" />
            <span>6 nodi · 5 beam</span>
            <span className="recent-dot" />
            <span className="recent-pill recent-pill-ec3">EC3</span>
          </div>
        </div>
      </button>
    </>
  );
}


// ── RecentModelCard (per modelli REALI) ─────────────────────────────────
interface RecentModelCardProps {
  model: FEAModel;
  active?: boolean;
  onClick: () => void;
}
function RecentModelCard({ model, active, onClick }: RecentModelCardProps) {
  // Heuristic: detect "thumbnail variant" from model topology
  const variant = detectVariant(model);
  const thumb = thumbForVariant(variant);
  const nNodes = model.nodes.length;
  const nElems = model.elements.length;
  return (
    <button
      type="button"
      className={`recent-card${active ? " recent-card-active" : ""}`}
      onClick={onClick}
      data-testid={`dash-recent-card-${model.id}`}
    >
      <div className="recent-thumb">
        {thumb}
        <span className="recent-trust trust-prelim">PRELIM</span>
      </div>
      <div className="recent-body">
        <div className="recent-head">
          <span className="recent-id">{model.id.substring(0, 6).toUpperCase()}</span>
          <h3>{model.name}</h3>
        </div>
        {model.description && <p className="recent-desc">{model.description}</p>}
        <div className="recent-meta">
          <span>{nNodes} nodi · {nElems} elem</span>
          <span className="recent-dot" />
          <span className="recent-pill recent-pill-ec3">EC3</span>
        </div>
      </div>
    </button>
  );
}


// ── DualRow (Percorsi + Changelog) ──────────────────────────────────────
function DualRow() {
  return (
    <section className="dual-row" data-testid="dash-dual-row">
      <div className="block block-half">
        <header className="block-head">
          <div>
            <span className="eyebrow">Percorsi guidati</span>
            <h2>Continua un percorso</h2>
          </div>
          <button type="button" className="btn-secondary btn-sm">Vedi tutti i percorsi</button>
        </header>
        <div className="percorso-list">
          <PercorsoRow id="UC1" title="Trave bi-appoggiata · Statica" step="Step 3/6 · Aggiungi i carichi distribuiti" pct={50} color="var(--accent)" />
          <PercorsoRow id="UC3" title="Torre 8 piani · Sismica EC8" step="Step 1/8 · Definisci la zona sismica e suolo" pct={12} color="var(--purple)" />
          <PercorsoRow id="SUGG." title="Telaio 2D · Verifica EC3 LTB" step="5 step · ~12 min · per chi ha già completato UC1" pct={null} suggested />
        </div>
      </div>

      <div className="block block-half">
        <header className="block-head">
          <div>
            <span className="eyebrow">Novità · {APP_TAG}</span>
            <h2>Cosa è cambiato</h2>
          </div>
          <button type="button" className="btn-secondary btn-sm">Changelog completo</button>
        </header>
        <div className="changelog">
          <ClRow pill="new" title="Dashboard mockup-driven v2.7.1" desc="Hub home replicato pixel-faithful da Dashboard new.html (Phase 4.2 chiusa)." when="oggi" />
          <ClRow pill="new" title="Auth pages mockup-driven v2.7.0" desc="4 route (login/signup/forgot/verify) refactor completo + backend signup metadata." when="ieri" />
          <ClRow pill="fix" title="Font Inter override .auth-shell" desc="Body text non eredita più Plus Jakarta Sans dall'app globale." when="ieri" />
          <ClRow pill="imp" title="Visual audit tool permanente" desc="`frontend/scripts/visual-audit.mjs` confronto live↔mockup Playwright headless." when="ieri" />
        </div>
      </div>
    </section>
  );
}

interface PercorsoRowProps { id: string; title: string; step: string; pct: number | null; color?: string; suggested?: boolean; }
function PercorsoRow({ id, title, step, pct, color = "var(--accent)", suggested }: PercorsoRowProps) {
  const onClick = () => window.dispatchEvent(new Event("feapro:open-percorso-uc1"));
  return (
    <button type="button" className={`percorso-row${suggested ? " percorso-suggested" : ""}`} onClick={onClick}>
      <div className="percorso-progress">
        {pct != null ? (
          <svg viewBox="0 0 36 36" width={40} height={40} aria-hidden="true">
            <circle cx={18} cy={18} r={15} fill="none" stroke="var(--border)" strokeWidth={3} />
            <circle
              cx={18} cy={18} r={15}
              fill="none" stroke={color} strokeWidth={3}
              strokeDasharray={`${pct * 0.9425} 100`}
              strokeDashoffset={100 - pct * 0.9425 - 47.13 + 47.13}
              transform="rotate(-90 18 18)"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 36 36" width={40} height={40} aria-hidden="true">
            <circle cx={18} cy={18} r={15} fill="none" stroke="var(--border)" strokeWidth={3} strokeDasharray="2 3" />
            <circle cx={18} cy={18} r={6} fill="var(--bg-warn)" stroke="var(--warn)" strokeWidth={1.5} />
            <text x={18} y={22} fontFamily="JetBrains Mono" fontSize={8} fontWeight={700} fill="var(--warn)" textAnchor="middle">★</text>
          </svg>
        )}
        {pct != null && <span className="percorso-pct">{pct}%</span>}
      </div>
      <div className="percorso-body">
        <div className="percorso-head">
          <span className="recent-id" style={suggested ? { background: "var(--bg-warn)", color: "var(--warn)", borderColor: "rgba(180,83,9,0.30)" } : undefined}>{id}</span>
          <h4>{title}</h4>
        </div>
        <p>{step}</p>
      </div>
      <span className="percorso-cta">
        {suggested ? "Inizia" : "Continua"}
        <ArrowRight width={12} height={12} aria-hidden="true" />
      </span>
    </button>
  );
}

interface ClRowProps { pill: "new" | "fix" | "imp"; title: string; desc: string; when: string; }
function ClRow({ pill, title, desc, when }: ClRowProps) {
  return (
    <div className="cl-row">
      <span className={`cl-pill cl-pill-${pill}`}>{pill.toUpperCase()}</span>
      <div className="cl-body">
        <h5>{title}</h5>
        <p>{desc}</p>
      </div>
      <span className="cl-when">{when}</span>
    </div>
  );
}


// ── DashFoot ────────────────────────────────────────────────────────────
function DashFoot() {
  return (
    <footer className="dash-foot" data-testid="dash-foot">
      <span>FEA Pro {APP_VERSION} · <a href="https://fea-pro.fly.dev/api/health" target="_blank" rel="noreferrer">Status · all green</a></span>
      <span>·</span>
      <span><b>Preliminary release</b> — non raccomandata per progetti reali. <a href="#" onClick={(e) => e.preventDefault()}>Perché?</a></span>
      <span className="foot-spacer" />
      <span><a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("feapro:open-help")); }}>Docs</a></span>
      <span><a href="#" onClick={(e) => e.preventDefault()}>Privacy</a></span>
      <span><a href="https://github.com/fedesanna99/FIA" target="_blank" rel="noreferrer">GitHub</a></span>
    </footer>
  );
}


// ── Thumbnails SVG (estratti verbatim da mockup) ────────────────────────

function BeamThumb() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="thumb-beam-stress" x1="0" x2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.5" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <rect width={320} height={180} fill="var(--bg-viewport)" />
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.4}>
        <line x1={0} y1={60} x2={320} y2={60} />
        <line x1={0} y1={120} x2={320} y2={120} />
        <line x1={80} y1={0} x2={80} y2={180} />
        <line x1={160} y1={0} x2={160} y2={180} />
        <line x1={240} y1={0} x2={240} y2={180} />
      </g>
      <g stroke="var(--coral)" strokeWidth={1.2} opacity={0.8}>
        <line x1={40} y1={48} x2={280} y2={48} strokeWidth={1.6} />
        {[60, 90, 120, 150, 180, 210, 240, 270].map((x) => (
          <line key={x} x1={x} y1={50} x2={x} y2={76} />
        ))}
      </g>
      <path d="M40 90 Q160 130, 280 90" stroke="url(#thumb-beam-stress)" strokeWidth={6} fill="none" strokeLinecap="round" />
      <g stroke="var(--ink-muted)" strokeWidth={1.2} fill="none">
        <polygon points="40,95 32,108 48,108" />
        <polygon points="280,95 272,107 288,107" />
        <circle cx={276} cy={111} r={2} />
        <circle cx={284} cy={111} r={2} />
      </g>
      <g fontFamily="JetBrains Mono" fontSize={9} fill="var(--ink-dim)">
        <text x={160} y={158} textAnchor="middle">L = 6.00 m · IPE 300 · S355</text>
      </g>
    </svg>
  );
}

function PortalThumb() {
  return (
    <svg viewBox="0 0 320 180">
      <rect width={320} height={180} fill="var(--bg-viewport)" />
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.4}>
        <line x1={0} y1={60} x2={320} y2={60} />
        <line x1={0} y1={120} x2={320} y2={120} />
        <line x1={80} y1={0} x2={80} y2={180} />
        <line x1={240} y1={0} x2={240} y2={180} />
      </g>
      <g stroke="var(--ink)" strokeWidth={2} fill="none">
        <line x1={80} y1={140} x2={80} y2={40} />
        <line x1={80} y1={40} x2={240} y2={40} />
        <line x1={240} y1={40} x2={240} y2={140} />
      </g>
      <g fill="var(--ink)">
        <circle cx={80} cy={40} r={3} />
        <circle cx={240} cy={40} r={3} />
        <circle cx={160} cy={40} r={2.5} />
      </g>
      <g stroke="var(--coral)" strokeWidth={1.2}>
        {[60, 80, 100, 120].map((y) => (
          <g key={y}>
            <line x1={50} y1={y} x2={78} y2={y} strokeWidth={1.5} />
            <polygon points={`78,${y} 72,${y - 3} 72,${y + 3}`} fill="var(--coral)" />
          </g>
        ))}
      </g>
      <g stroke="var(--ink-muted)" strokeWidth={1}>
        <line x1={60} y1={148} x2={100} y2={148} />
        <line x1={220} y1={148} x2={260} y2={148} />
      </g>
      <g fontFamily="JetBrains Mono" fontSize={9} fill="var(--ink-dim)">
        <text x={160} y={168} textAnchor="middle">B = 4 m · H = 5 m · IPE 240</text>
      </g>
    </svg>
  );
}

function TowerThumb() {
  return (
    <svg viewBox="0 0 320 180">
      <rect width={320} height={180} fill="var(--bg-viewport)" />
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.4}>
        <line x1={0} y1={60} x2={320} y2={60} />
        <line x1={0} y1={120} x2={320} y2={120} />
      </g>
      <g stroke="var(--ink)" strokeWidth={1} fill="none" opacity={0.85}>
        <line x1={130} y1={35} x2={115} y2={155} />
        <line x1={190} y1={35} x2={205} y2={155} />
        <line x1={155} y1={25} x2={140} y2={145} opacity={0.5} />
        <line x1={215} y1={25} x2={230} y2={145} opacity={0.5} />
        <g strokeDasharray="2 2">
          <line x1={125} y1={55} x2={200} y2={55} />
          <line x1={123} y1={75} x2={202} y2={75} />
          <line x1={121} y1={95} x2={204} y2={95} />
          <line x1={119} y1={115} x2={206} y2={115} />
        </g>
        <g strokeWidth={1.4}>
          <line x1={117} y1={135} x2={208} y2={135} />
          <line x1={115} y1={155} x2={210} y2={155} />
        </g>
      </g>
      <g stroke="var(--purple)" strokeWidth={1.6} fill="none">
        <path d="M115 155 Q 200 100, 145 35" />
        <path d="M205 155 Q 280 100, 175 35" />
      </g>
      <g stroke="var(--ink-muted)" strokeWidth={1}>
        <line x1={100} y1={160} x2={220} y2={160} />
      </g>
      <g fontFamily="JetBrains Mono" fontSize={9} fill="var(--ink-dim)">
        <text x={160} y={178} textAnchor="middle">Torre · 8 piani · CA</text>
      </g>
    </svg>
  );
}

function CantileverThumb() {
  return (
    <svg viewBox="0 0 320 180">
      <rect width={320} height={180} fill="var(--bg-viewport)" />
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.4}>
        <line x1={0} y1={90} x2={320} y2={90} />
        <line x1={80} y1={0} x2={80} y2={180} />
      </g>
      <rect x={40} y={40} width={20} height={100} fill="var(--ink-dim)" opacity={0.18} />
      <g stroke="var(--ink-muted)" strokeWidth={0.8}>
        {[40, 55, 70, 85, 100, 115, 130].map((y) => (
          <line key={y} x1={60} y1={y} x2={56} y2={y + 4} />
        ))}
      </g>
      <path d="M60 90 Q160 100, 270 124" stroke="var(--ink)" strokeWidth={2} fill="none" />
      <line x1={60} y1={90} x2={270} y2={90} stroke="var(--border)" strokeWidth={1.5} strokeDasharray="2 3" />
      <g stroke="var(--coral)" strokeWidth={1.4}>
        <line x1={270} y1={98} x2={270} y2={135} />
        <polygon points="270,135 266,128 274,128" fill="var(--coral)" />
      </g>
      <text x={278} y={118} fontFamily="JetBrains Mono" fontSize={9} fontWeight={700} fill="var(--coral)">P = 5 kN</text>
      <g fontFamily="JetBrains Mono" fontSize={9} fill="var(--ink-dim)">
        <text x={160} y={170} textAnchor="middle">L = 2.5 m · HEB 200 · S275</text>
      </g>
    </svg>
  );
}


// ── helpers ─────────────────────────────────────────────────────────────

function greetingForHour(h: number): string {
  if (h < 6) return "Notte fonda";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buona sera";
}

function extractFirstName(email?: string, nome?: string | null): string {
  if (nome) return nome;
  if (!email) return "ingegnere";
  const handle = email.split("@")[0];
  // Common patterns: fede.sanna99, federico.s, etc.
  const seg = handle.split(/[._-]/)[0];
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

function initialsFromEmail(email?: string): string {
  if (!email) return "??";
  const handle = email.split("@")[0];
  const parts = handle.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return handle.substring(0, 2).toUpperCase();
}

type ThumbVariant = "beam" | "portal" | "tower" | "cantilever";

function detectVariant(model: FEAModel): ThumbVariant {
  // Heuristic basata su topology
  if (model.is_3d && model.nodes.length > 40) return "tower";
  // Single fixed constraint on one end ⇒ cantilever
  const hasFixed = (model.constraints ?? []).some((c) => c.type === "fixed");
  if (hasFixed && model.elements.length <= 8) return "cantilever";
  // Multiple beams forming portal (3+ elements, 2 fixed ends)
  if (model.elements.length >= 3 && model.elements.length <= 6) return "portal";
  return "beam";
}

function thumbForVariant(v: ThumbVariant): ReactNode {
  switch (v) {
    case "tower": return <TowerThumb />;
    case "portal": return <PortalThumb />;
    case "cantilever": return <CantileverThumb />;
    case "beam":
    default: return <BeamThumb />;
  }
}
