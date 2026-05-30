/**
 * PercorsiGalleryPage · v3.5 Fetta D2 (30/05/2026 mattina)
 *
 * Demo Slice v1.9 · Galleria "Choose a path" — la home dei Percorsi
 * guidati. L'utente arriva qui da:
 *   - Dashboard → "Segui un percorso" (E3.3 action-aside)
 *   - AvatarMenu → "Percorsi guidati" (E2.1)
 *   - Breadcrumb di /percorsi/* (link "Percorsi")
 *
 * Pattern visivo: mockup `02_percorsi_path_selection.png` (pacchetto
 * Claude Design v0.3):
 *   - Header "Choose a path" + descrizione
 *   - Grid 3-col card con "Promoted" badge sul percorso primario
 *   - Sidebar dx 320px: Credits chip + Persona breve + AI Copilot
 *     placeholder + Tips
 *   - Footer "Cos'è Percorsi?" 4 pillole filosofiche
 *
 * Scope D2 (questa fetta): 3 card hardcoded · sidebar visiva placeholder ·
 * footer pillole. Il backend wiring (lista percorsi dinamica, credits
 * real-time) e AI Copilot funzionante arrivano in fette successive.
 *
 * Route: /percorsi (dentro AuthGate). Non sostituisce /percorsi/uc1 ne'
 * /percorsi/telaio-2d — è il livello sopra: galleria → click card →
 * naviga a route specifica.
 */
import { Link } from "react-router-dom";
import {
  Settings, Beaker, Upload, Activity, Compass, Plus, Sparkles, Lightbulb,
  ArrowRight,
} from "lucide-react";

import "../styles/percorsi-gallery.css";


interface PercorsoCard {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Settings;
  href: string;
  /** Mostra il badge "Promoted" sopra la card. Massimo 1 promoted alla volta. */
  promoted?: boolean;
  /** Disabled (placeholder per percorsi in arrivo). Niente click handler. */
  comingSoon?: boolean;
  ctaLabel?: string;
}


// v3.5 D2: 3 percorsi MVP. Verifica Telaio 2D è il PROMOTED (Demo Slice
// v1.9 ufficiale). Trave bi-appoggiata UC1 riusa la route esistente
// (PercorsoUC1Page mockup-driven). "Altri in arrivo" comingSoon dim.
const PERCORSI: PercorsoCard[] = [
  {
    id: "verifica-telaio-2d",
    title: "Verifica telaio 2D",
    subtitle: "Telaio portale parametrico con verifica EC3 · S275 · NTC18. Da geometria a report PDF in 6 step.",
    icon: Settings,
    href: "/percorsi/telaio-2d",
    promoted: true,
    ctaLabel: "Inizia percorso",
  },
  {
    id: "trave-uc1",
    title: "Trave bi-appoggiata · UC1",
    subtitle: "Verifica utilization coefficient su trave 4m con carico uniforme. Caso didattico introduttivo.",
    icon: Beaker,
    href: "/percorsi/uc1",
    ctaLabel: "Inizia percorso",
  },
  {
    id: "import-ifc-dxf",
    title: "Import IFC / DXF",
    subtitle: "Importa un modello strutturale esistente da BIM o CAD e verificalo passo passo. In arrivo.",
    icon: Upload,
    href: "#",
    comingSoon: true,
    ctaLabel: "Disponibile presto",
  },
];


export function PercorsiGalleryPage(): JSX.Element {
  return (
    <div className="percorsi-gallery" data-testid="percorsi-gallery-page">
      {/* ── Topbar minima · brand + breadcrumb · pattern allineato a PTD ── */}
      <header className="pgall-topbar">
        <Link className="pgall-brand" to="/" data-testid="pgall-brand-home">
          <span className="pgall-brand-square">F</span>
          <span className="pgall-brand-name">FEA Pro</span>
        </Link>

        <div className="pgall-breadcrumb">
          <Link to="/">Home</Link>
          <span className="pgall-bc-sep">/</span>
          <span className="pgall-bc-now">Percorsi</span>
        </div>

        <Link
          className="pgall-open-studio"
          to="/"
          data-testid="pgall-open-studio-pro"
          aria-label="Apri Studio Pro — modalità esperto senza guardrail"
        >
          Apri Studio Pro
        </Link>
      </header>

      {/* ── Body: hero + grid 3 card + sidebar dx + footer pillole ── */}
      <main className="pgall-body">
        <div className="pgall-layout">
          <section className="pgall-main">
            {/* Hero header */}
            <header className="pgall-hero" data-testid="pgall-hero">
              <p className="pgall-hero-eyebrow">PERCORSI GUIDATI</p>
              <h1 className="pgall-hero-title">Choose a path</h1>
              <p className="pgall-hero-desc">
                Parti da uno scenario reale, FEA Pro ti porta passo passo
                verso il risultato. Sempre puoi tornare in Studio Pro per
                il controllo completo.
              </p>
            </header>

            {/* Grid 3 card percorsi */}
            <div className="pgall-grid" role="list" aria-label="Percorsi disponibili">
              {PERCORSI.map((p) => (
                <PercorsoCardComponent key={p.id} percorso={p} />
              ))}
            </div>
          </section>

          {/* Sidebar dx (Credits + Persona + AI Copilot + Tips) */}
          <aside className="pgall-side" aria-label="Informazioni di contesto">
            <SideCardCredits />
            <SideCardPersona />
            <SideCardCopilot />
            <SideCardTips />
          </aside>
        </div>

        {/* Footer pillole filosofiche */}
        <footer className="pgall-footer" data-testid="pgall-footer">
          <FooterPill
            title="Cos'è Percorsi?"
            body="Workflow guidati verso il risultato. Per esperti che vogliono un assistente, per principianti che vogliono imparare."
          />
          <FooterPill
            title="Step-by-step"
            body="Validation per ogni step. Non avanzi finché i dati non sono coerenti."
          />
          <FooterPill
            title="Algorithmic guidance"
            body="Niente AI black box. Ogni suggerimento ha una formula o un riferimento normativo."
          />
          <FooterPill
            title="Always in control"
            body="Puoi uscire dal percorso in qualunque momento e aprire il modello in Studio Pro."
          />
        </footer>
      </main>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function PercorsoCardComponent({ percorso }: { percorso: PercorsoCard }) {
  const { id, title, subtitle, icon: Icon, href, promoted, comingSoon, ctaLabel } = percorso;

  const cardClass = [
    "pgall-card",
    promoted && "is-promoted",
    comingSoon && "is-coming-soon",
  ].filter(Boolean).join(" ");

  const inner = (
    <>
      {promoted && (
        <div className="pgall-card-badge" aria-label="Percorso promosso">
          Promoted
        </div>
      )}
      <div className="pgall-card-icon-wrap">
        <Icon size={22} strokeWidth={1.8} aria-hidden />
      </div>
      <h2 className="pgall-card-title">{title}</h2>
      <p className="pgall-card-sub">{subtitle}</p>
      <div className="pgall-card-cta">
        {ctaLabel ?? "Inizia"}
        {!comingSoon && <ArrowRight size={14} strokeWidth={2} aria-hidden />}
      </div>
    </>
  );

  if (comingSoon) {
    return (
      <div
        role="listitem"
        className={cardClass}
        data-testid={`pgall-card-${id}`}
        aria-disabled="true"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      to={href}
      role="listitem"
      className={cardClass}
      data-testid={`pgall-card-${id}`}
    >
      {inner}
    </Link>
  );
}


function SideCardCredits() {
  // v3.5 D2: hardcoded 47/100 come da mockup. D7 lo cabla a useBillingQuota.
  return (
    <div className="pgall-side-card pgall-side-credits" data-testid="pgall-side-credits">
      <div className="pgall-side-credits-num">47</div>
      <div className="pgall-side-credits-tot">/ 100 crediti</div>
      <div className="pgall-side-credits-hint">
        I percorsi guidati sono <strong>gratuiti</strong> · I crediti
        servono per analisi non-lineari + report avanzati.
      </div>
    </div>
  );
}


function SideCardPersona() {
  return (
    <div className="pgall-side-card" data-testid="pgall-side-persona">
      <div className="pgall-side-eyebrow">PERSONA IN BREVE</div>
      <ul className="pgall-side-list">
        <li>
          <Compass size={12} strokeWidth={2} aria-hidden />
          <span>Workflow guidato</span>
        </li>
        <li>
          <Lightbulb size={12} strokeWidth={2} aria-hidden />
          <span>Suggerimenti intelligenti</span>
        </li>
        <li>
          <Activity size={12} strokeWidth={2} aria-hidden />
          <span>Spiega chiaramente · ogni step</span>
        </li>
      </ul>
    </div>
  );
}


function SideCardCopilot() {
  // v3.5 D2: placeholder. AI Copilot funzionale arriva in v1.10 (vedi
  // Documento Madre §17 pilastri).
  return (
    <div className="pgall-side-card pgall-side-copilot" data-testid="pgall-side-copilot">
      <div className="pgall-side-eyebrow">
        <Sparkles size={11} strokeWidth={2} aria-hidden />
        AI COPILOT
      </div>
      <p className="pgall-side-copilot-msg">
        Disponibile presto · <strong>v1.10</strong>.
      </p>
      <p className="pgall-side-copilot-hint">
        Pattern decisi: algoritmo &gt; AI. L'assistente spiegherà i tuoi
        risultati senza essere black box.
      </p>
    </div>
  );
}


function SideCardTips() {
  return (
    <div className="pgall-side-card" data-testid="pgall-side-tips">
      <div className="pgall-side-eyebrow">TIPS</div>
      <p className="pgall-side-tips-msg">
        Puoi uscire dal percorso in qualsiasi momento e aprire il modello
        in <strong>Studio Pro</strong> per il controllo completo.
      </p>
    </div>
  );
}


function FooterPill({ title, body }: { title: string; body: string }) {
  return (
    <div className="pgall-pill">
      <Plus size={12} strokeWidth={2} className="pgall-pill-icon" aria-hidden />
      <div>
        <p className="pgall-pill-title">{title}</p>
        <p className="pgall-pill-body">{body}</p>
      </div>
    </div>
  );
}
