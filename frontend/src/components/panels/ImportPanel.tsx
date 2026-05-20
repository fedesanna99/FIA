/**
 * ImportPanel — drag&drop di DXF e IFC con preview risultato.
 *
 * Backend: `POST /api/io/import/dxf` e `/api/io/import/ifc` (multipart).
 * Restituisce {model, warnings}; il modello sostituisce quello attivo.
 */
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileUp, FileBox } from "lucide-react";
import { importDxf, importIfc } from "../../api/io";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, Input } from "../ui/Input";
import { Badge } from "../ui/Badge";

export function ImportPanel() {
  const setModel = useModelStore((s) => s.setModel);
  const qc = useQueryClient();
  const dxfInput = useRef<HTMLInputElement>(null);
  const ifcInput = useRef<HTMLInputElement>(null);

  const [defaultMaterial, setDefaultMaterial] = useState("steel_s355");
  const [defaultSection, setDefaultSection] = useState("ipe_300");
  const [tol, setTol] = useState(1e-6);

  const dxfMut = useMutation({
    mutationFn: (file: File) => importDxf(file, {
      material_id: defaultMaterial,
      section_id: defaultSection,
      tol,
    }),
    onSuccess: (r) => {
      setModel(r.model);
      qc.invalidateQueries({ queryKey: ["models"] });
      toast("success", `DXF importato: ${r.model.nodes.length} nodi, ${r.model.elements.length} elementi`);
      if (r.warnings.length > 0) {
        toast("warning", `${r.warnings.length} warning durante l'import`);
      }
    },
    onError: (e) => toast("error", `Errore DXF: ${(e as Error).message}`),
  });

  const ifcMut = useMutation({
    mutationFn: (file: File) => importIfc(file),
    onSuccess: (r) => {
      setModel(r.model);
      qc.invalidateQueries({ queryKey: ["models"] });
      toast("success", `IFC importato: ${r.model.nodes.length} nodi, ${r.model.elements.length} elementi`);
    },
    onError: (e) => toast("error", `Errore IFC: ${(e as Error).message}`),
  });

  const isPending = dxfMut.isPending || ifcMut.isPending;

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Default DXF"
        description="Materiale e sezione assegnati a tutti gli elementi LINE/POLYLINE importati. Vedi BL-8 per layer mapping."
      >
        <div className="grid grid-cols-3 gap-2">
          <Field label="Materiale">
            <Input value={defaultMaterial} onChange={(e) => setDefaultMaterial(e.target.value)} />
          </Field>
          <Field label="Sezione">
            <Input value={defaultSection} onChange={(e) => setDefaultSection(e.target.value)} />
          </Field>
          <Field label="Tol dedupe [m]" hint="merge nodi coincidenti">
            <Input type="number" step={1e-7} value={tol} onChange={(e) => setTol(Number(e.target.value))} />
          </Field>
        </div>
      </Card>

      <Card title="Import DXF"
            description="LINE/POLYLINE → BEAM2D o BEAM3D. Layer ignorato (carry-over BL-8).">
        <DropZone
          accept=".dxf"
          inputRef={dxfInput}
          disabled={isPending}
          onFile={(f) => dxfMut.mutate(f)}
          icon={<FileUp className="h-6 w-6" />}
          label="Trascina .dxf o clicca per scegliere"
        />
      </Card>

      <Card title="Import IFC4"
            description="IfcBeam, IfcColumn, IfcMember → BEAM3D. Gerarchia Project/Site/Building/Storey.">
        <DropZone
          accept=".ifc"
          inputRef={ifcInput}
          disabled={isPending}
          onFile={(f) => ifcMut.mutate(f)}
          icon={<FileBox className="h-6 w-6" />}
          label="Trascina .ifc o clicca per scegliere"
        />
      </Card>

      {isPending && (
        <div className="text-xs text-ink-dim flex items-center gap-2">
          <Upload className="h-3.5 w-3.5 animate-pulse" />
          Importazione in corso…
        </div>
      )}
    </div>
  );
}

function DropZone({ accept, inputRef, disabled, onFile, icon, label }: {
  accept: string;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  disabled: boolean;
  onFile: (f: File) => void;
  icon: React.ReactNode;
  label: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      className={`flex flex-col items-center gap-2 p-6 rounded border-2 border-dashed transition-colors cursor-pointer
        ${dragOver ? "border-accent bg-accent/5" : "border-border bg-bg/40"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-accent/60"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <div className="text-ink-muted">{icon}</div>
      <div className="text-xs text-ink-dim text-center">{label}</div>
      <Badge size="sm" variant="muted">{accept}</Badge>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = ""; // reset per consentire re-upload stesso file
        }}
      />
    </div>
  );
}
