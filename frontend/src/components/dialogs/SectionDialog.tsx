import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { materialsApi } from "../../api/client";
import type { Section } from "../../types/material";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Kind = "rect" | "circ" | "circ_hollow" | "custom";

export function SectionDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("rect");
  const [id, setId] = useState("custom_1");
  const [name, setName] = useState("Sezione personalizzata 1");

  const [b, setB] = useState(0.3);
  const [h, setH] = useState(0.5);
  const [D, setD] = useState(0.2);
  const [t, setT] = useState(0.01);

  const [Acustom, setAcustom] = useState(1e-3);
  const [Iy, setIy] = useState(1e-6);
  const [Iz, setIz] = useState(1e-6);
  const [J, setJ] = useState(1e-6);
  const [thickness, setThickness] = useState(0.1);

  const computed: Section | null = useMemo(() => {
    if (kind === "rect") {
      const A = b * h;
      const Iy_ = b * h ** 3 / 12;
      const Iz_ = h * b ** 3 / 12;
      const a = Math.max(b, h), c = Math.min(b, h);
      const Jv = a * c ** 3 * (1 / 3 - 0.21 * (c / a) * (1 - (c ** 4) / (12 * a ** 4)));
      return {
        id, name, type: "rectangular",
        A, Iy: Iy_, Iz: Iz_, J: Jv,
        Wply: b * h ** 2 / 4, Wplz: h * b ** 2 / 4,
        b, h,
      };
    }
    if (kind === "circ") {
      const A = Math.PI * D * D / 4;
      const I = Math.PI * D ** 4 / 64;
      const Jc = Math.PI * D ** 4 / 32;
      return {
        id, name, type: "circular",
        A, Iy: I, Iz: I, J: Jc,
        Wply: D ** 3 / 6, Wplz: D ** 3 / 6, b: D, h: D,
      };
    }
    if (kind === "circ_hollow") {
      const Do = D, Di = Math.max(0, D - 2 * t);
      const A = Math.PI / 4 * (Do ** 2 - Di ** 2);
      const I = Math.PI / 64 * (Do ** 4 - Di ** 4);
      const Jc = Math.PI / 32 * (Do ** 4 - Di ** 4);
      return {
        id, name, type: "circular_hollow",
        A, Iy: I, Iz: I, J: Jc,
        Wply: I / (Do / 2), Wplz: I / (Do / 2), b: D, h: D, t,
      };
    }
    return {
      id, name, type: "custom",
      A: Acustom, Iy, Iz, J,
      Wply: 0, Wplz: 0,
      thickness,
    };
  }, [kind, id, name, b, h, D, t, Acustom, Iy, Iz, J, thickness]);

  const mut = useMutation({
    mutationFn: () => materialsApi.addSection(computed!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections"] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} title="Crea sezione personalizzata" width={520}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Salvo..." : "Salva in libreria"}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div className="flex gap-1 flex-wrap">
          {(["rect", "circ", "circ_hollow", "custom"] as Kind[]).map((k) => (
            <button key={k}
              className={`btn flex-1 ${kind === k ? "btn-primary" : ""}`}
              onClick={() => setKind(k)}
            >
              {k === "rect" ? "Rettangolare"
               : k === "circ" ? "Circolare piena"
               : k === "circ_hollow" ? "Circolare cava"
               : "Custom A, I, J"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label block mb-1">ID</label>
            <input className="input numeric" value={id} onChange={(e) => setId(e.target.value)} /></div>
          <div><label className="label block mb-1">Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        </div>

        {kind === "rect" && (
          <div className="grid grid-cols-2 gap-2">
            <NumField label="b [m]" value={b} onChange={setB} step={0.01} />
            <NumField label="h [m]" value={h} onChange={setH} step={0.01} />
          </div>
        )}
        {kind === "circ" && <NumField label="D [m]" value={D} onChange={setD} step={0.01} />}
        {kind === "circ_hollow" && (
          <div className="grid grid-cols-2 gap-2">
            <NumField label="D esterno [m]" value={D} onChange={setD} step={0.01} />
            <NumField label="t spessore [m]" value={t} onChange={setT} step={0.001} />
          </div>
        )}
        {kind === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <NumField label="A [m²]" value={Acustom} onChange={setAcustom} step={1e-4} />
            <NumField label="Iy [m⁴]" value={Iy} onChange={setIy} step={1e-7} />
            <NumField label="Iz [m⁴]" value={Iz} onChange={setIz} step={1e-7} />
            <NumField label="J [m⁴]" value={J} onChange={setJ} step={1e-7} />
            <NumField label="spessore [m]" value={thickness} onChange={setThickness} step={0.001} />
          </div>
        )}

        {computed && (
          <div className="border-t border-border pt-2">
            <div className="text-[10px] uppercase text-ink-muted mb-1">Anteprima calcolata</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 numeric text-[11px] text-ink-muted">
              <Row k="A" v={`${(computed.A * 1e4).toFixed(3)} cm²`} />
              <Row k="Iy" v={`${(computed.Iy * 1e8).toFixed(2)} cm⁴`} />
              <Row k="Iz" v={`${(computed.Iz * 1e8).toFixed(2)} cm⁴`} />
              <Row k="J" v={`${(computed.J * 1e8).toFixed(2)} cm⁴`} />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function NumField({ label, value, onChange, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <div>
      <label className="label block mb-1">{label}</label>
      <input type="number" step={step} className="input numeric"
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span>{k}</span><span className="text-ink">{v}</span></div>;
}
