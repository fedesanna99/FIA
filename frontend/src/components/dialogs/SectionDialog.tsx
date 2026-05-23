/**
 * SectionDialog (Precision v2.0 PR17 T7) — crea sezione custom Precision-aligned.
 *
 * 4 kind (Rect / Circ piena / Circ cava / Custom A,I,J). Calcola A/Iy/Iz/J/W
 * automaticamente dalle dimensioni e mostra preview in cm² / cm⁴.
 */
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

const KIND_LABELS: Record<Kind, string> = {
  rect: "Rettangolare",
  circ: "Circolare piena",
  circ_hollow: "Circolare cava",
  custom: "Custom · A, I, J",
};

const fieldLabel = "block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5";
const inputCls = "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors";
const numInputCls = `${inputCls} font-mono tabular-nums`;

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
    <Dialog
      open={open}
      onClose={onClose}
      title="Crea sezione personalizzata"
      width={540}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {mut.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {mut.isPending ? "Salvo…" : "Salva in libreria"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Kind segmented control */}
        <div>
          <div className={fieldLabel}>Tipo sezione</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-border bg-bg-panel p-0.5">
            {(["rect", "circ", "circ_hollow", "custom"] as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={[
                  "px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                  kind === k
                    ? "bg-accent text-white"
                    : "text-ink-3 hover:text-ink hover:bg-bg-hover",
                ].join(" ")}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={fieldLabel}>ID</span>
            <input className={numInputCls} value={id} onChange={(e) => setId(e.target.value)} />
          </label>
          <label className="block">
            <span className={fieldLabel}>Nome</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>

        {kind === "rect" && (
          <div className="grid grid-cols-2 gap-3">
            <PNumField label="b" unit="[m]" value={b} onChange={setB} step={0.01} />
            <PNumField label="h" unit="[m]" value={h} onChange={setH} step={0.01} />
          </div>
        )}
        {kind === "circ" && (
          <PNumField label="D" unit="[m] · diametro" value={D} onChange={setD} step={0.01} />
        )}
        {kind === "circ_hollow" && (
          <div className="grid grid-cols-2 gap-3">
            <PNumField label="D esterno" unit="[m]" value={D} onChange={setD} step={0.01} />
            <PNumField label="t spessore" unit="[m]" value={t} onChange={setT} step={0.001} />
          </div>
        )}
        {kind === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <PNumField label="A" unit="[m²]" value={Acustom} onChange={setAcustom} step={1e-4} />
            <PNumField label="Iy" unit="[m⁴]" value={Iy} onChange={setIy} step={1e-7} />
            <PNumField label="Iz" unit="[m⁴]" value={Iz} onChange={setIz} step={1e-7} />
            <PNumField label="J" unit="[m⁴]" value={J} onChange={setJ} step={1e-7} />
            <PNumField label="spessore" unit="[m]" value={thickness} onChange={setThickness} step={0.001} />
          </div>
        )}

        {computed && (
          <div className="border-t border-border pt-3">
            <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
              Anteprima calcolata
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[12px]">
              <ResultCell k="A" v={`${(computed.A * 1e4).toFixed(3)}`} u="cm²" />
              <ResultCell k="Iy" v={`${(computed.Iy * 1e8).toFixed(2)}`} u="cm⁴" />
              <ResultCell k="Iz" v={`${(computed.Iz * 1e8).toFixed(2)}`} u="cm⁴" />
              <ResultCell k="J" v={`${(computed.J * 1e8).toFixed(2)}`} u="cm⁴" />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function PNumField({ label, unit, value, onChange, step }: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className={fieldLabel}>
        {label}
        {unit && <span className="text-ink-4 normal-case tracking-normal ml-1">{unit}</span>}
      </span>
      <input
        type="number"
        step={step ?? 1}
        className={numInputCls}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ResultCell({ k, v, u }: { k: string; v: string; u: string }) {
  return (
    <div className="flex justify-between bg-bg-panel border border-border px-2.5 py-1.5">
      <span className="text-ink-3">{k}</span>
      <span className="text-ink font-semibold">{v}<span className="text-ink-3 ml-1">{u}</span></span>
    </div>
  );
}
