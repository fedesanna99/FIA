/**
 * SectionPicker (v1.6 Sprint 0 · B13) — wrapper di LibraryPicker per la
 * libreria sezioni del backend (/api/sections). Aggiunge mapping famiglia
 * + meta-line formattata in cm²/cm⁴.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { materialsApi } from "../../api/client";
import type { Section } from "../../types/material";
import { LibraryPicker, type LibraryItem } from "./LibraryPicker";


/** Mapping prefisso id → famiglia + label umano. */
const SECTION_FAMILY: Array<{ prefix: string; key: string; label: string }> = [
  { prefix: "ipe_",    key: "ipe",    label: "IPE" },
  { prefix: "hea_",    key: "hea",    label: "HEA" },
  { prefix: "heb_",    key: "heb",    label: "HEB" },
  { prefix: "hem_",    key: "hem",    label: "HEM" },
  { prefix: "upn_",    key: "upn",    label: "UPN" },
  { prefix: "rect_",   key: "rect",   label: "Rettangolari" },
  { prefix: "circ_",   key: "circ",   label: "Circolari" },
  { prefix: "shs_",    key: "shs",    label: "SHS scatolari" },
  { prefix: "rhs_",    key: "rhs",    label: "RHS rettangolari" },
  { prefix: "chs_",    key: "chs",    label: "CHS tubolari" },
  { prefix: "shell_",  key: "shell",  label: "Shell" },
  { prefix: "cable_",  key: "cable",  label: "Cavi" },
  { prefix: "laminate_", key: "laminate", label: "Laminati" },
  { prefix: "rc_",     key: "rc",     label: "RC (Cls)" },
  { prefix: "wood_",   key: "wood",   label: "Legno" },
];


function sectionToLibraryItem(s: Section): LibraryItem {
  const matched = SECTION_FAMILY.find((f) => s.id.startsWith(f.prefix));
  const family = matched?.key ?? "custom";
  const familyLabel = matched?.label ?? "Custom";

  // Meta: area in cm², Iy in cm⁴ (conversione da SI: m² → cm² ×1e4, m⁴ → cm⁴ ×1e8)
  const A_cm2 = (s.A * 1e4).toFixed(2);
  const Iy_cm4 = (s.Iy * 1e8).toFixed(0);
  const metaLine = `A=${A_cm2} cm² · Iy=${Iy_cm4} cm⁴`;

  // Badge: dimensioni nominali in mm (h×b o diametro)
  let badge: string | undefined;
  if (s.h && s.b) {
    badge = `${(s.h * 1000).toFixed(0)}×${(s.b * 1000).toFixed(0)} mm`;
  } else if (s.h) {
    badge = `Ø${(s.h * 1000).toFixed(0)} mm`;
  }

  return {
    id: s.id,
    name: s.name,
    family,
    familyLabel,
    metaLine,
    badge,
    aliases: [s.id, s.type, familyLabel.toLowerCase()],
  };
}


interface Props {
  open: boolean;
  onClose: () => void;
  value?: string | null;
  onChange: (sectionId: string) => void;
}


export function SectionPicker({ open, onClose, value, onChange }: Props) {
  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: () => materialsApi.listSections(),
    staleTime: Infinity, // libreria stabile, no refetch
  });

  const items = useMemo(
    () => (sections ?? []).map(sectionToLibraryItem),
    [sections],
  );

  return (
    <LibraryPicker
      open={open}
      onClose={onClose}
      items={items}
      value={value}
      onChange={onChange}
      title="Scegli sezione"
      searchPlaceholder="Cerca: ipe 300, heb 240, Ø100, scatolare..."
      emptyMessage="Nessuna sezione trovata. Prova IPE / HEB / RHS / Tondo."
      testId="section-picker"
    />
  );
}
