/**
 * IsosurfaceLegend — legenda colormap per iso-superfici 3D (BL-7).
 *
 * Mostra il colormap jet con min/max dei livelli attualmente visualizzati;
 * format compatto in notazione scientifica (i valori del campo possono essere
 * stress, deformazioni, temperature ecc., quindi formattazione neutra).
 */
import { useResultsStore } from "../../store/resultsStore";
import { ColorLegend } from "./ColorLegend";

export function IsosurfaceLegend() {
  const data = useResultsStore((s) => s.isosurfaceData);
  const show = useResultsStore((s) => s.showIsosurfaces);
  if (!show || !data || data.levels.length === 0) return null;
  const min = Math.min(...data.levels);
  const max = Math.max(...data.levels);
  return (
    <ColorLegend
      min={min}
      max={max}
      title="Iso 3D"
      format={(v) => v.toExponential(2)}
      position="top-right-2"
    />
  );
}
