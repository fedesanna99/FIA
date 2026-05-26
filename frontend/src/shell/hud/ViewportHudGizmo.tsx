// v2.6.2 Shell · HUD Gizmo (bottom-right)
// Axes XYZ indicator. In Fase 2 questo è un PLACEHOLDER SVG: il GizmoHelper
// vero di drei è già renderizzato dentro Viewport3D (R3F children) e occupa
// la sua posizione di default. Il box .vp-gizmo qui sotto rende solo un
// indicatore informativo addizionale, non duplica il gizmo R3F.
//
// NOTA Fase 3+: spostare il GizmoHelper di drei in questa posizione
// (bottom-right 88×88) e rimuovere questo placeholder.

export function ViewportHudGizmo() {
  return (
    <div className="vp-hud vp-gizmo" aria-hidden data-hud="gizmo">
      <svg width="76" height="76" viewBox="0 0 80 80">
        <g transform="translate(40 40)">
          {/* Z up */}
          <line x1="0" y1="0" x2="0" y2="-26" stroke="#3DA9FC" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="-30" r="8" fill="#3DA9FC" />
          <text x="0" y="-27" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">Z</text>
          {/* X right */}
          <line x1="0" y1="0" x2="22" y2="13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <circle cx="26" cy="15" r="8" fill="#EF4444" />
          <text x="26" y="18" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">X</text>
          {/* Y left */}
          <line x1="0" y1="0" x2="-22" y2="13" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
          <circle cx="-26" cy="15" r="8" fill="#22C55E" />
          <text x="-26" y="18" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">Y</text>
          <circle cx="0" cy="0" r="2.5" fill="var(--ink)" />
        </g>
      </svg>
    </div>
  );
}
