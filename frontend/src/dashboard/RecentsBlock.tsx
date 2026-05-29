/**
 * RecentsBlock · Fetta E3.4 (redesign workspace-fasi)
 *
 * Sostituisce la vecchia RecentSection v2.7.1 con il pattern Claude
 * Design Round 2 (Handoff 05 sezione 2 + audacie a/b):
 * - Carousel orizzontale snap-scroll (vs grid 4 col fissa)
 * - Prima card `.is-resume` con resume-bar accent + bottone "Riprendi"
 *   che apre il workspace nel modello + ultima fase (audacia a)
 * - Thumbnail SVG deterministico per variante geometrica (riuso di
 *   `thumbForVariant` esistente — pattern "PNG/SVG pre-rendered" gia'
 *   nel codebase, audacia b)
 * - Trust badge `PRELIM / DRAFT / VALID` per modello (4 stati onesti)
 *
 * Replica mockup CD `Dashboard.html` sezione
 * `<section class="block recents-block">`. Stili in `dashboard-soft.css`.
 */
import { ChevronRight, Play, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { FEAModel } from "../types/model";

export type ThumbVariant = "beam" | "portal" | "tower" | "cantilever";

export interface RecentsBlockProps {
  models: FEAModel[];
  modelsUnavailable?: boolean;
  modelsRefreshing?: boolean;
  onSelect: (id: string) => void;
  onViewAll?: () => void;
  /** Funzione di rendering thumbnail SVG per variante (passata da DashboardPage). */
  renderThumb: (v: ThumbVariant) => ReactNode;
  /** Funzione di inferenza variante da modello (passata da DashboardPage). */
  inferVariant: (m: FEAModel) => ThumbVariant;
}

function trustForModel(m: FEAModel): { label: "PRELIM" | "DRAFT" | "VALID"; cls: string } {
  // 4 stati onesti (CULTURE.md): VALID solo se modello realmente validato.
  // Heuristic per ora — backend non ha campo `trust_status`.
  // PRELIM = default (calcolo eseguito ma non validato contro benchmark).
  // DRAFT = modello in lavorazione (no calcolo recente / mesh incompleta).
  // VALID = calcolo + benchmark NAFEMS chiuso (riservato post v3.4+).
  const hasNodes = (m.nodes ?? []).length > 0;
  const hasElements = (m.elements ?? []).length > 0;
  if (!hasNodes || !hasElements) return { label: "DRAFT", cls: "trust-draft" };
  return { label: "PRELIM", cls: "trust-prelim" };
}

function formatRelativeTime(updatedAt?: string | null): string {
  if (!updatedAt) return "—";
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return min < 1 ? "ora" : `${min} min fa`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h fa`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "ieri";
  if (day < 7) return `${day} giorni fa`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function lastSessionLabel(updatedAt?: string | null): string {
  if (!updatedAt) return "—";
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return "—";
  const wd = d.toLocaleDateString("it-IT", { weekday: "long" });
  const hm = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `${wd} · ${hm}`;
}

export function RecentsBlock({
  models,
  modelsUnavailable,
  modelsRefreshing,
  onSelect,
  onViewAll,
  renderThumb,
  inferVariant,
}: RecentsBlockProps) {
  // Mostra max 5 modelli nel carousel (gli altri via "Tutti i modelli").
  const recent = models.slice(0, 5);

  if (modelsUnavailable) {
    return (
      <section className="block recents-block" data-testid="dash-recents-error">
        <header className="block-head">
          <div>
            <span className="eyebrow">Riprendi dove avevi lasciato</span>
            <h2>Modelli recenti</h2>
          </div>
        </header>
        <div className="recents-error">
          <p>Impossibile recuperare i modelli. Verifica la connessione.</p>
        </div>
      </section>
    );
  }

  if (recent.length === 0) {
    // Stato C empty → gestito separatamente da EmptyOnboarding (E3.6).
    // Qui niente fallback — la condizione "0 modelli" non rende il block.
    return null;
  }

  return (
    <section className="block recents-block" data-testid="dash-recents">
      <header className="block-head">
        <div>
          <span className="eyebrow">Riprendi dove avevi lasciato</span>
          <h2>Modelli recenti</h2>
        </div>
        <button
          type="button"
          className="block-link"
          onClick={() => onViewAll?.()}
          data-testid="dash-recents-viewall"
        >
          Tutti i modelli
          <ChevronRight strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div className="recents-wrap">
        <div className="recents" role="list">
          {recent.map((m, i) => {
            const isResume = i === 0;
            const variant = inferVariant(m);
            const trust = trustForModel(m);
            const elem = m.elements?.length ?? 0;
            const nodes = m.nodes?.length ?? 0;
            return (
              <article
                key={m.id}
                className={`recent-card${isResume ? " is-resume" : ""}`}
                role="listitem"
                data-testid={`dash-recent-card-${i}`}
              >
                <div className="recent-thumb">
                  {renderThumb(variant)}
                  <span className={`recent-trust ${trust.cls}`}>{trust.label}</span>
                </div>
                <div className="recent-body">
                  <div className="recent-head">
                    <span className="recent-id">{m.id.slice(0, 4).toUpperCase()}</span>
                    <h3 title={m.name ?? m.id}>{m.name ?? "Modello"}</h3>
                  </div>
                  {m.description && <p className="recent-desc">{m.description}</p>}
                  <div className="recent-meta">
                    <span>{nodes} nodi · {elem} elem</span>
                    {m.updated_at && (
                      <>
                        <span className="mdot" />
                        <span>{formatRelativeTime(m.updated_at)}</span>
                      </>
                    )}
                  </div>
                </div>
                {isResume && (
                  <div className="resume-bar">
                    <div className="resume-meta">
                      <div className="resume-eyebrow">Ultima sessione</div>
                      <div className="resume-when">{lastSessionLabel(m.updated_at)}</div>
                    </div>
                    <button
                      type="button"
                      className="resume-btn"
                      onClick={() => onSelect(m.id)}
                      data-testid="dash-resume-btn"
                    >
                      Riprendi
                      <Play strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                )}
                {!isResume && (
                  <button
                    type="button"
                    className="recent-card-overlay"
                    onClick={() => onSelect(m.id)}
                    aria-label={`Apri ${m.name ?? m.id}`}
                  />
                )}
              </article>
            );
          })}
        </div>
      </div>

      {modelsRefreshing && (
        <span className="eyebrow" style={{ alignSelf: "flex-end", display: "block", marginTop: 8 }}>
          Aggiornamento…
        </span>
      )}
    </section>
  );
}
