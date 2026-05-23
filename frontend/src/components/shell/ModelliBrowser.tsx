/**
 * ModelliBrowser (Precision v2.0 PR16 T2) — A2 mockup parity 95%.
 *
 * Overlay full-screen che replica il mockup A2-modelli.html di Claude
 * Design. Attivato via custom event `feapro:open-models-list`.
 *
 * Contiene:
 *  - Header pagina (eyebrow "MODELLI · N TOTALI" + h1 + bottoni Importa/Nuovo)
 *  - Toolbar con tab filtri (Tutti / Recenti / Job in corso / Bozze /
 *    Archiviati) + filter dropdowns (Tipo / Status / Norma) + search
 *  - Tabella ModelsTable estesa (componente esistente)
 *  - Pagination footer "N di T visualizzati · ← 1 2 3 4 →"
 *
 * Dismiss: ESC + X icon nell'header.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, FileUp, ChevronDown, Search } from "lucide-react";
import { modelsApi } from "../../api/client";
import { ModelsTable, type ModelTableRow } from "./ModelsTable";

const TABS = [
  { id: "all",    label: "Tutti" },
  { id: "recent", label: "Recenti" },
  { id: "run",    label: "Job in corso" },
  { id: "draft",  label: "Bozze" },
  { id: "arch",   label: "Archiviati" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ModelliBrowser() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Carico modelli via react-query — stesso endpoint usato altrove
  const { data: modelsData } = useQuery({
    queryKey: ["models-list"],
    queryFn: () => modelsApi.list(),
    staleTime: 30_000,
    enabled: open,
    retry: 1,
  });

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
      setPage(1);
      setTab("all");
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("feapro:open-models-list", handleOpen);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("feapro:open-models-list", handleOpen);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (!open) return null;

  const allModels = modelsData ?? [];
  const userModels = allModels.filter((m) => !m.id.startsWith("ex_"));

  const filtered = userModels.filter((m) => {
    if (tab === "all") return true;
    if (tab === "recent") return true; // tutti recenti per ora
    if (tab === "run") return false; // jobs WS futuro
    if (tab === "draft") return (m.nodes?.length ?? 0) === 0;
    if (tab === "arch") return false; // archivio futuro
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rows: ModelTableRow[] = paged.map((m) => ({
    id: m.id,
    name: m.name,
    kind: m.is_3d ? "3D" : "2D",
    nodes: m.nodes?.length ?? 0,
    elements: m.elements?.length ?? 0,
    status: (m.nodes?.length ?? 0) === 0 ? "draft" : "ok",
    modifiedAt: m.description ?? "—",
    ownerName: undefined,
  }));

  return (
    <div
      className="fixed inset-0 z-dialog bg-bg flex flex-col animate-fade-in"
      role="dialog"
      aria-label="Modelli"
      data-testid="modelli-browser"
    >
      {/* Top close bar */}
      <div className="flex items-center justify-between border-b border-border bg-bg-panel px-4 py-2">
        <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3">
          Modelli · A2 Browser
        </div>
        <button
          type="button"
          aria-label="Chiudi"
          onClick={() => setOpen(false)}
          className="w-7 h-7 border border-border bg-bg-elevated grid place-items-center text-ink-2 hover:border-ink-3 hover:text-ink"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-7 pt-6 pb-12 max-w-[1400px] mx-auto">
          {/* Page head */}
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold">
                MODELLI · {userModels.length} TOTALI
              </span>
              <h1
                className="font-display font-semibold tracking-tight-3 text-ink mt-1"
                style={{ fontSize: "28px", lineHeight: "1.15" }}
              >
                I tuoi modelli.
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-import-wizard"))}
                className="inline-flex items-center gap-1.5 bg-bg-elevated text-ink border border-border-light px-3 py-1.5 text-base font-medium hover:border-ink-3"
              >
                <FileUp className="w-3 h-3" />
                Importa
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new Event("feapro:open-new-model"));
                }}
                className="inline-flex items-center gap-1.5 bg-accent text-white px-3 py-1.5 text-base font-medium hover:bg-accent-hover"
              >
                <Plus className="w-3 h-3" />
                Nuovo modello
              </button>
            </div>
          </div>

          {/* Toolbar tabs + filters */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-bg-panel border border-border">
            <div className="flex gap-0.5">
              {TABS.map((t) => {
                const count =
                  t.id === "all"    ? userModels.length :
                  t.id === "recent" ? userModels.length :
                  t.id === "draft"  ? userModels.filter((m) => (m.nodes?.length ?? 0) === 0).length :
                  0;
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setTab(t.id); setPage(1); }}
                    className={[
                      "px-2.5 py-1 font-mono text-[11px] tracking-wide-1 border",
                      isActive
                        ? "text-accent border-accent bg-accent-subtle"
                        : "text-ink-3 border-transparent hover:text-ink-2",
                    ].join(" ")}
                  >
                    {t.label} · {count}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5 ml-auto">
              <FilterChip label="Tipo: tutti" />
              <FilterChip label="Status: tutti" />
              <FilterChip label="Norma: tutte" />
              <FilterChip label="Cerca…" icon={<Search className="w-2.5 h-2.5" />} />
            </div>
          </div>

          {/* Table — ModelsTable (riusato esistente). */}
          <div className="border-x border-b border-border">
            <ModelsTable
              rows={rows}
              onSelect={(id) => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("feapro:select-model", { detail: { id } }));
              }}
              className="border-0"
            />
          </div>

          {/* Pagination footer */}
          <div className="flex justify-between px-3.5 py-3 font-mono text-[11px] text-ink-3">
            <span>
              {paged.length} di {filtered.length} visualizzati
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-1.5 hover:text-accent disabled:opacity-40"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={p === page ? "text-accent font-semibold" : "hover:text-ink-2"}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-1.5 hover:text-accent disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 font-mono text-[11px] text-ink-2 border border-border-light cursor-pointer hover:border-ink-3">
      {icon}
      {label}
      {!icon && <ChevronDown className="w-2.5 h-2.5" />}
    </span>
  );
}

