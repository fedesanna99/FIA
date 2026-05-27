/**
 * BrandDiagramSVG · v2.7.0 Phase 4.1 mockup-driven
 *
 * Trave bi-appoggiata con stress colormap σ, deformata sin-shape, carico
 * distribuito q = 10 kN/m, freccia δ = 9.61 mm, span L = 6.00 m, IPE 300,
 * S355. Componente puramente presentational (no props), riutilizzabile.
 *
 * Estratto verbatim da `ui_kits/webapp_desktop/Auth.html` righe 60-144 del
 * pack handoff v0.3. Attributi SVG convertiti a camelCase per React; tutti
 * gli altri valori preservati come da mockup autoritativo.
 *
 * Vince il mockup: non semplificare il SVG né modificare colori del
 * gradient `stress` (Eurocodice colormap blu→ciano→verde→giallo→rosso).
 */
export function BrandDiagramSVG() {
  return (
    <svg viewBox="0 0 480 200" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="stress" x1="0" x2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.25" stopColor="#06b6d4" />
          <stop offset="0.50" stopColor="#84cc16" />
          <stop offset="0.75" stopColor="#facc15" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        <marker
          id="arr"
          viewBox="0 0 12 12"
          refX="6"
          refY="11"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path
            d="M2 1 L6 11 L10 1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>

      {/* Distributed load */}
      <g color="#FFFFFF" opacity="0.9">
        <line x1="50" y1="40" x2="430" y2="40" stroke="currentColor" strokeWidth="1.6" />
        {/* arrows */}
        <g stroke="currentColor" strokeWidth="1.2" markerEnd="url(#arr)">
          <line x1="60" y1="42" x2="60" y2="98" />
          <line x1="92" y1="42" x2="92" y2="98" />
          <line x1="124" y1="42" x2="124" y2="98" />
          <line x1="156" y1="42" x2="156" y2="98" />
          <line x1="188" y1="42" x2="188" y2="98" />
          <line x1="220" y1="42" x2="220" y2="98" />
          <line x1="252" y1="42" x2="252" y2="98" />
          <line x1="284" y1="42" x2="284" y2="98" />
          <line x1="316" y1="42" x2="316" y2="98" />
          <line x1="348" y1="42" x2="348" y2="98" />
          <line x1="380" y1="42" x2="380" y2="98" />
          <line x1="412" y1="42" x2="412" y2="98" />
        </g>
        <text
          x="240"
          y="32"
          fill="currentColor"
          textAnchor="middle"
          fontFamily="JetBrains Mono"
          fontSize="11"
          fontWeight="600"
          letterSpacing="0.04em"
        >
          q = 10.0 kN/m
        </text>
      </g>

      {/* Beam (deformed sin shape, stress-colored) */}
      <path
        d="M50 110 Q 240 175, 430 110"
        stroke="url(#stress)"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />

      {/* Original (ghost) */}
      <line
        x1="50"
        y1="110"
        x2="430"
        y2="110"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeDasharray="3 4"
      />

      {/* Supports */}
      <g color="#FFFFFF" opacity="0.85">
        <g transform="translate(50 116)">
          <polygon points="0,0 -10,14 10,14" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <line x1="-14" y1="18" x2="14" y2="18" stroke="currentColor" strokeWidth="1.4" />
          <g stroke="currentColor" strokeWidth="0.9">
            <line x1="-10" y1="18" x2="-14" y2="24" />
            <line x1="-4" y1="18" x2="-8" y2="24" />
            <line x1="2" y1="18" x2="-2" y2="24" />
            <line x1="8" y1="18" x2="4" y2="24" />
          </g>
        </g>
        <g transform="translate(430 116)">
          <polygon points="0,0 -10,11 10,11" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="-5" cy="14" r="2.4" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="5" cy="14" r="2.4" fill="none" stroke="currentColor" strokeWidth="1" />
          <line x1="-14" y1="19" x2="14" y2="19" stroke="currentColor" strokeWidth="1.4" />
        </g>
      </g>

      {/* Annotation */}
      <g fontFamily="JetBrains Mono" fontSize="10" fill="#FFFFFF" opacity="0.9">
        <line
          x1="240"
          y1="110"
          x2="240"
          y2="155"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
        <rect
          x="248"
          y="138"
          width="86"
          height="20"
          rx="4"
          fill="rgba(255,255,255,0.10)"
          stroke="rgba(255,255,255,0.30)"
          strokeWidth="0.5"
        />
        <text x="254" y="152" fontWeight="700">
          δ = 9.61 mm
        </text>
      </g>

      {/* Span dim */}
      <g fontFamily="JetBrains Mono" fontSize="9" fill="#FFFFFF" opacity="0.75">
        <line
          x1="50"
          y1="180"
          x2="430"
          y2="180"
          stroke="currentColor"
          strokeWidth="0.6"
        />
        <line x1="50" y1="176" x2="50" y2="184" stroke="currentColor" strokeWidth="0.6" />
        <line x1="430" y1="176" x2="430" y2="184" stroke="currentColor" strokeWidth="0.6" />
        <text x="240" y="194" textAnchor="middle">
          L = 6.00 m · IPE 300 · S355
        </text>
      </g>
    </svg>
  );
}
