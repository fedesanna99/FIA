/**
 * TemplateGallery · Fetta E3.5 (redesign workspace-fasi)
 *
 * Galleria prominente in fondo Dashboard con 9 template. Decisione IA
 * Dashboard #5 di Federico: "Galleria Template prominente come leva
 * engagement-per-token". Click su template apre/clona via backend.
 *
 * Replica mockup Claude Design Round 2 sezione
 * `<section class="block" id="template-gallery">`. Stili in
 * `dashboard-soft.css`. Filter chips implementati ma per ora "Tutti" e'
 * l'unico filtro pienamente operativo (gli altri sono TODO con backend
 * `category` field).
 */
import { useState } from "react";
import { ChevronRight, ArrowRight } from "lucide-react";

interface TemplateEntry {
  id: string;
  /** Template backend id per from-template (es. "ex_simple_beam_2d"). */
  backendId: string | null;
  uc: string;
  title: string;
  desc: string;
  category: "acciaio" | "ca" | "legno" | "sismica" | "altro";
  pills: string[]; // es. ["statica", "EC3"]
  timeMin: number;
  badge?: "POPOLARE" | "PRO" | "NEW";
  variant: "beam" | "portal" | "tower" | "cantilever" | "plate" | "truss";
}

const TEMPLATES: TemplateEntry[] = [
  { id: "t1", backendId: "ex_simple_beam_2d", uc: "UC1", title: "Trave bi-appoggiata", desc: "Trave isostatica con carico distribuito. Statica lineare + verifica EC3 LTB.", category: "acciaio", pills: ["statica", "EC3"], timeMin: 2, badge: "POPOLARE", variant: "beam" },
  { id: "t2", backendId: "ex_portal_frame_2d", uc: "UC2", title: "Portale 2D · vento", desc: "Telaio rigido isolato. Carico vento orizzontale + permanenti.", category: "acciaio", pills: ["telaio", "EC3"], timeMin: 3, variant: "portal" },
  { id: "t3", backendId: "ex_tower_3d", uc: "UC3", title: "Torre 8 piani · sismica", desc: "Edificio multi-piano. Modale + sismica EC8 spettro elastico.", category: "ca", pills: ["sismica", "EC8"], timeMin: 8, badge: "PRO", variant: "tower" },
  { id: "t4", backendId: "ex_cantilever_steel", uc: "UC4", title: "Mensola in acciaio", desc: "Mensola incastrata. Statica lineare + verifica EC3 flessione.", category: "acciaio", pills: ["statica", "EC3"], timeMin: 2, variant: "cantilever" },
  { id: "t5", backendId: "ex_plate_thick", uc: "UC5", title: "Piastra spessa CA", desc: "Solaio piano CA. Modello shell + verifica EC2 punzonamento.", category: "ca", pills: ["shell", "EC2"], timeMin: 5, variant: "plate" },
  { id: "t6", backendId: "ex_truss_3d", uc: "UC6", title: "Reticolare 3D · capannone", desc: "Capriata reticolare. Statica + buckling EC3 instabilita'.", category: "acciaio", pills: ["statica", "buckling", "EC3"], timeMin: 4, variant: "truss" },
  { id: "t7", backendId: "ex_wood_beam", uc: "UC7", title: "Trave in legno lamellare", desc: "Trave in GL24h. Statica + verifica EC5 stato limite ultimo.", category: "legno", pills: ["statica", "EC5"], timeMin: 3, badge: "NEW", variant: "beam" },
  { id: "t8", backendId: "ex_seismic_th", uc: "UC8", title: "Time-history sismica", desc: "Edificio CA con storia temporale Newmark. EC8 SLD/SLV.", category: "sismica", pills: ["TH", "EC8"], timeMin: 12, badge: "PRO", variant: "tower" },
  { id: "t9", backendId: "ex_concrete_column", uc: "UC9", title: "Pilastro CA · M-N", desc: "Verifica EC2 pressoflessione + dominio M-N + LTB.", category: "ca", pills: ["EC2", "M-N"], timeMin: 4, variant: "cantilever" },
];

type Filter = "tutti" | "acciaio" | "ca" | "legno" | "sismica";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "tutti", label: "Tutti" },
  { key: "acciaio", label: "Acciaio" },
  { key: "ca", label: "Calcestruzzo" },
  { key: "legno", label: "Legno" },
  { key: "sismica", label: "Sismica" },
];

function countForFilter(f: Filter): number {
  if (f === "tutti") return TEMPLATES.length;
  return TEMPLATES.filter((t) => t.category === f).length;
}

function GenericThumb({ variant }: { variant: TemplateEntry["variant"] }) {
  // Thumbnail SVG semplificate (4 stati onesti: meglio sketch generico
  // riconoscibile che SVG-art elaborato a 9 varianti). Per i 4 variant
  // gia' esistenti (beam/portal/tower/cantilever) si potra' in futuro
  // riusare detectVariant+thumbForVariant da DashboardPage (refactor E3+).
  const stroke = "var(--ink)";
  const accent = "var(--coral)";
  switch (variant) {
    case "beam":
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <line x1="40" y1="80" x2="240" y2="80" stroke={stroke} strokeWidth="5" />
          <circle cx="40" cy="80" r="4" fill="var(--accent)" />
          <circle cx="240" cy="80" r="4" fill="var(--accent)" />
          <g stroke={accent} strokeWidth="1.3" opacity="0.7">
            <line x1="60" y1="55" x2="60" y2="75" />
            <line x1="100" y1="55" x2="100" y2="75" />
            <line x1="140" y1="55" x2="140" y2="75" />
            <line x1="180" y1="55" x2="180" y2="75" />
            <line x1="220" y1="55" x2="220" y2="75" />
          </g>
        </svg>
      );
    case "portal":
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <g stroke={stroke} strokeWidth="2.5" fill="none">
            <line x1="80" y1="130" x2="80" y2="40" />
            <line x1="80" y1="40" x2="200" y2="40" />
            <line x1="200" y1="40" x2="200" y2="130" />
          </g>
          <circle cx="80" cy="40" r="3" fill={stroke} />
          <circle cx="200" cy="40" r="3" fill={stroke} />
          <g stroke={accent} strokeWidth="1.4">
            <line x1="50" y1="60" x2="78" y2="60" />
            <line x1="50" y1="80" x2="78" y2="80" />
            <line x1="50" y1="100" x2="78" y2="100" />
          </g>
        </svg>
      );
    case "tower":
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <g stroke={stroke} strokeWidth="2" fill="none">
            <line x1="120" y1="20" x2="120" y2="140" />
            <line x1="160" y1="20" x2="160" y2="140" />
            <line x1="120" y1="36" x2="160" y2="36" />
            <line x1="120" y1="60" x2="160" y2="60" />
            <line x1="120" y1="84" x2="160" y2="84" />
            <line x1="120" y1="108" x2="160" y2="108" />
            <line x1="120" y1="132" x2="160" y2="132" />
          </g>
          <g stroke="var(--purple)" strokeWidth="1.4" fill="none">
            <path d="M120 140 Q 100 80, 130 20" />
            <path d="M160 140 Q 180 80, 150 20" />
          </g>
        </svg>
      );
    case "cantilever":
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <rect x="40" y="50" width="14" height="80" fill="var(--ink-dim)" opacity="0.25" />
          <line x1="54" y1="90" x2="220" y2="90" stroke={stroke} strokeWidth="4" />
          <line x1="220" y1="92" x2="220" y2="125" stroke={accent} strokeWidth="1.8" />
          <polygon points="220,125 215,118 225,118" fill={accent} />
        </svg>
      );
    case "plate":
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <rect x="50" y="55" width="180" height="60" fill="none" stroke={stroke} strokeWidth="2" />
          <g stroke="var(--border-light)" strokeWidth="0.6">
            <line x1="80" y1="55" x2="80" y2="115" />
            <line x1="110" y1="55" x2="110" y2="115" />
            <line x1="140" y1="55" x2="140" y2="115" />
            <line x1="170" y1="55" x2="170" y2="115" />
            <line x1="200" y1="55" x2="200" y2="115" />
            <line x1="50" y1="80" x2="230" y2="80" />
            <line x1="50" y1="100" x2="230" y2="100" />
          </g>
        </svg>
      );
    case "truss":
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <g stroke={stroke} strokeWidth="2" fill="none">
            <line x1="30" y1="120" x2="250" y2="120" />
            <line x1="30" y1="120" x2="80" y2="60" />
            <line x1="80" y1="60" x2="140" y2="120" />
            <line x1="140" y1="120" x2="200" y2="60" />
            <line x1="200" y1="60" x2="250" y2="120" />
            <line x1="80" y1="60" x2="200" y2="60" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

function pillClassForBadge(badge?: TemplateEntry["badge"]): string {
  if (badge === "POPOLARE") return "tpl-pill pill-pop";
  if (badge === "PRO") return "tpl-pill pill-pro";
  if (badge === "NEW") return "tpl-pill pill-new";
  return "tpl-pill";
}

function matClassForCategory(cat: TemplateEntry["category"]): string {
  if (cat === "acciaio") return "meta-pill mp-mat";
  if (cat === "ca") return "meta-pill mp-mat mp-mat-ca";
  if (cat === "legno") return "meta-pill mp-mat mp-mat-wood";
  if (cat === "sismica") return "meta-pill";
  return "meta-pill";
}

function matLabel(cat: TemplateEntry["category"]): string {
  if (cat === "ca") return "CA";
  return cat;
}

export interface TemplateGalleryProps {
  onOpenTemplate?: (backendId: string | null, label: string) => void;
  onOpenGallery?: () => void;
}

export function TemplateGallery({ onOpenTemplate, onOpenGallery }: TemplateGalleryProps) {
  const [filter, setFilter] = useState<Filter>("tutti");
  const visible = filter === "tutti" ? TEMPLATES : TEMPLATES.filter((t) => t.category === filter);

  return (
    <section className="block tpl-block" id="template-gallery" data-testid="dash-template-gallery">
      <header className="block-head">
        <div>
          <span className="eyebrow">Catalogo · {TEMPLATES.length} template</span>
          <h2>Modelli FEM pronti all&apos;uso</h2>
        </div>
        <button
          type="button"
          className="block-link"
          onClick={() => onOpenGallery?.()}
          data-testid="dash-template-openall"
        >
          Apri la gallery
          <ChevronRight strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div className="tg-filters" role="group" aria-label="Filtro template per materiale">
        {FILTERS.map((f) => {
          const count = countForFilter(f.key);
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              className={`filter-chip${active ? " is-active" : ""}`}
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              data-testid={`dash-tpl-filter-${f.key}`}
            >
              {f.label}
              <span className="fc-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="tg-grid">
        {visible.map((t) => (
          <article
            key={t.id}
            className={`tpl-card${t.badge === "POPOLARE" ? " is-featured" : ""}`}
            data-testid={`dash-tpl-card-${t.id}`}
          >
            <div className="tpl-thumb">
              <GenericThumb variant={t.variant} />
              {t.badge && <span className={pillClassForBadge(t.badge)}>{t.badge}</span>}
            </div>
            <div className="tpl-body">
              <span className="tpl-id">{t.uc}</span>
              <h3>{t.title}</h3>
              <p>{t.desc}</p>
              <div className="tpl-meta">
                <span className={matClassForCategory(t.category)}>{matLabel(t.category)}</span>
                {t.pills.map((p) => (
                  <span key={p} className="meta-pill">{p}</span>
                ))}
                <span className="meta-dot">·</span>
                <span className="meta-time">{t.timeMin} min</span>
              </div>
            </div>
            <button
              type="button"
              className="tpl-cta"
              onClick={() => onOpenTemplate?.(t.backendId, `${t.uc} · ${t.title}`)}
              data-testid={`dash-tpl-open-${t.id}`}
            >
              Apri template
              <ArrowRight strokeWidth={2.4} aria-hidden />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
