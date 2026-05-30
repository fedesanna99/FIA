/**
 * EmptyOnboarding · Fetta E3.6 (redesign workspace-fasi)
 *
 * Mostrato in stato C (utente con 0 modelli, primo accesso). 3 tile
 * illustrativi grandi con CTA dirette ai template più semplici (Trave,
 * Mensola, Telaio). Pattern NN/g empty-state-as-in-context-onboarding
 * (CULTURE.md §1, audacia c del brief Round 1).
 *
 * Replica mockup CD Round 2 sezione
 * `<section class="block empty-onboard">`. Stili in `dashboard-soft.css`.
 */
import { ArrowRight } from "lucide-react";

interface OnboardStep {
  step: string;
  uc: string;
  title: string;
  desc: string;
  backendId: string;
  variant: "beam" | "cantilever" | "portal" | "truss";
}

// v3.5 GAL-fix (30/05/2026 sera): rimosso step 2 fantasma
// ex_cantilever_steel (404 backend). Riordinata progressione pedagogica
// 1D → 2D → 3D usando solo template realmente disponibili nel backend
// (vedi backend/examples.py + data/models/ex_*.json).
// Passo 2 ora = telaio portale (era passo 3), passo 3 nuovo = reticolare 3D.
const STEPS: OnboardStep[] = [
  {
    step: "Passo 1 · il più semplice",
    uc: "UC1",
    title: "Trave bi-appoggiata",
    desc: "Una trave, un carico distribuito, un risultato verificato EC3 in due minuti.",
    backendId: "ex_simple_beam_2d",
    variant: "beam",
  },
  {
    step: "Passo 2 · un grado in 2D",
    uc: "UC2",
    title: "Telaio portale 2D",
    desc: "Telaio rigido con carico di vento. Introduce nodi, vincoli combinati e azione orizzontale.",
    backendId: "ex_portal_frame_2d",
    variant: "portal",
  },
  {
    step: "Passo 3 · esplora il 3D",
    uc: "UC6",
    title: "Reticolare spaziale 3D",
    desc: "Torre reticolare a 4 livelli, carichi nodali al top. Aste in compressione e trazione.",
    backendId: "ex_truss_3d",
    variant: "truss",
  },
];

function StepThumb({ variant }: { variant: OnboardStep["variant"] }) {
  const stroke = "var(--ink)";
  const accent = "var(--coral)";
  switch (variant) {
    case "beam":
      return (
        <svg viewBox="0 0 280 150" preserveAspectRatio="xMidYMid meet">
          <line x1="40" y1="78" x2="240" y2="78" stroke={stroke} strokeWidth="6" />
          <circle cx="40" cy="78" r="4" fill="var(--accent)" />
          <circle cx="240" cy="78" r="4" fill="var(--accent)" />
          <g stroke={accent} strokeWidth="1.4" opacity="0.8">
            <line x1="60" y1="50" x2="60" y2="70" />
            <line x1="100" y1="50" x2="100" y2="70" />
            <line x1="140" y1="50" x2="140" y2="70" />
            <line x1="180" y1="50" x2="180" y2="70" />
            <line x1="220" y1="50" x2="220" y2="70" />
          </g>
        </svg>
      );
    case "cantilever":
      return (
        <svg viewBox="0 0 280 150" preserveAspectRatio="xMidYMid meet">
          <rect x="44" y="42" width="16" height="76" fill="var(--ink-dim)" opacity="0.22" />
          <path d="M60 76 Q150 86 232 108" stroke={stroke} strokeWidth="2.5" fill="none" />
          <line x1="60" y1="76" x2="232" y2="76" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="2 3" />
          <line x1="232" y1="86" x2="232" y2="120" stroke={accent} strokeWidth="1.5" />
          <polygon points="232,120 227,113 237,113" fill={accent} />
        </svg>
      );
    case "portal":
      return (
        <svg viewBox="0 0 280 150" preserveAspectRatio="xMidYMid meet">
          <g stroke={stroke} strokeWidth="2.5" fill="none">
            <line x1="80" y1="120" x2="80" y2="40" />
            <line x1="80" y1="40" x2="200" y2="40" />
            <line x1="200" y1="40" x2="200" y2="120" />
          </g>
          <circle cx="80" cy="40" r="3" fill={stroke} />
          <circle cx="200" cy="40" r="3" fill={stroke} />
          <g stroke={accent} strokeWidth="1.5">
            <line x1="50" y1="58" x2="78" y2="58" />
            <line x1="50" y1="78" x2="78" y2="78" />
          </g>
        </svg>
      );
    case "truss":
      // Reticolare 3D · torre a 4 livelli (semplificata: 2 montanti + diagonali + base)
      return (
        <svg viewBox="0 0 280 150" preserveAspectRatio="xMidYMid meet">
          <g stroke={stroke} strokeWidth="2" fill="none">
            <line x1="100" y1="120" x2="100" y2="30" />
            <line x1="180" y1="120" x2="180" y2="30" />
            <line x1="100" y1="30" x2="180" y2="30" />
            <line x1="100" y1="52" x2="180" y2="52" />
            <line x1="100" y1="74" x2="180" y2="74" />
            <line x1="100" y1="96" x2="180" y2="96" />
            <line x1="100" y1="118" x2="180" y2="118" />
            <line x1="100" y1="52" x2="180" y2="30" />
            <line x1="100" y1="74" x2="180" y2="52" />
            <line x1="100" y1="96" x2="180" y2="74" />
            <line x1="100" y1="118" x2="180" y2="96" />
          </g>
          <g stroke={accent} strokeWidth="1.5">
            <line x1="140" y1="14" x2="140" y2="30" />
            <polygon points="140,30 135,22 145,22" fill={accent} />
          </g>
          <line x1="86" y1="128" x2="194" y2="128" stroke="var(--ink-dim)" strokeWidth="1" />
        </svg>
      );
    default:
      return null;
  }
}

export interface EmptyOnboardingProps {
  onStart?: (backendId: string, label: string) => void;
  onScrollToGallery?: () => void;
  onCreateBlank?: () => void;
}

export function EmptyOnboarding({ onStart, onScrollToGallery, onCreateBlank }: EmptyOnboardingProps) {
  return (
    <section className="block empty-onboard" data-testid="dash-empty-onboard">
      <header className="block-head">
        <div>
          <span className="eyebrow">Inizia da un caso semplice</span>
          <h2>Tre modi per arrivare a un risultato</h2>
        </div>
      </header>
      <div className="empty-grid">
        {STEPS.map((s) => (
          <article key={s.uc} className="empty-tile" data-testid={`dash-empty-${s.uc}`}>
            <div className="empty-thumb">
              <StepThumb variant={s.variant} />
            </div>
            <div className="empty-body">
              <span className="empty-step">{s.step}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <button
                type="button"
                className="empty-cta"
                onClick={() => onStart?.(s.backendId, `${s.uc} · ${s.title}`)}
              >
                Inizia
                <ArrowRight strokeWidth={2} aria-hidden />
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="empty-note">
        Preferisci esplorare? Scorri tutti i{" "}
        <a
          href="#template-gallery"
          onClick={(e) => {
            e.preventDefault();
            onScrollToGallery?.();
          }}
        >
          9 template a catalogo
        </a>{" "}
        qui sotto, o{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (onCreateBlank) onCreateBlank();
            else window.dispatchEvent(new Event("feapro:open-new-model"));
          }}
        >
          crea un modello vuoto
        </a>
        .
      </p>
    </section>
  );
}
