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
  variant: "beam" | "portal" | "tower" | "cantilever" | "plate" | "truss" | "membrane" | "solid" | "bridge" | "laminate" | "building";
}

// v3.5 GAL-fix (30/05/2026 sera): allineato a backend reale (9 template
// in backend/examples.py + data/models/ex_*.json). Rimossi 6 ID
// fantasma (ex_cantilever_steel / ex_plate_thick / ex_wood_beam /
// ex_seismic_th / ex_concrete_column) che davano 404 al click.
// Aggiunti 5 template che esistevano nel backend ma non erano in UI:
// shell_plate / tri3_seismic / cube_solid_h8 / cable_bridge_2d /
// laminate_plate. UC4-9 ri-mappati per coerenza con i nuovi contenuti.
const TEMPLATES: TemplateEntry[] = [
  { id: "t1", backendId: "ex_simple_beam_2d", uc: "UC1", title: "Trave bi-appoggiata", desc: "Trave isostatica con carico distribuito. Statica lineare + verifica EC3 LTB.", category: "acciaio", pills: ["statica", "EC3"], timeMin: 2, badge: "POPOLARE", variant: "beam" },
  { id: "t2", backendId: "ex_portal_frame_2d", uc: "UC2", title: "Portale 2D · vento", desc: "Telaio rigido isolato. Carico vento orizzontale + permanenti.", category: "acciaio", pills: ["telaio", "EC3"], timeMin: 3, variant: "portal" },
  { id: "t3", backendId: "ex_tower_3d", uc: "UC3", title: "Torre 8 piani · sismica", desc: "Edificio multi-piano. Modale + sismica EC8 spettro elastico.", category: "ca", pills: ["sismica", "EC8"], timeMin: 8, badge: "PRO", variant: "tower" },
  { id: "t4", backendId: "ex_shell_plate", uc: "UC4", title: "Piastra quadrata 2×2 m", desc: "Piastra acciaio t=100mm incastrata, carichi nodali. SHELL_Q4 a maglia 5×5.", category: "acciaio", pills: ["shell", "Q4"], timeMin: 4, variant: "plate" },
  { id: "t5", backendId: "ex_tri3_seismic", uc: "UC5", title: "Membrana T3 sismica", desc: "Piastra 4×1.5 m T3 plane-stress, incastrata sx, accelerogramma X sinusoidale.", category: "sismica", pills: ["TH", "T3"], timeMin: 6, badge: "PRO", variant: "membrane" },
  { id: "t6", backendId: "ex_truss_3d", uc: "UC6", title: "Reticolare 3D · torre", desc: "Torre reticolare 4 livelli, ø100mm, carichi nodali al top.", category: "acciaio", pills: ["statica", "EC3"], timeMin: 4, variant: "truss" },
  { id: "t7", backendId: "ex_cube_solid_h8", uc: "UC7", title: "Cubo solido H8", desc: "Cubo 1×1×1 m SOLID_H8, base incastrata, trazione assiale 400 kN. Iso 3D σ_VM.", category: "acciaio", pills: ["SOLID", "iso 3D"], timeMin: 3, badge: "NEW", variant: "solid" },
  { id: "t8", backendId: "ex_cable_bridge_2d", uc: "UC8", title: "Ponte strallato 2D", desc: "Impalcato L=12m sospeso da 4 cavi pre-tesi (50 kN), 2 pyloni H=8m. Non-lineare cavi.", category: "acciaio", pills: ["non-lin", "cavi"], timeMin: 7, badge: "PRO", variant: "bridge" },
  { id: "t9", backendId: "ex_laminate_plate", uc: "UC9", title: "Piastra laminata cross-ply", desc: "Piastra 1×1 m laminata 0/90/0 carbon (3mm). Bordo y=0 incastrato. Comportamento ortotropo.", category: "altro", pills: ["composito", "Q4"], timeMin: 5, badge: "NEW", variant: "laminate" },
  // v3.6 TPL-1 (30/05/2026 sera): primo template "professional-grade" da
  // 585 nodi · 500 elementi. Edificio CA 4 piani tipico relazione NTC.
  { id: "t10", backendId: "ex_rc_building_4st", uc: "UC10", title: "Edificio CA 4 piani", desc: "Edificio residenziale CA, pianta 12×8 m, 3×2 baie, pilastri+travi 30×50 cm C25/30, solai shell 20 cm. ~585 nodi · 500 elementi.", category: "ca", pills: ["beam3D", "shell", "NTC"], timeMin: 12, badge: "NEW", variant: "building" },
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
    case "membrane":
      // Membrana T3 sismica: incastro sx + mesh triangoli + freccia accelerogramma orizzontale
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <rect x="36" y="40" width="14" height="80" fill="var(--ink-dim)" opacity="0.22" />
          <g stroke={stroke} strokeWidth="1.4" fill="none">
            <rect x="50" y="50" width="180" height="60" />
            <line x1="95" y1="50" x2="95" y2="110" />
            <line x1="140" y1="50" x2="140" y2="110" />
            <line x1="185" y1="50" x2="185" y2="110" />
            <line x1="50" y1="50" x2="95" y2="110" />
            <line x1="95" y1="50" x2="140" y2="110" />
            <line x1="140" y1="50" x2="185" y2="110" />
            <line x1="185" y1="50" x2="230" y2="110" />
          </g>
          <g stroke={accent} strokeWidth="1.8">
            <line x1="195" y1="80" x2="248" y2="80" />
            <polygon points="248,80 240,75 240,85" fill={accent} />
          </g>
        </svg>
      );
    case "solid":
      // Cubo H8 isometrico: base evidenziata (incastro), trazione assiale up
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <g stroke={stroke} strokeWidth="2" fill="none">
            <polygon points="100,110 180,110 220,90 140,90" />
            <polygon points="100,110 100,50 140,30 140,90" />
            <polygon points="140,90 220,90 220,30 140,30" />
            <line x1="100" y1="50" x2="180" y2="50" strokeDasharray="2 2" opacity="0.4" />
            <line x1="180" y1="50" x2="180" y2="110" strokeDasharray="2 2" opacity="0.4" />
          </g>
          <g stroke={accent} strokeWidth="1.6">
            <line x1="160" y1="20" x2="160" y2="60" />
            <polygon points="160,20 156,30 164,30" fill={accent} />
          </g>
          <rect x="100" y="110" width="120" height="6" fill="var(--ink-dim)" opacity="0.32" />
        </svg>
      );
    case "bridge":
      // Ponte strallato 2D: deck orizzontale + 2 pyloni alti + 4 cavi inclinati
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <line x1="20" y1="110" x2="260" y2="110" stroke={stroke} strokeWidth="3" />
          <g stroke={stroke} strokeWidth="2.2" fill="none">
            <line x1="80" y1="110" x2="80" y2="30" />
            <line x1="200" y1="110" x2="200" y2="30" />
          </g>
          <g stroke={accent} strokeWidth="1.4">
            <line x1="80" y1="30" x2="50" y2="110" />
            <line x1="80" y1="30" x2="130" y2="110" />
            <line x1="200" y1="30" x2="150" y2="110" />
            <line x1="200" y1="30" x2="230" y2="110" />
          </g>
          <polygon points="14,122 28,122 21,134" fill="var(--ink-dim)" opacity="0.55" />
          <polygon points="252,122 266,122 259,134" fill="var(--ink-dim)" opacity="0.55" />
        </svg>
      );
    case "building":
      // Edificio CA multipiano stilizzato (4 piani + colonne + base)
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <g stroke={stroke} strokeWidth="2" fill="none">
            {/* perimetro edificio */}
            <rect x="70" y="30" width="140" height="100" />
            {/* solai (3 linee orizzontali interne) */}
            <line x1="70" y1="55" x2="210" y2="55" />
            <line x1="70" y1="80" x2="210" y2="80" />
            <line x1="70" y1="105" x2="210" y2="105" />
            {/* pilastri interni (2 verticali interne) */}
            <line x1="117" y1="30" x2="117" y2="130" />
            <line x1="163" y1="30" x2="163" y2="130" />
          </g>
          {/* base/fondazione tratteggiata */}
          <line x1="55" y1="130" x2="225" y2="130" stroke="var(--ink-dim)" strokeWidth="2" />
          <g stroke="var(--ink-dim)" strokeWidth="1">
            <line x1="60" y1="130" x2="55" y2="138" />
            <line x1="80" y1="130" x2="75" y2="138" />
            <line x1="100" y1="130" x2="95" y2="138" />
            <line x1="120" y1="130" x2="115" y2="138" />
            <line x1="140" y1="130" x2="135" y2="138" />
            <line x1="160" y1="130" x2="155" y2="138" />
            <line x1="180" y1="130" x2="175" y2="138" />
            <line x1="200" y1="130" x2="195" y2="138" />
            <line x1="220" y1="130" x2="215" y2="138" />
          </g>
          {/* indicatori carico (frecce sui solai) */}
          <g stroke={accent} strokeWidth="1.2" opacity="0.7">
            <line x1="95" y1="44" x2="95" y2="52" />
            <polygon points="95,52 92,47 98,47" fill={accent} />
            <line x1="140" y1="44" x2="140" y2="52" />
            <polygon points="140,52 137,47 143,47" fill={accent} />
            <line x1="185" y1="44" x2="185" y2="52" />
            <polygon points="185,52 182,47 188,47" fill={accent} />
          </g>
        </svg>
      );
    case "laminate":
      // Piastra laminata 0/90/0: 3 strati impilati con angoli fibra ortotropi
      return (
        <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
          <g stroke={stroke} strokeWidth="1.6" fill="none">
            <rect x="50" y="50" width="180" height="18" />
            <rect x="50" y="71" width="180" height="18" />
            <rect x="50" y="92" width="180" height="18" />
          </g>
          <g stroke={accent} strokeWidth="0.9" opacity="0.85">
            <line x1="55" y1="59" x2="225" y2="59" />
            <line x1="85" y1="59" x2="85" y2="59" />
            <line x1="115" y1="59" x2="115" y2="59" />
            <line x1="145" y1="59" x2="145" y2="59" />
            <line x1="175" y1="59" x2="175" y2="59" />
          </g>
          <g stroke={accent} strokeWidth="0.9" opacity="0.85">
            <line x1="65" y1="73" x2="65" y2="87" />
            <line x1="95" y1="73" x2="95" y2="87" />
            <line x1="125" y1="73" x2="125" y2="87" />
            <line x1="155" y1="73" x2="155" y2="87" />
            <line x1="185" y1="73" x2="185" y2="87" />
            <line x1="215" y1="73" x2="215" y2="87" />
          </g>
          <g stroke={accent} strokeWidth="0.9" opacity="0.85">
            <line x1="55" y1="101" x2="225" y2="101" />
          </g>
          <text x="240" y="62" fontFamily="monospace" fontSize="9" fill="var(--ink-dim)">0°</text>
          <text x="238" y="83" fontFamily="monospace" fontSize="9" fill="var(--ink-dim)">90°</text>
          <text x="240" y="104" fontFamily="monospace" fontSize="9" fill="var(--ink-dim)">0°</text>
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
