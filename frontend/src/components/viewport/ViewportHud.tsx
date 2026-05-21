/**
 * ViewportHud — chip informativi top-left del viewport (mockup v1.3).
 *
 * Tre pillole sovrapposte al Canvas:
 *  - [📦 cubo]   nome modello
 *  - [📚 layers] N nodi · E elementi · materiale
 *  - [● ping]    Auto-save (puntino verde animato)
 *
 * `materials` non è ancora nello schema FEAModel ufficiale: accesso
 * difensivo + fallback "—".
 */
import type { ReactNode } from "react";
import { Box, Layers } from "lucide-react";
import { useModelStore } from "../../store/modelStore";

export function ViewportHud() {
  const model = useModelStore((s) => s.model);
  if (!model) return null;

  const nNodes = model.nodes?.length ?? 0;
  const nElems = model.elements?.length ?? 0;
  // materials non è ancora nel tipo FEAModel: read difensivo
  const materials = (model as unknown as { materials?: { name?: string }[] }).materials;
  const material = materials?.[0]?.name ?? "—";

  return (
    <div className="absolute top-3.5 left-3.5 z-10 flex gap-2 pointer-events-none">
      <Chip icon={<Box className="w-3 h-3" />}>{model.name}</Chip>
      <Chip icon={<Layers className="w-3 h-3" />}>
        {nNodes} nodi · {nElems} elem · {material}
      </Chip>
      {/* alpha.31 Task 20: "Auto-save" chip rimosso — ridondante con il
          chip "✓ Salvato HH:MM" in topbar. */}
    </div>
  );
}

function Chip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-bg-panel border border-border rounded-md px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] text-ink-muted shadow-pop font-mono">
      {icon}
      {children}
    </div>
  );
}
