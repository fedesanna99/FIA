import { jetHex } from "../../utils/colormap";
import { fmtStress } from "../../utils/units";

interface Props {
  min: number;
  max: number;
  unit?: string;
  title?: string;
}

export function ColorLegend({ min, max, title = "Valore" }: Props) {
  const stops = 12;
  return (
    <div className="absolute top-4 right-4 bg-bg-panel/95 border border-border rounded p-2 text-xs backdrop-blur">
      <div className="text-ink-muted uppercase tracking-wider text-[10px] mb-1">{title}</div>
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
          <span>{fmtStress(max)}</span>
          <span className="text-ink-dim">{fmtStress((min + max) / 2)}</span>
          <span>{fmtStress(min)}</span>
        </div>
      </div>
    </div>
  );
}
