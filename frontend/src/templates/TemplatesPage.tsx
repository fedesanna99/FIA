/**
 * TemplatesPage · v2.7.2 Phase 4.3 mockup-driven
 *
 * Gallery dei 9 template FEM hardcoded da `ui_kits/webapp_desktop/
 * Templates.html` (407 righe HTML + 333 righe templates.css). Full-screen
 * page route `/templates` accessibile da DashboardPage tile "Apri un template"
 * o da `feapro:open-template-gallery` event (legacy compat per altri call site).
 *
 * Backend: i template "ex_*" sono pre-caricati nel DB SQLite del backend
 * (`backend/data/templates/`). Click su un template card → POST
 * `/api/models/from-template?id=ex_uc1` che clona il template come modello
 * user editabile, poi navigate("/") con `setActiveId` per aprire il workspace.
 *
 * Per ora (MVP v2.7.2): click → toast "Caricamento template..." +
 * dispatch event `feapro:load-template` (handler in App.tsx riusa il flow
 * esistente di TemplateGalleryDialog → POST + setActiveId + navigate).
 *
 * Reference: ui_kits/webapp_desktop/Templates.html (407 righe) +
 *            templates.css (333 righe namespaced .tg).
 */
import { useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";

import "../styles/templates.css";


// ── Template catalog (mockup hardcoded, 9 templates) ────────────────────

type TplCategory = "acciaio" | "ca" | "legno" | "sismica";
type TplTier = "free" | "pro";

interface Template {
  id: string;        // backend ID, es. "ex_uc1"
  code: string;      // shown to user, es. "UC1"
  title: string;
  description: string;
  category: TplCategory;
  tier: TplTier;
  ec: "EC2" | "EC3" | "EC5" | "EC8";
  type: "statica" | "telaio" | "sismica" | "shell" | "truss" | "buckling";
  estimatedMin: number;
  pill?: "POPOLARE" | "PRO" | "NEW";
  featured?: boolean;
  thumb: () => JSX.Element;
}

const TEMPLATES: readonly Template[] = [
  {
    id: "ex_uc1", code: "UC1", title: "Trave bi-appoggiata",
    description: "Trave isostatica con carico distribuito. Statica lineare + verifica EC3 LTB.",
    category: "acciaio", tier: "free", ec: "EC3", type: "statica", estimatedMin: 2,
    pill: "POPOLARE", featured: true,
    thumb: BeamSupportedThumb,
  },
  {
    id: "ex_uc2", code: "UC2", title: "Portale 2D · vento",
    description: "Telaio rigido isolato. Carico vento orizzontale + permanenti.",
    category: "acciaio", tier: "free", ec: "EC3", type: "telaio", estimatedMin: 3,
    thumb: PortalThumb,
  },
  {
    id: "ex_uc3", code: "UC3", title: "Torre 8 piani · sismica",
    description: "Edificio multi-piano. Modale + sismica EC8 spettro elastico.",
    category: "ca", tier: "pro", ec: "EC8", type: "sismica", estimatedMin: 8,
    pill: "PRO",
    thumb: TowerThumb,
  },
  {
    id: "ex_uc5", code: "UC5", title: "Mensola incastrata",
    description: "Trave a sbalzo con carico puntuale all'estremità. Calcolo freccia + sigma_VM.",
    category: "acciaio", tier: "free", ec: "EC3", type: "statica", estimatedMin: 2,
    thumb: CantileverThumb,
  },
  {
    id: "ex_uc6", code: "UC6", title: "Piastra Q4 · pannello",
    description: "Pannello shell-Q4 piano. Carico distribuito su superficie. Iso-linee stress.",
    category: "ca", tier: "pro", ec: "EC2", type: "shell", estimatedMin: 4,
    pill: "PRO",
    thumb: PlateThumb,
  },
  {
    id: "ex_uc7", code: "UC7", title: "Reticolare Pratt",
    description: "Capriata di copertura. Solo forze assiali. Aste truss + verifica EC3 buckling.",
    category: "acciaio", tier: "free", ec: "EC3", type: "truss", estimatedMin: 3,
    thumb: TrussThumb,
  },
  {
    id: "ex_uc8", code: "UC8", title: "Tirante in trazione",
    description: "Asta soggetta a forza assiale pura. Verifica resistenza + snellezza.",
    category: "acciaio", tier: "free", ec: "EC3", type: "truss", estimatedMin: 1,
    thumb: TieRodThumb,
  },
  {
    id: "ex_uc9", code: "UC9", title: "Capriata in legno lamellare",
    description: "Tetto a falda. Carico neve + permanenti. Verifica EC5 legno (NEW v2.4).",
    category: "legno", tier: "free", ec: "EC5", type: "truss", estimatedMin: 4,
    pill: "NEW",
    thumb: WoodTrussThumb,
  },
  {
    id: "ex_uc10", code: "UC10", title: "Pilastro CA · buckling",
    description: "Pilastro snello in CA. Carico assiale. Eulero + verifica EC2 sez. rettangolare.",
    category: "ca", tier: "pro", ec: "EC2", type: "buckling", estimatedMin: 5,
    pill: "PRO",
    thumb: ColumnBucklingThumb,
  },
];

const CATEGORY_LABELS: Record<TplCategory | "tutti", string> = {
  tutti: "Tutti",
  acciaio: "Acciaio",
  ca: "Calcestruzzo",
  legno: "Legno",
  sismica: "Sismica",
};


// ── TemplatesPage ───────────────────────────────────────────────────────

export function TemplatesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<TplCategory | "tutti">("tutti");
  const [tierFilter, setTierFilter] = useState<TplTier | "all">("free");

  const filtered = TEMPLATES.filter((t) => {
    if (activeCategory !== "tutti") {
      // "sismica" filter matches both ec=EC8 and type=sismica
      if (activeCategory === "sismica") {
        if (t.ec !== "EC8" && t.type !== "sismica") return false;
      } else if (t.category !== activeCategory) {
        return false;
      }
    }
    if (tierFilter !== "all" && t.tier !== tierFilter) return false;
    return true;
  });

  const counts: Record<TplCategory | "tutti", number> = {
    tutti: TEMPLATES.length,
    acciaio: TEMPLATES.filter((t) => t.category === "acciaio").length,
    ca: TEMPLATES.filter((t) => t.category === "ca").length,
    legno: TEMPLATES.filter((t) => t.category === "legno").length,
    sismica: TEMPLATES.filter((t) => t.ec === "EC8" || t.type === "sismica").length,
  };

  const onOpenTemplate = (tpl: Template) => {
    toast("info", `Caricamento template ${tpl.code} · ${tpl.title}…`, 3000);
    // Dispatcha evento per riusare il flow esistente (TemplateGalleryDialog legacy
    // intercepta `feapro:load-template` con detail.templateId)
    window.dispatchEvent(new CustomEvent("feapro:load-template", { detail: { templateId: tpl.id } }));
    // Redirect immediato a home; quando il modello è caricato setActiveId aprirà
    // il workspace. Se il flow fallisce, l'utente vede comunque la dashboard.
    navigate("/", { replace: false });
  };

  return (
    <div className="tg" data-testid="templates-page">
      <header className="tg-topbar">
        <Link to="/" className="tg-brand">
          <span className="tg-brand-square">F</span>
          <span className="tg-brand-name">FEA Pro</span>
        </Link>
        <nav className="tg-bc" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="bc-sep">/</span>
          <span className="bc-now">Template Gallery</span>
        </nav>
        <div className="tg-spacer" />
        <button type="button" className="cmd-pill" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }))}>
          <Search width={13} height={13} aria-hidden="true" />
          <span>Cerca template…</span>
          <kbd>⌘ K</kbd>
        </button>
        <button type="button" className="tg-avatar" aria-label="Profilo" onClick={() => window.dispatchEvent(new Event("feapro:open-account-dialog"))}>
          {initialsFromEmail(useAuthStore.getState().user?.email)}
        </button>
      </header>

      <main className="tg-main">
        <header className="tg-head">
          <div className="tg-head-l">
            <span className="eyebrow">CATALOGO · {TEMPLATES.length} TEMPLATE</span>
            <h1>Modelli FEM pronti all'uso</h1>
            <p>Configurati secondo NTC 18 ed Eurocodici. Ogni template è un punto di partenza editabile — non un modello chiuso.</p>
          </div>
          <div className="tg-head-r">
            <button type="button" className="btn-primary" onClick={() => { window.dispatchEvent(new Event("feapro:open-new-model")); navigate("/"); }} data-testid="tg-new-model-btn">
              <Plus width={12} height={12} strokeWidth={2.4} aria-hidden="true" />
              Modello vuoto
            </button>
          </div>
        </header>

        <div className="tg-filters">
          <div className="filters-l">
            {(["tutti", "acciaio", "ca", "legno", "sismica"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip${activeCategory === cat ? " is-active" : ""}`}
                onClick={() => setActiveCategory(cat)}
                data-testid={`tg-filter-${cat}`}
              >
                {CATEGORY_LABELS[cat]}
                <span className="fc-count">{counts[cat]}</span>
              </button>
            ))}
          </div>
          <div className="filters-r">
            <div className="tier-toggle" role="group" aria-label="Tier">
              {(["free", "pro", "all"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  className={`tier-toggle-btn${tierFilter === tier ? " is-active" : ""}`}
                  onClick={() => setTierFilter(tier)}
                  data-testid={`tg-tier-${tier}`}
                >
                  {tier === "all" ? "Tutti" : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="tg-grid" data-testid="tg-grid">
          {filtered.map((t) => (
            <article key={t.id} className={`tpl-card${t.featured ? " tpl-card-featured" : ""}`} data-testid={`tpl-card-${t.code.toLowerCase()}`}>
              <div className="tpl-thumb">
                <t.thumb />
                {t.pill && <span className={`tpl-pill tpl-pill-${pillClass(t.pill)}`}>{t.pill}</span>}
              </div>
              <div className="tpl-body">
                <span className="tpl-id">{t.code}</span>
                <h3>{t.title}</h3>
                <p>{t.description}</p>
                <div className="tpl-meta">
                  <span className={`meta-pill ${matClass(t.category)}`}>{matLabel(t.category)}</span>
                  <span className="meta-pill">{t.type}</span>
                  <span className="meta-pill">{t.ec}</span>
                  <span className="meta-dot">·</span>
                  <span className="meta-time">{t.estimatedMin} min</span>
                </div>
              </div>
              <button type="button" className="tpl-cta" onClick={() => onOpenTemplate(t)}>
                Apri template
                <ArrowRight width={11} height={11} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}


// ── Helpers ─────────────────────────────────────────────────────────────

function initialsFromEmail(email?: string): string {
  if (!email) return "??";
  const handle = email.split("@")[0];
  const parts = handle.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return handle.substring(0, 2).toUpperCase();
}

function pillClass(pill: "POPOLARE" | "PRO" | "NEW"): string {
  return pill === "POPOLARE" ? "pop" : pill === "PRO" ? "pro" : "new";
}

function matClass(category: TplCategory): string {
  if (category === "ca") return "mp-mat mp-mat-ca";
  if (category === "legno") return "mp-mat mp-mat-wood";
  if (category === "acciaio") return "mp-mat";
  return "";
}

function matLabel(category: TplCategory): string {
  if (category === "ca") return "CA";
  if (category === "legno") return "legno";
  if (category === "acciaio") return "acciaio";
  return "sismica";
}


// ── SVG Thumbnails (9 varianti, estratti verbatim da mockup) ────────────

function BeamSupportedThumb() {
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      <line x1={40} y1={80} x2={240} y2={80} stroke="var(--ink)" strokeWidth={6} />
      <circle cx={40} cy={80} r={4} fill="var(--accent)" />
      <circle cx={240} cy={80} r={4} fill="var(--accent)" />
      <polygon points="40,86 30,104 50,104" fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} />
      <polygon points="240,86 230,104 250,104" fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} />
      <circle cx={234} cy={108} r={2.5} fill="none" stroke="var(--ink-muted)" strokeWidth={1} />
      <circle cx={246} cy={108} r={2.5} fill="none" stroke="var(--ink-muted)" strokeWidth={1} />
      <g stroke="var(--coral)" strokeWidth={1.4} opacity={0.8}>
        <line x1={40} y1={50} x2={240} y2={50} />
        {[60, 100, 140, 180, 220].map((x) => <line key={x} x1={x} y1={52} x2={x} y2={72} />)}
      </g>
      <text x={140} y={135} fontFamily="JetBrains Mono" fontSize={10} fill="var(--ink-dim)" textAnchor="middle">L = 6.00 m · IPE 300</text>
    </svg>
  );
}

function PortalThumb() {
  return (
    <svg viewBox="0 0 280 160">
      <g stroke="var(--ink)" strokeWidth={2.5} fill="none">
        <line x1={80} y1={130} x2={80} y2={40} />
        <line x1={80} y1={40} x2={200} y2={40} />
        <line x1={200} y1={40} x2={200} y2={130} />
      </g>
      <g fill="var(--ink)"><circle cx={80} cy={40} r={3} /><circle cx={200} cy={40} r={3} /></g>
      <g stroke="var(--coral)" strokeWidth={1.5}>
        {[60, 80, 100].map((y) => (
          <g key={y}>
            <line x1={50} y1={y} x2={78} y2={y} />
            <polygon points={`78,${y} 71,${y-3} 71,${y+3}`} fill="var(--coral)" />
          </g>
        ))}
      </g>
      <g stroke="var(--ink-muted)" strokeWidth={1}>
        <line x1={65} y1={138} x2={95} y2={138} />
        <line x1={185} y1={138} x2={215} y2={138} />
      </g>
    </svg>
  );
}

function TowerThumb() {
  return (
    <svg viewBox="0 0 280 160">
      <g stroke="var(--ink)" strokeWidth={2} fill="none">
        <line x1={120} y1={20} x2={120} y2={140} />
        <line x1={160} y1={20} x2={160} y2={140} />
        {[36, 56, 76, 96, 116, 136].map((y) => <line key={y} x1={120} y1={y} x2={160} y2={y} />)}
      </g>
      <g stroke="var(--purple)" strokeWidth={1.4} fill="none">
        <path d="M120 140 Q 100 80, 130 20" />
        <path d="M160 140 Q 180 80, 150 20" />
      </g>
      <line x1={100} y1={146} x2={180} y2={146} stroke="var(--ink-muted)" strokeWidth={1.5} />
    </svg>
  );
}

function CantileverThumb() {
  return (
    <svg viewBox="0 0 280 160">
      <rect x={40} y={50} width={14} height={80} fill="var(--ink-dim)" opacity={0.25} />
      <g stroke="var(--ink-muted)" strokeWidth={0.8}>
        {[50, 65, 80, 95, 110, 125].map((y) => <line key={y} x1={54} y1={y} x2={50} y2={y + 4} />)}
      </g>
      <path d="M54 80 Q 130 88, 220 110" stroke="var(--ink)" strokeWidth={2.5} fill="none" />
      <line x1={54} y1={80} x2={220} y2={80} stroke="var(--border)" strokeWidth={1.5} strokeDasharray="2 3" />
      <line x1={220} y1={88} x2={220} y2={125} stroke="var(--coral)" strokeWidth={1.5} />
      <polygon points="220,125 215,118 225,118" fill="var(--coral)" />
    </svg>
  );
}

function PlateThumb() {
  return (
    <svg viewBox="0 0 280 160">
      <rect x={60} y={30} width={160} height={100} fill="none" stroke="var(--ink)" strokeWidth={2} />
      <g stroke="var(--ink-dim)" strokeWidth={0.5} strokeDasharray="2 1">
        <line x1={100} y1={30} x2={100} y2={130} />
        <line x1={140} y1={30} x2={140} y2={130} />
        <line x1={180} y1={30} x2={180} y2={130} />
        <line x1={60} y1={55} x2={220} y2={55} />
        <line x1={60} y1={80} x2={220} y2={80} />
        <line x1={60} y1={105} x2={220} y2={105} />
      </g>
      <g fill="var(--ink)">
        <circle cx={60} cy={30} r={2.5} /><circle cx={220} cy={30} r={2.5} />
        <circle cx={60} cy={130} r={2.5} /><circle cx={220} cy={130} r={2.5} />
      </g>
    </svg>
  );
}

function TrussThumb() {
  return (
    <svg viewBox="0 0 280 160">
      <g stroke="var(--ink)" strokeWidth={1.8} fill="none">
        <line x1={40} y1={100} x2={240} y2={100} />
        <line x1={40} y1={40} x2={240} y2={40} />
        <line x1={40} y1={40} x2={40} y2={100} />
        <line x1={100} y1={40} x2={100} y2={100} />
        <line x1={140} y1={40} x2={140} y2={100} />
        <line x1={180} y1={40} x2={180} y2={100} />
        <line x1={240} y1={40} x2={240} y2={100} />
        <line x1={40} y1={100} x2={100} y2={40} />
        <line x1={140} y1={100} x2={100} y2={40} />
        <line x1={140} y1={40} x2={180} y2={100} />
        <line x1={180} y1={40} x2={240} y2={100} />
      </g>
      <g fill="var(--ink)">
        <circle cx={40} cy={100} r={2.5} /><circle cx={100} cy={100} r={2} />
        <circle cx={140} cy={100} r={2} /><circle cx={180} cy={100} r={2} /><circle cx={240} cy={100} r={2.5} />
        <circle cx={100} cy={40} r={2} /><circle cx={140} cy={40} r={2} /><circle cx={180} cy={40} r={2} />
      </g>
      <polygon points="40,106 30,124 50,124" fill="none" stroke="var(--ink-muted)" strokeWidth={1.2} />
      <polygon points="240,106 230,124 250,124" fill="none" stroke="var(--ink-muted)" strokeWidth={1.2} />
    </svg>
  );
}

function TieRodThumb() {
  return (
    <svg viewBox="0 0 280 160">
      <line x1={40} y1={40} x2={240} y2={120} stroke="var(--ink)" strokeWidth={3} />
      <circle cx={40} cy={40} r={3} fill="var(--ink)" />
      <circle cx={240} cy={120} r={3} fill="var(--ink)" />
      <g fontFamily="JetBrains Mono" fontSize={11} fill="var(--coral)">
        <line x1={40} y1={20} x2={40} y2={36} stroke="var(--coral)" strokeWidth={1.5} />
        <polygon points="40,36 35,28 45,28" fill="var(--coral)" />
        <text x={50} y={32}>F</text>
      </g>
      <line x1={32} y1={32} x2={48} y2={48} stroke="var(--ink-muted)" strokeWidth={0.8} />
    </svg>
  );
}

function WoodTrussThumb() {
  return (
    <svg viewBox="0 0 280 160">
      <g stroke="var(--ink)" strokeWidth={2} fill="none">
        <line x1={40} y1={120} x2={240} y2={120} />
        <line x1={40} y1={120} x2={140} y2={40} />
        <line x1={140} y1={40} x2={240} y2={120} />
        <line x1={140} y1={120} x2={140} y2={40} />
        <line x1={90} y1={80} x2={140} y2={120} />
        <line x1={190} y1={80} x2={140} y2={120} />
      </g>
      <g fill="var(--ink)">
        <circle cx={40} cy={120} r={2.5} /><circle cx={140} cy={40} r={2.5} /><circle cx={240} cy={120} r={2.5} />
        <circle cx={140} cy={120} r={2} /><circle cx={90} cy={80} r={2} /><circle cx={190} cy={80} r={2} />
      </g>
    </svg>
  );
}

function ColumnBucklingThumb() {
  return (
    <svg viewBox="0 0 280 160">
      <rect x={130} y={30} width={20} height={100} fill="var(--bg-hover)" stroke="var(--ink)" strokeWidth={2} />
      <path d="M140 30 Q 160 80, 140 130" stroke="var(--purple)" strokeWidth={1.5} fill="none" strokeDasharray="3 2" />
      <line x1={140} y1={20} x2={140} y2={36} stroke="var(--coral)" strokeWidth={2} />
      <polygon points="140,36 134,28 146,28" fill="var(--coral)" />
      <line x1={120} y1={140} x2={160} y2={140} stroke="var(--ink-muted)" strokeWidth={1.5} />
    </svg>
  );
}
