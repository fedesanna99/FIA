/**
 * BrandAside · v2.7.0 Phase 4.1 mockup-driven
 *
 * Left aside dell'auth split-screen 50/50: gradient cyan + grid pattern
 * faint + brand-mark + manifesto eyebrow + brand-claim 4-line + brand-sub +
 * BrandDiagramSVG + brand-stats 62/5/1244 + footer copyright + cambia
 * lingua placeholder.
 *
 * Sorgente: ui_kits/webapp_desktop/Auth.html righe 33-169 (mockup
 * Claude Design handoff v0.3 aggiornato).
 *
 * Vince il mockup: testi/numeri/copyright/manifesto copiati verbatim.
 *
 * Stats hardcoded (62 endpoint / 5 Eurocodici / 1244 test): brief decisione
 * 6. TODO(v2.8): wire to `/api/stats` endpoint quando il backend espone
 * il counter.
 */
import { Fragment } from "react";

import { BrandDiagramSVG } from "./BrandDiagramSVG";

interface BrandStat {
  value: string;
  label: string;
}

// TODO(v2.8): sostituire con fetch da /api/stats (brief decisione 6).
const STATS: readonly BrandStat[] = [
  { value: "62", label: "endpoint REST" },
  { value: "5", label: "Eurocodici" },
  { value: "1244", label: "test passing" },
];

export function BrandAside() {
  return (
    <aside className="auth-brand" data-testid="auth-brand-aside">
      <div className="auth-brand-top">
        <div className="brand-mark">
          <span className="brand-square">F</span>
          <div>
            <div className="brand-name">FEA Pro</div>
            <div className="brand-tag">FEM Web Studio</div>
          </div>
        </div>
      </div>

      <div className="auth-brand-mid">
        <span className="eyebrow">Manifesto · v2.3.7</span>
        <h1 className="brand-claim">
          L'<b>algoritmo</b>
          <br />
          sopra l'AI.
          <br />
          L'<b>onestà</b>
          <br />
          sopra il marketing.
        </h1>
        <p className="brand-sub">
          Modella · analizza · verifica strutture nel browser. 13&nbsp;tipi di
          elementi, 10&nbsp;solver, normative EC2/3/5/8 e NTC&nbsp;18 — verificate
          riga per riga.
        </p>

        <div className="brand-diagram" aria-hidden="true">
          <BrandDiagramSVG />
        </div>

        <div className="brand-stats" data-testid="brand-stats">
          {STATS.map((stat, i) => (
            <Fragment key={stat.label}>
              <div className="stat-cell">
                <div className="stat-v">{stat.value}</div>
                <div className="stat-k">{stat.label}</div>
              </div>
              {i < STATS.length - 1 && <div className="stat-sep" />}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="auth-brand-bot">
        <span>© 2024 FEA Pro · Open-source GPLv3 · <a href="/about" target="_blank" rel="noopener">About</a></span>
        <a
          href="#i18n-placeholder"
          onClick={(e) => e.preventDefault()}
          title="i18n in arrivo v3.x"
          data-testid="auth-i18n-placeholder"
          style={{ cursor: "default", opacity: 0.7 }}
        >
          Cambia lingua · IT
        </a>
      </div>
    </aside>
  );
}
