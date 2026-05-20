import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "../../api/client";
import { fmtStress } from "../../utils/units";
import { SectionDialog } from "../dialogs/SectionDialog";
import { MaterialDialog } from "../dialogs/MaterialDialog";

export function MaterialsLibrary() {
  const [tab, setTab] = useState<"materials" | "sections">("materials");
  const [secDialog, setSecDialog] = useState(false);
  const [matDialog, setMatDialog] = useState(false);
  const { data: materials } = useQuery({ queryKey: ["materials"], queryFn: materialsApi.list });
  const { data: sections } = useQuery({ queryKey: ["sections"], queryFn: materialsApi.listSections });
  const qc = useQueryClient();
  const delSection = useMutation({
    mutationFn: (id: string) => materialsApi.deleteSection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections"] }),
  });

  return (
    <div className="text-xs">
      <div className="flex border-b border-border bg-bg">
        <button
          className={`flex-1 px-2 py-1.5 ${tab === "materials"
            ? "text-accent-primary bg-bg-panel border-b-2 border-accent-primary"
            : "text-ink-muted hover:text-ink"}`}
          onClick={() => setTab("materials")}
        >Materiali</button>
        <button
          className={`flex-1 px-2 py-1.5 ${tab === "sections"
            ? "text-accent-primary bg-bg-panel border-b-2 border-accent-primary"
            : "text-ink-muted hover:text-ink"}`}
          onClick={() => setTab("sections")}
        >Sezioni</button>
      </div>

      {tab === "materials" && (
        <>
          <div className="p-2 border-b border-border">
            <button className="btn btn-primary w-full text-[11px]" onClick={() => setMatDialog(true)}>
              + Nuovo materiale personalizzato
            </button>
          </div>
          <MaterialDialog open={matDialog} onClose={() => setMatDialog(false)} />
        </>
      )}

      {tab === "materials" && (
        <div className="divide-y divide-border">
          {materials?.map((m) => (
            <div key={m.id} className="p-3 hover:bg-bg-hover">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded" style={{ background: m.color }} />
                <span className="font-semibold text-ink">{m.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 numeric text-[11px] text-ink-muted">
                <Row k="E" v={fmtStress(m.E)} />
                <Row k="ν" v={m.nu.toFixed(2)} />
                <Row k="ρ" v={`${m.rho} kg/m³`} />
                {m.fy && <Row k="fy" v={fmtStress(m.fy)} />}
                {m.fck && <Row k="fck" v={fmtStress(m.fck)} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "sections" && (
        <>
          <div className="p-2 border-b border-border">
            <button className="btn btn-primary w-full text-[11px]" onClick={() => setSecDialog(true)}>
              + Nuova sezione personalizzata
            </button>
          </div>
          <SectionDialog open={secDialog} onClose={() => setSecDialog(false)} />
        </>
      )}

      {tab === "sections" && (
        <div className="divide-y divide-border">
          {sections?.map((s) => (
            <div key={s.id} className="group p-3 hover:bg-bg-hover relative">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ink">{s.name}</span>
                {s.id.startsWith("custom_") && (
                  <button
                    className="opacity-0 group-hover:opacity-100 text-accent-danger hover:bg-accent-danger/20 px-1.5 rounded"
                    onClick={() => delSection.mutate(s.id)}
                  >×</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 numeric text-[11px] text-ink-muted">
                <Row k="A" v={`${(s.A * 1e4).toFixed(2)} cm²`} />
                <Row k="Iy" v={`${(s.Iy * 1e8).toFixed(0)} cm⁴`} />
                <Row k="Iz" v={`${(s.Iz * 1e8).toFixed(0)} cm⁴`} />
                <Row k="J" v={`${(s.J * 1e8).toFixed(2)} cm⁴`} />
                {s.thickness && <Row k="t" v={`${(s.thickness * 1000).toFixed(0)} mm`} />}
                {s.h && <Row k="h" v={`${(s.h * 1000).toFixed(0)} mm`} />}
                {s.b && <Row k="b" v={`${(s.b * 1000).toFixed(0)} mm`} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="text-ink">{v}</span>
    </div>
  );
}
