/**
 * Template Catalog · Single Source of Truth UI (v3.6 SYNC — 30/05/2026 sera)
 *
 * Risolve il bug "10 cards in home vs 9 nel modale `Apri da template`":
 * prima ogni consumer aveva la sua lista hardcoded (TemplateGallery 10,
 * TemplatesPage 9 con fantasmi, TemplateGalleryDialog dinamico ma dict
 * descrizioni statico di 9 chiavi). Adesso TUTTI importano da qui.
 *
 * Aggiungere un nuovo template:
 *   1. scrivere builder in `backend/examples.py` + `build_example_models()`
 *   2. aggiungere 1 voce in TEMPLATES_CATALOG sotto
 *   3. eventualmente aggiungere variant + SVG in VARIANT_THUMBS
 *   → appare automaticamente in TemplateGallery (home), TemplatesPage
 *     (/templates) e TemplateGalleryDialog (modale).
 *
 * Test di consistenza (catalog ↔ backend) in `catalog.test.ts` previene
 * la divergenza UI/backend (fantasmi futuri).
 */
import type { JSX } from "react";

export type TemplateVariant =
  | "beam" | "portal" | "tower" | "cantilever" | "plate" | "truss"
  | "membrane" | "solid" | "bridge" | "laminate" | "building" | "warehouse"
  | "prattTruss" | "frame2d" | "floor" | "wall" | "bridgeBeam";

export type TemplateCategory = "acciaio" | "ca" | "legno" | "sismica" | "altro";
export type TemplateBadge = "POPOLARE" | "PRO" | "NEW";

export interface TemplateEntry {
  /** UI id interno (es. "t1") · stabile tra rendering. */
  id: string;
  /** Backend id passato a POST /api/models/from-template/{backendId}. */
  backendId: string;
  /** Codice UC mostrato all'utente (es. "UC1"). */
  uc: string;
  /** Titolo card (1 riga). */
  title: string;
  /** Descrizione card (~120-180 char). */
  desc: string;
  /** Categoria per filter chip + colore meta-pill. */
  category: TemplateCategory;
  /** Pillole tag (es. ["statica", "EC3"]). */
  pills: string[];
  /** Stima tempo onboarding in minuti. */
  timeMin: number;
  /** Badge in alto a sx della thumbnail. */
  badge?: TemplateBadge;
  /** Tipologia thumb (mappato a VARIANT_THUMBS). */
  variant: TemplateVariant;
}

/**
 * Catalogo canonico 10 template (30/05/2026 sera).
 * Ordine = ordine di display nel Gallery.
 */
export const TEMPLATES_CATALOG: TemplateEntry[] = [
  { id: "t1", backendId: "ex_simple_beam_2d", uc: "UC1", title: "Trave bi-appoggiata", desc: "Trave isostatica con carico distribuito. Statica lineare + verifica EC3 LTB.", category: "acciaio", pills: ["statica", "EC3"], timeMin: 2, badge: "POPOLARE", variant: "beam" },
  { id: "t2", backendId: "ex_portal_frame_2d", uc: "UC2", title: "Portale 2D · vento", desc: "Telaio rigido isolato. Carico vento orizzontale + permanenti.", category: "acciaio", pills: ["telaio", "EC3"], timeMin: 3, variant: "portal" },
  { id: "t3", backendId: "ex_tower_3d", uc: "UC3", title: "Torre 8 piani · sismica", desc: "Edificio multi-piano. Modale + sismica EC8 spettro elastico.", category: "ca", pills: ["sismica", "EC8"], timeMin: 8, badge: "PRO", variant: "tower" },
  { id: "t4", backendId: "ex_shell_plate", uc: "UC4", title: "Piastra quadrata 2×2 m", desc: "Piastra acciaio t=100mm incastrata, carichi nodali. SHELL_Q4 a maglia 5×5.", category: "acciaio", pills: ["shell", "Q4"], timeMin: 4, variant: "plate" },
  { id: "t5", backendId: "ex_tri3_seismic", uc: "UC5", title: "Membrana T3 sismica", desc: "Piastra 4×1.5 m T3 plane-stress, incastrata sx, accelerogramma X sinusoidale.", category: "sismica", pills: ["TH", "T3"], timeMin: 6, badge: "PRO", variant: "membrane" },
  { id: "t6", backendId: "ex_truss_3d", uc: "UC6", title: "Reticolare 3D · torre", desc: "Torre reticolare 4 livelli, ø100mm, carichi nodali al top.", category: "acciaio", pills: ["statica", "EC3"], timeMin: 4, variant: "truss" },
  { id: "t7", backendId: "ex_cube_solid_h8", uc: "UC7", title: "Cubo solido H8", desc: "Cubo 1×1×1 m SOLID_H8, base incastrata, trazione assiale 400 kN. Iso 3D σ_VM.", category: "acciaio", pills: ["SOLID", "iso 3D"], timeMin: 3, badge: "NEW", variant: "solid" },
  { id: "t8", backendId: "ex_cable_bridge_2d", uc: "UC8", title: "Ponte strallato 2D", desc: "Impalcato L=12m sospeso da 4 cavi pre-tesi (50 kN), 2 pyloni H=8m. Non-lineare cavi.", category: "acciaio", pills: ["non-lin", "cavi"], timeMin: 7, badge: "PRO", variant: "bridge" },
  { id: "t9", backendId: "ex_laminate_plate", uc: "UC9", title: "Piastra laminata cross-ply", desc: "Piastra 1×1 m laminata 0/90/0 carbon (3mm). Bordo y=0 incastrato. Comportamento ortotropo.", category: "altro", pills: ["composito", "Q4"], timeMin: 5, badge: "NEW", variant: "laminate" },
  { id: "t10", backendId: "ex_rc_building_4st", uc: "UC10", title: "Edificio CA 4 piani", desc: "Edificio residenziale CA, pianta 12×8 m, 3×2 baie, pilastri+travi 30×50 cm C25/30, solai shell 20 cm. ~585 nodi · 500 elementi.", category: "ca", pills: ["beam3D", "shell", "NTC"], timeMin: 12, badge: "NEW", variant: "building" },
  { id: "t11", backendId: "ex_steel_portal_hall", uc: "UC11", title: "Capannone acciaio 1 campata", desc: "Capannone industriale S355, 20×40 m, 9 telai interasse 5 m. Pilastri HEB300 h=7m, falde IPE300 inclinate 15°, arcarecci IPE200 + controventi facciate. ~81 nodi · 100 elem.", category: "acciaio", pills: ["beam3D", "truss", "EC3"], timeMin: 8, badge: "NEW", variant: "warehouse" },
  { id: "t12", backendId: "ex_steel_truss_pratt_24m", uc: "UC12", title: "Capriata Pratt L=24m", desc: "Capriata reticolare Pratt 12 pannelli, luce 24m, altezza 2.4m (L/10). Correnti IPE200 + montanti/diag Ø100 in S355. Solo aste TRUSS (forza assiale pura). 24 nodi · 45 elem.", category: "acciaio", pills: ["truss", "EC3"], timeMin: 3, badge: "NEW", variant: "prattTruss" },
  { id: "t13", backendId: "ex_rc_frame_2d_pushover", uc: "UC13", title: "Telaio CA 2D pushover EC8", desc: "Telaio piano CA 5×3 piani, pilastri+travi 30×50 cm C25/30. Carichi gravità + pattern triangolare laterale 10/20/30 kN. Pronto per pushover EC8 §4.3.3.3.", category: "ca", pills: ["beam2D", "pushover", "EC8"], timeMin: 5, badge: "PRO", variant: "frame2d" },
  { id: "t14", backendId: "ex_rc_floor_with_beams", uc: "UC14", title: "Solaio CA gettato + travi", desc: "Solaio 8×12 m, shell t=20cm in C25/30, mesh 0.5m. 1 trave principale 30×50 + 2 nervature trasversali, appoggio continuo lati corti. ~425 nodi · 440 elem. NTC §4.1 + EC2.", category: "ca", pills: ["shell", "beam3D", "EC2"], timeMin: 10, badge: "NEW", variant: "floor" },
  { id: "t15", backendId: "ex_retaining_wall_2d", uc: "UC15", title: "Muro sostegno CA plane-strain", desc: "Muro contenimento H=6m sp 0.5m in C25/30, shell mesh 0.1×0.2m. Bordo base incastrato. Spinta attiva Rankine triangolare (Ka=0.33, γ=18 kN/m³). 186 nodi · 150 elem. Geotecnica leggera NTC §6.5 + EC7.", category: "altro", pills: ["shell", "geotecnica", "EC7"], timeMin: 6, badge: "NEW", variant: "wall" },
  { id: "t16", backendId: "ex_bridge_simple_span_20m", uc: "UC16", title: "Ponte trave isostatica L=20m", desc: "Ponte CA 1 campata 20×8 m, impalcato shell t=20cm + 5 travi principali 30×50 + 2 traverse testata. Appoggi cerniere lati corti. Peso proprio + LM1 TS 2×300 kN. 189 nodi · 276 elem. NTC §5 + EC1-2 + EC2-2.", category: "ca", pills: ["shell", "beam3D", "EC1-2"], timeMin: 8, badge: "PRO", variant: "bridgeBeam" },
];


// ── Registry SVG thumbnails (1 component per variant) ───────────────────
// Stile coerente: viewBox 280×160, currentColor stroke, accent variabile.
// Estratti verbatim da dashboard/TemplateGallery.tsx (single source).

const stroke = "var(--ink)";
const accent = "var(--coral)";

function BeamThumb(): JSX.Element {
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
}

function PortalThumb(): JSX.Element {
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
}

function TowerThumb(): JSX.Element {
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
}

function CantileverThumb(): JSX.Element {
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      <rect x="40" y="50" width="14" height="80" fill="var(--ink-dim)" opacity="0.25" />
      <line x1="54" y1="90" x2="220" y2="90" stroke={stroke} strokeWidth="4" />
      <line x1="220" y1="92" x2="220" y2="125" stroke={accent} strokeWidth="1.8" />
      <polygon points="220,125 215,118 225,118" fill={accent} />
    </svg>
  );
}

function PlateThumb(): JSX.Element {
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
}

function TrussThumb(): JSX.Element {
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
}

function MembraneThumb(): JSX.Element {
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
}

function SolidThumb(): JSX.Element {
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
}

function BridgeThumb(): JSX.Element {
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
}

function LaminateThumb(): JSX.Element {
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      <g stroke={stroke} strokeWidth="1.6" fill="none">
        <rect x="50" y="50" width="180" height="18" />
        <rect x="50" y="71" width="180" height="18" />
        <rect x="50" y="92" width="180" height="18" />
      </g>
      <g stroke={accent} strokeWidth="0.9" opacity="0.85">
        <line x1="55" y1="59" x2="225" y2="59" />
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
}

function BuildingThumb(): JSX.Element {
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      <g stroke={stroke} strokeWidth="2" fill="none">
        <rect x="70" y="30" width="140" height="100" />
        <line x1="70" y1="55" x2="210" y2="55" />
        <line x1="70" y1="80" x2="210" y2="80" />
        <line x1="70" y1="105" x2="210" y2="105" />
        <line x1="117" y1="30" x2="117" y2="130" />
        <line x1="163" y1="30" x2="163" y2="130" />
      </g>
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
}

function WarehouseThumb(): JSX.Element {
  // Capannone industriale vista trasversale: 2 pilastri + tetto a 2 falde
  // + colmo + freccia vento + frecce copertura
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      {/* Pilastri sx + dx (con mid-node tick) */}
      <g stroke={stroke} strokeWidth="2.5" fill="none">
        <line x1="55" y1="130" x2="55" y2="60" />
        <line x1="225" y1="130" x2="225" y2="60" />
      </g>
      <g stroke={stroke} strokeWidth="1" fill="none" opacity="0.55">
        <line x1="51" y1="95" x2="59" y2="95" />
        <line x1="221" y1="95" x2="229" y2="95" />
      </g>
      {/* Tetto a 2 falde con colmo + mid-node tick */}
      <g stroke={stroke} strokeWidth="2.5" fill="none">
        <line x1="55" y1="60" x2="140" y2="38" />
        <line x1="140" y1="38" x2="225" y2="60" />
      </g>
      <g stroke={stroke} strokeWidth="1" fill="none" opacity="0.55">
        <line x1="97" y1="46" x2="100" y2="52" />
        <line x1="183" y1="46" x2="180" y2="52" />
      </g>
      {/* Base/fondazione tratteggiata */}
      <line x1="40" y1="130" x2="240" y2="130" stroke="var(--ink-dim)" strokeWidth="1.5" />
      <g stroke="var(--ink-dim)" strokeWidth="0.8">
        <line x1="45" y1="130" x2="40" y2="138" />
        <line x1="55" y1="130" x2="50" y2="138" />
        <line x1="65" y1="130" x2="60" y2="138" />
        <line x1="215" y1="130" x2="210" y2="138" />
        <line x1="225" y1="130" x2="220" y2="138" />
        <line x1="235" y1="130" x2="230" y2="138" />
      </g>
      {/* Freccia vento orizzontale lato sx */}
      <g stroke={accent} strokeWidth="1.5">
        <line x1="22" y1="80" x2="50" y2="80" />
        <polygon points="50,80 44,76 44,84" fill={accent} />
      </g>
      {/* Frecce copertura verticali sulle falde */}
      <g stroke={accent} strokeWidth="1.2" opacity="0.65">
        <line x1="97" y1="30" x2="97" y2="42" />
        <polygon points="97,42 94,37 100,37" fill={accent} />
        <line x1="140" y1="22" x2="140" y2="32" />
        <polygon points="140,32 137,27 143,27" fill={accent} />
        <line x1="183" y1="30" x2="183" y2="42" />
        <polygon points="183,42 180,37 186,37" fill={accent} />
      </g>
    </svg>
  );
}

function PrattTrussThumb(): JSX.Element {
  // Capriata Pratt classica vista laterale: corrente inf + sup + montanti +
  // diagonali in zig-zag verso il centro + 2 puntoni terminali + appoggi
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      {/* Corrente superiore (più alto, linea continua) */}
      <line x1="55" y1="50" x2="225" y2="50" stroke={stroke} strokeWidth="2.5" />
      {/* Corrente inferiore */}
      <line x1="35" y1="110" x2="245" y2="110" stroke={stroke} strokeWidth="2.5" />
      {/* Montanti verticali (5 per side, simmetrici) */}
      <g stroke={stroke} strokeWidth="1.4">
        <line x1="55" y1="50" x2="55" y2="110" />
        <line x1="85" y1="50" x2="85" y2="110" />
        <line x1="115" y1="50" x2="115" y2="110" />
        <line x1="140" y1="50" x2="140" y2="110" />
        <line x1="165" y1="50" x2="165" y2="110" />
        <line x1="195" y1="50" x2="195" y2="110" />
        <line x1="225" y1="50" x2="225" y2="110" />
      </g>
      {/* Diagonali Pratt verso il centro */}
      <g stroke={accent} strokeWidth="1.4">
        {/* Half sx: sup x → inf x+1 (giù-destra) */}
        <line x1="55" y1="50" x2="85" y2="110" />
        <line x1="85" y1="50" x2="115" y2="110" />
        <line x1="115" y1="50" x2="140" y2="110" />
        {/* Half dx: sup x → inf x-1 (giù-sinistra) */}
        <line x1="225" y1="50" x2="195" y2="110" />
        <line x1="195" y1="50" x2="165" y2="110" />
        <line x1="165" y1="50" x2="140" y2="110" />
      </g>
      {/* Puntoni terminali (triangoli ai 2 lati) */}
      <line x1="35" y1="110" x2="55" y2="50" stroke={stroke} strokeWidth="2" />
      <line x1="245" y1="110" x2="225" y2="50" stroke={stroke} strokeWidth="2" />
      {/* Appoggi: cerniera sx + carrello dx */}
      <circle cx="35" cy="110" r="3" fill="var(--accent)" />
      <circle cx="245" cy="110" r="3" fill="var(--accent)" />
      <polygon points="35,114 28,128 42,128" fill="none" stroke="var(--ink-muted)" strokeWidth="1" />
      <polygon points="245,114 238,128 252,128" fill="none" stroke="var(--ink-muted)" strokeWidth="1" />
      {/* Carichi verticali sui nodi sup (3 frecce indicative) */}
      <g stroke="var(--ink-dim)" strokeWidth="1" opacity="0.55">
        <line x1="85" y1="38" x2="85" y2="46" />
        <polygon points="85,46 82,41 88,41" fill="var(--ink-dim)" />
        <line x1="140" y1="32" x2="140" y2="46" />
        <polygon points="140,46 137,41 143,41" fill="var(--ink-dim)" />
        <line x1="195" y1="38" x2="195" y2="46" />
        <polygon points="195,46 192,41 198,41" fill="var(--ink-dim)" />
      </g>
    </svg>
  );
}

/** Registry SVG: per ogni variant → component function da renderizzare. */
export const VARIANT_THUMBS: Record<TemplateVariant, () => JSX.Element> = {
  beam: BeamThumb,
  portal: PortalThumb,
  tower: TowerThumb,
  cantilever: CantileverThumb,
  plate: PlateThumb,
  truss: TrussThumb,
  membrane: MembraneThumb,
  solid: SolidThumb,
  bridge: BridgeThumb,
  laminate: LaminateThumb,
  building: BuildingThumb,
  warehouse: WarehouseThumb,
  prattTruss: PrattTrussThumb,
  frame2d: Frame2dThumb,
  floor: FloorThumb,
  wall: WallThumb,
  bridgeBeam: BridgeBeamThumb,
};

function BridgeBeamThumb(): JSX.Element {
  // Ponte trave isostatica vista laterale: impalcato + 2 appoggi triangolari +
  // travi visibili sotto + carico TS centrale (2 frecce verticali)
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      {/* Impalcato (rettangolo sottile orizzontale) */}
      <rect x="40" y="70" width="200" height="14" stroke={stroke} strokeWidth="2" fill="var(--ink-dim)" opacity="0.18" />
      {/* 5 travi sotto visibili */}
      <g stroke={stroke} strokeWidth="1.2">
        <line x1="40" y1="86" x2="240" y2="86" />
        <line x1="40" y1="90" x2="240" y2="90" />
        <line x1="40" y1="94" x2="240" y2="94" />
        <line x1="40" y1="98" x2="240" y2="98" />
      </g>
      {/* Appoggi: cerniera sx + carrello dx (triangoli) */}
      <polygon points="40,84 28,114 52,114" fill="none" stroke={stroke} strokeWidth="1.4" />
      <polygon points="240,84 228,114 252,114" fill="none" stroke={stroke} strokeWidth="1.4" />
      <circle cx="234" cy="118" r="2.5" fill="none" stroke="var(--ink-muted)" strokeWidth="1" />
      <circle cx="246" cy="118" r="2.5" fill="none" stroke="var(--ink-muted)" strokeWidth="1" />
      {/* Base/terreno */}
      <line x1="20" y1="118" x2="260" y2="118" stroke="var(--ink-dim)" strokeWidth="1" />
      <g stroke="var(--ink-dim)" strokeWidth="0.7">
        {[25, 50, 75, 100, 125, 150, 175, 200, 225, 250].map((x) => (
          <line key={x} x1={x} y1="118" x2={x - 4} y2="125" />
        ))}
      </g>
      {/* TS Tandem 2 assi al centro (frecce verticali) */}
      <g stroke={accent} strokeWidth="1.6">
        <line x1="130" y1="40" x2="130" y2="66" />
        <polygon points="130,66 126,60 134,60" fill={accent} />
        <line x1="150" y1="40" x2="150" y2="66" />
        <polygon points="150,66 146,60 154,60" fill={accent} />
      </g>
      <text x="140" y="32" fontFamily="monospace" fontSize="9" fill="var(--ink-dim)" textAnchor="middle">TS 2×300 kN</text>
    </svg>
  );
}

function WallThumb(): JSX.Element {
  // Muro sostegno CA visto in sezione: rettangolo verticale + suola tratteggiata
  // + spinta terreno triangolare frecce orizzontali decrescenti verso l'alto
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      {/* Muro rectangolare verticale (più scuro) */}
      <rect x="130" y="20" width="30" height="110" fill="var(--ink-dim)" opacity="0.18" stroke={stroke} strokeWidth="2" />
      {/* Suola/fondazione tratteggio */}
      <line x1="80" y1="130" x2="210" y2="130" stroke="var(--ink-dim)" strokeWidth="2" />
      <g stroke="var(--ink-dim)" strokeWidth="0.8">
        {[85, 100, 115, 130, 145, 160, 175, 190, 205].map((x) => (
          <line key={x} x1={x} y1="130" x2={x - 5} y2="140" />
        ))}
      </g>
      {/* Terreno trattenuto (zigzag a destra) */}
      <g stroke="var(--ink-dim)" strokeWidth="0.6">
        {[40, 55, 70, 85, 100, 115].map((y) => (
          <line key={y} x1="160" y1={y} x2="220" y2={y} opacity="0.4" />
        ))}
      </g>
      {/* Spinta terreno: frecce orizzontali triangolari (più lunghe verso il basso) */}
      <g stroke={accent} strokeWidth="1.4">
        <line x1="210" y1="40" x2="165" y2="40" />
        <polygon points="165,40 170,37 170,43" fill={accent} />
        <line x1="225" y1="65" x2="165" y2="65" />
        <polygon points="165,65 170,62 170,68" fill={accent} />
        <line x1="240" y1="90" x2="165" y2="90" />
        <polygon points="165,90 170,87 170,93" fill={accent} />
        <line x1="255" y1="115" x2="165" y2="115" />
        <polygon points="165,115 170,112 170,118" fill={accent} />
      </g>
    </svg>
  );
}

function FloorThumb(): JSX.Element {
  // Solaio CA visto dall'alto: rettangolo + griglia mesh + 1 trave longitudinale
  // accent + 2 nervature trasversali + 2 appoggi continui lati corti
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      {/* Perimetro solaio + griglia mesh */}
      <rect x="50" y="35" width="180" height="90" stroke={stroke} strokeWidth="2" fill="none" />
      <g stroke="var(--border-light)" strokeWidth="0.6">
        {[80, 110, 140, 170, 200].map((x) => (
          <line key={x} x1={x} y1="35" x2={x} y2="125" />
        ))}
        {[57.5, 80, 102.5].map((y) => (
          <line key={y} x1="50" y1={y} x2="230" y2={y} />
        ))}
      </g>
      {/* 1 trave principale longitudinale accent (al centro x) */}
      <line x1="140" y1="35" x2="140" y2="125" stroke={accent} strokeWidth="2.2" />
      {/* 2 nervature trasversali accent */}
      <line x1="50" y1="65" x2="230" y2="65" stroke={accent} strokeWidth="1.8" />
      <line x1="50" y1="95" x2="230" y2="95" stroke={accent} strokeWidth="1.8" />
      {/* Appoggi continui lati corti (hatch tratteggio) */}
      <g stroke="var(--ink-dim)" strokeWidth="1.5">
        <line x1="40" y1="35" x2="40" y2="125" />
        <line x1="240" y1="35" x2="240" y2="125" />
      </g>
      <g stroke="var(--ink-dim)" strokeWidth="0.8">
        {[40, 55, 70, 85, 100, 115].map((y) => (
          <line key={y} x1="40" y1={y} x2="33" y2={y + 6} />
        ))}
        {[40, 55, 70, 85, 100, 115].map((y) => (
          <line key={y} x1="240" y1={y} x2="247" y2={y + 6} />
        ))}
      </g>
    </svg>
  );
}

function Frame2dThumb(): JSX.Element {
  // Telaio CA 2D 5×3: griglia pilastri+travi + frecce pushover laterali
  return (
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      <g stroke={stroke} strokeWidth="2" fill="none">
        {/* 6 pilastri verticali */}
        <line x1="60" y1="30" x2="60" y2="130" />
        <line x1="92" y1="30" x2="92" y2="130" />
        <line x1="124" y1="30" x2="124" y2="130" />
        <line x1="156" y1="30" x2="156" y2="130" />
        <line x1="188" y1="30" x2="188" y2="130" />
        <line x1="220" y1="30" x2="220" y2="130" />
        {/* 3 travi orizzontali (piani fuori terra) */}
        <line x1="60" y1="55" x2="220" y2="55" />
        <line x1="60" y1="85" x2="220" y2="85" />
        <line x1="60" y1="115" x2="220" y2="115" />
      </g>
      {/* Base/fondazione */}
      <line x1="50" y1="130" x2="230" y2="130" stroke="var(--ink-dim)" strokeWidth="1.5" />
      <g stroke="var(--ink-dim)" strokeWidth="0.8">
        {[55, 75, 95, 115, 135, 155, 175, 195, 215, 225].map((x) => (
          <line key={x} x1={x} y1="130" x2={x - 4} y2="138" />
        ))}
      </g>
      {/* Frecce pushover laterali triangolari (10/20/30 kN crescenti verso il top) */}
      <g stroke={accent} strokeWidth="1.4">
        <line x1="32" y1="115" x2="56" y2="115" />
        <polygon points="56,115 50,111 50,119" fill={accent} />
        <line x1="24" y1="85" x2="56" y2="85" />
        <polygon points="56,85 50,81 50,89" fill={accent} />
        <line x1="16" y1="55" x2="56" y2="55" />
        <polygon points="56,55 50,51 50,59" fill={accent} />
      </g>
    </svg>
  );
}


// ── Helpers per i consumer ──────────────────────────────────────────────

/** Lookup veloce per backendId (es. "ex_simple_beam_2d" → TemplateEntry). */
export function findTemplateByBackendId(backendId: string): TemplateEntry | undefined {
  return TEMPLATES_CATALOG.find((t) => t.backendId === backendId);
}

/** Lista IDs backend disponibili (per cross-check con backend). */
export const TEMPLATE_BACKEND_IDS: readonly string[] = TEMPLATES_CATALOG.map((t) => t.backendId);
