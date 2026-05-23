import { jetHex } from "../../utils/colormap";
import { fmtStress } from "../../utils/units";

interface Props {
  min: number;
  max: number;
  unit?: string;
  title?: string;
  /** Formatter custom dei valori (default: fmtStress). */
  format?: (v: number) => string;
  /** Posizione (default top-right). Per più legende affiancate. */
  position?: "top-right" | "top-right-2" | "bottom-right";
}

export function ColorLegend({
  min, max, title = "Valore", format = fmtStress, position = "top-right",
}: Props) {
  const stops = 12;
  const posClass =
    position === "top-right-2" ? "absolute top-4 right-32" :
    position === "bottom-right" ? "absolute bottom-12 right-4" :
    "absolute top-4 right-4";
  return (
    <div className={`${posClass} bg-bg-panel/95 border border-border rounded p-2 text-xs backdrop-blur`}>
      <div className="text-ink-3 uppercase tracking-wider text-[10px] mb-1">{title}</div>
      <div className="flex items-stretch gap-2">
        <div className="flex flex-col" style={{ height: 200 }}>
          {Array.from({ length: stops }).map((_, i) => (
            <div
              key={i}
              className="flex-1 w-4"
              style={{ background: jetHex(1 - i / (stops - 1)) }}
            />
          ))}
        </div>
        <div className="flex flex-col justify-between text-[10px] numeric text-ink py-0.5">
          <span>{format(max)}</span>
          <span className="text-ink-3">{format((min + max) / 2)}</span>
          <span>{format(min)}</span>
        </div>
      </div>
    </div>
  );
}
