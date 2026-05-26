/**
 * RecentModelCard (v2.6.5 D.2) — card singola della sezione "Modelli recenti"
 * della home dashboard (mockup FEA_Pro · Dashboard A1).
 *
 * Composizione (top→bottom):
 *   - Thumbnail SVG placeholder grid-based (aspect 16/9)
 *   - Header: nome modello + status badge (RUN/OK/ERR/—)
 *   - Metadata: counts (nodi/elementi) + tipo (2D/3D) — mono
 *
 * NB: thumbnail vero rendering della geometria è carry-over v2.7+ (richiede
 * backend SVG generator o frontend canvas snapshot). Per ora placeholder
 * deterministico con bounding rect basato sul kind (2D/3D).
 *
 * Click → dispatch `feapro:select-model` (consumer in App.tsx setta activeId).
 */
import type { RecentModel } from "../../lib/recentModels";

interface Props {
  model: RecentModel;
  onClick: () => void;
}

export function RecentModelCard({ model, onClick }: Props) {
  const statusBadge = renderStatusBadge(model.status);
  const metadata = formatMetadata(model);

  return (
    <button
      type="button"
      className="recent-model-card"
      onClick={onClick}
      data-testid={`recent-model-${model.id}`}
      aria-label={`Apri modello ${model.name}`}
    >
      <div className="recent-model-card__thumbnail">
        <ModelThumbnailSvg is3d={model.is3d} elementCount={model.elementCount} />
      </div>
      <div className="recent-model-card__info">
        <div className="recent-model-card__header">
          <span className="recent-model-card__name" title={model.name}>
            {model.name}
          </span>
          {statusBadge}
        </div>
        <div className="recent-model-card__meta">{metadata}</div>
      </div>
    </button>
  );
}

function renderStatusBadge(status: RecentModel["status"]) {
  if (status === "draft") {
    return <span className="badge badge--draft" data-testid="badge-draft">DRAFT</span>;
  }
  return <span className="badge badge--ok" data-testid="badge-ok">OK</span>;
}

function formatMetadata(model: RecentModel): string {
  const kind = model.is3d ? "3D" : "2D";
  const parts: string[] = [
    `${kind}`,
    `${model.nodeCount} N`,
    `${model.elementCount} E`,
  ];
  if (model.constraintCount > 0) parts.push(`${model.constraintCount} V`);
  if (model.loadCount > 0) parts.push(`${model.loadCount} L`);
  return parts.join(" · ");
}

/**
 * Placeholder thumbnail: grid pattern + bounding rect. Variabile per kind
 * (2D = rect orizzontale, 3D = trapezoide prospettico) per dare hint visivo.
 * Carry-over v2.7+: rendering reale dalla geometria del modello.
 */
function ModelThumbnailSvg({ is3d, elementCount }: { is3d: boolean; elementCount: number }) {
  // Più elementi → bounding più "denso" (semplice scale visivo, non geometria
  // reale). Saturato a max 8 segmenti diagonali per non sovraffollare.
  const segCount = Math.min(Math.max(2, Math.floor(elementCount / 5)), 8);

  return (
    <svg
      viewBox="0 0 100 56"
      className="model-thumb-svg"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <pattern id="grid-thumb" width="8" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M 8 0 L 0 0 0 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.3"
            opacity="0.2"
          />
        </pattern>
      </defs>
      <rect width="100" height="56" fill="url(#grid-thumb)" className="model-thumb-bg" />
      {is3d ? (
        // 3D: trapezoide prospettico isometrico
        <g stroke="currentColor" strokeWidth="0.8" fill="none" className="model-thumb-stroke">
          <path d="M 20 38 L 35 18 L 80 18 L 65 38 Z" />
          <path d="M 35 18 L 35 8 L 80 8 L 80 18" />
          <path d="M 65 38 L 65 28 L 80 28 L 80 18" />
          {/* Inner subdivisions */}
          {Array.from({ length: segCount }).map((_, i) => {
            const t = (i + 1) / (segCount + 1);
            const xTop = 35 + (80 - 35) * t;
            const xBot = 20 + (65 - 20) * t;
            return <path key={i} d={`M ${xBot} 38 L ${xTop} 18`} strokeWidth="0.5" />;
          })}
        </g>
      ) : (
        // 2D: portale + traverso (rect verticale tipo telaio)
        <g stroke="currentColor" strokeWidth="0.8" fill="none" className="model-thumb-stroke">
          <path d="M 25 46 L 25 14 L 75 14 L 75 46" />
          <path d="M 20 46 L 80 46" />
          {/* Inner subdivisions diagonali (load/vincoli hint) */}
          {Array.from({ length: segCount }).map((_, i) => {
            const t = (i + 1) / (segCount + 1);
            const x = 25 + (75 - 25) * t;
            return <path key={i} d={`M ${x} 14 L ${x} 12`} strokeWidth="0.5" />;
          })}
        </g>
      )}
    </svg>
  );
}
