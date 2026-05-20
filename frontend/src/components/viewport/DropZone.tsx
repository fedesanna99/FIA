import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";
import type { FEAModel } from "../../types/model";

interface Props {
  onImported?: (id: string) => void;
}

export function DropZone({ onImported }: Props) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setModel = useModelStore((s) => s.setModel);
  const qc = useQueryClient();

  const importMut = useMutation({
    mutationFn: (payload: FEAModel) => modelsApi.importJson(payload),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["models"] });
      setModel(m);
      onImported?.(m.id);
      setError(null);
      toast("success", `Modello "${m.name}" importato (${m.nodes.length} nodi, ${m.elements.length} elementi)`);
    },
    onError: (e: any) => setError(e?.message ?? "Errore import"),
  });

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        setOver(true);
      }
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
      }
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget == null) setOver(false);
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as FEAModel;
        if (!data.nodes || !data.elements) {
          setError("JSON non riconosciuto: mancano nodes/elements.");
          return;
        }
        importMut.mutate(data);
      } catch (err: any) {
        setError(`Errore lettura: ${err?.message ?? err}`);
      }
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [importMut]);

  return (
    <>
      {over && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-accent-primary/10 border-2 border-dashed border-accent-primary pointer-events-none">
          <div className="text-accent-primary text-base font-semibold bg-bg-panel/90 px-4 py-2 rounded">
            ⬇ Rilascia il file JSON del modello FEA
          </div>
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-accent-danger/20 border border-accent-danger text-accent-danger text-xs px-3 py-1.5 rounded z-40 cursor-pointer"
             onClick={() => setError(null)}>
          {error} <span className="text-ink-dim">(click per chiudere)</span>
        </div>
      )}
    </>
  );
}
