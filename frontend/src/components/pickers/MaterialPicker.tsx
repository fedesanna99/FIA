/**
 * MaterialPicker (v1.6 Sprint 0 · B13) — wrapper di LibraryPicker per la
 * libreria materiali del backend (/api/materials). Categorizza per
 * famiglia: acciai S235/S275/S355/S460, calcestruzzo C25/C30/..., legno
 * C24/GL24/..., alluminio 6061/7075, ecc.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { materialsApi } from "../../api/client";
import type { Material } from "../../types/material";
import { CustomMaterialDialog } from "../dialogs/CustomMaterialDialog";
import { LibraryPicker, type LibraryItem } from "./LibraryPicker";


/** Mapping prefisso id → famiglia + label umano. */
const MATERIAL_FAMILY: Array<{ prefix: string; key: string; label: string }> = [
  { prefix: "steel_",    key: "steel",    label: "Acciai" },
  { prefix: "concrete_", key: "concrete", label: "Calcestruzzo" },
  { prefix: "wood_",     key: "wood",     label: "Legno" },
  { prefix: "aluminum_", key: "aluminum", label: "Alluminio" },
  { prefix: "alu_",      key: "aluminum", label: "Alluminio" }, // alias
  { prefix: "cable_",    key: "cable",    label: "Cavi" },
  { prefix: "composite_", key: "composite", label: "Compositi" },
  { prefix: "fiber_",    key: "composite", label: "Compositi" },
];


function materialToLibraryItem(m: Material): LibraryItem {
  const matched = MATERIAL_FAMILY.find((f) => m.id.startsWith(f.prefix));
  const family = matched?.key ?? "custom";
  const familyLabel = matched?.label ?? "Custom";

  // Meta: E in GPa (conversione da Pa ×1e-9), poi fy o fck se presenti.
  const E_GPa = (m.E * 1e-9).toFixed(0);
  const parts: string[] = [`E=${E_GPa} GPa`];
  if (m.fy) parts.push(`fy=${(m.fy * 1e-6).toFixed(0)} MPa`);
  if (m.fck) parts.push(`fck=${(m.fck * 1e-6).toFixed(0)} MPa`);
  parts.push(`ρ=${m.rho.toFixed(0)} kg/m³`);
  const metaLine = parts.join(" · ");

  return {
    id: m.id,
    name: m.name,
    family,
    familyLabel,
    metaLine,
    aliases: [m.id, familyLabel.toLowerCase()],
  };
}


interface Props {
  open: boolean;
  onClose: () => void;
  value?: string | null;
  onChange: (materialId: string) => void;
}


export function MaterialPicker({ open, onClose, value, onChange }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const { data: materials } = useQuery({
    queryKey: ["materials"],
    queryFn: () => materialsApi.list(),
    staleTime: Infinity,
  });

  const items = useMemo(
    () => (materials ?? []).map(materialToLibraryItem),
    [materials],
  );

  return (
    <>
      <LibraryPicker
        open={open}
        onClose={onClose}
        items={items}
        value={value}
        onChange={onChange}
        title="Scegli materiale"
        searchPlaceholder="Cerca: S355, C30/37, lamellare, alluminio..."
        emptyMessage="Nessun materiale trovato. Prova S235 / C25 / Legno / Acciaio."
        testId="material-picker"
        // v2.2.0 audit-fix B4: "+ Crea custom" apre l'editor dedicato.
        onCreateCustom={() => setEditorOpen(true)}
      />
      <CustomMaterialDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onCreated={(matId) => {
          // Auto-select + chiudi il picker per UX fluida.
          onChange(matId);
          onClose();
        }}
      />
    </>
  );
}
