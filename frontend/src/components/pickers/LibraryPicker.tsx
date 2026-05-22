/**
 * LibraryPicker (v1.6 Sprint 0 · B13) — modal generico picker per libreria
 * con due colonne: famiglia (sinistra) + lista filtrabile (destra).
 *
 * Sostituisce i `<select>` HTML in ElementDialog dove l'utente vedeva
 * solo l'opzione default (la lista era nascosta nello scroll del select).
 * L'amico ingegnere ha lamentato "solo 3 sezioni rettangolari" mentre il
 * backend espone 12 sezioni + 20 materiali.
 *
 * UI mockup: 720×480, search header, lista con icona+nome+meta,
 * "+N su Y" footer. Click su riga → onChange(id) + onClose().
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useModalBackButton } from "../../hooks/useModalBackButton";
import { toast } from "../../store/toastStore";
import { cn } from "../ui/cn";


export interface LibraryItem {
  id: string;
  name: string;
  /** Famiglia di appartenenza (chiave per il group). */
  family: string;
  /** Label umano della famiglia (mostrato nella colonna sx). */
  familyLabel: string;
  /** Riga descrittiva (es. "A=51.5 cm² · Iy=3892 cm⁴"). */
  metaLine?: string;
  /** Riga secondaria (es. "300×150 mm" per dimensioni nominali). */
  badge?: string;
  /** Sub-keyword per fuzzy search aggiuntive (es. "IPE 300", "trave"). */
  aliases?: string[];
}


interface Props<T extends LibraryItem> {
  open: boolean;
  onClose: () => void;
  /** Lista intera della libreria (gia' filtrata se serve). */
  items: T[];
  /** ID corrente, evidenziato nella lista. */
  value?: string | null;
  /** Callback selezione. */
  onChange: (id: string) => void;
  /** Titolo modal (es. "Scegli sezione", "Scegli materiale"). */
  title: string;
  /** Placeholder search. */
  searchPlaceholder: string;
  /** Empty state message. */
  emptyMessage?: string;
  /** data-testid */
  testId?: string;
}


export function LibraryPicker<T extends LibraryItem>({
  open,
  onClose,
  items,
  value,
  onChange,
  title,
  searchPlaceholder,
  emptyMessage,
  testId = "library-picker",
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState<string>("all");

  // v1.6 S0 B08: back hardware mobile chiude il picker.
  useModalBackButton(open, onClose);

  // Famiglie con count: { family, label, count }
  const families = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const it of items) {
      const existing = map.get(it.family);
      if (existing) existing.count += 1;
      else map.set(it.family, { label: it.familyLabel, count: 1 });
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].label.localeCompare(b[1].label),
    );
  }, [items]);

  // Filtro: famiglia + search (su name + id + aliases)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (family !== "all" && it.family !== family) return false;
      if (q === "") return true;
      if (it.name.toLowerCase().includes(q)) return true;
      if (it.id.toLowerCase().includes(q)) return true;
      if (it.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [items, family, search]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label={title}
      data-testid={testId}
    >
      <div
        className="bg-bg-panel border border-border rounded-lg shadow-dialog w-[calc(100vw-24px)] max-w-[760px] max-h-[calc(100vh-48px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (v1.7 T5: no crocetta X — dismiss via ESC, backdrop, swipe). */}
        <header className="px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
        </header>

        {/* Body responsive: stack su mobile, 2-cols su md+ (v1.7 T4) */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Famiglie: orizzontale scrollabile su mobile, sidebar sx su desktop */}
          <aside className="md:w-40 border-b md:border-b-0 md:border-r border-border p-2 flex md:flex-col gap-1 md:space-y-0.5 md:gap-0 overflow-x-auto md:overflow-x-visible md:overflow-y-auto flex-shrink-0">
            <FamilyButton
              label={`Tutte (${items.length})`}
              active={family === "all"}
              onClick={() => setFamily("all")}
              testId={`${testId}-family-all`}
            />
            {families.map(([fam, info]) => (
              <FamilyButton
                key={fam}
                label={`${info.label} (${info.count})`}
                active={family === fam}
                onClick={() => setFamily(fam)}
                testId={`${testId}-family-${fam}`}
              />
            ))}
          </aside>

          {/* Dx: search + list */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-bg-page border border-border rounded pl-8 pr-3 py-2 text-[12px] focus:outline-none focus:border-accent"
                  data-testid={`${testId}-search`}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-[12px] text-ink-muted">
                  {emptyMessage ?? "Nessun risultato. Prova con un'altra parola chiave."}
                </div>
              ) : (
                filtered.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      onChange(it.id);
                      onClose();
                    }}
                    data-testid={`${testId}-item-${it.id}`}
                    className={cn(
                      "w-full text-left px-3 py-2 border-b border-border/50 hover:bg-bg-hover flex items-center gap-3 transition-colors",
                      value === it.id && "bg-bg-info",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[12px] text-ink truncate">{it.name}</div>
                      {it.metaLine && (
                        <div className="text-[10px] text-ink-muted font-mono mt-0.5 truncate">
                          {it.metaLine}
                        </div>
                      )}
                    </div>
                    {it.badge && (
                      <div className="text-[10px] text-ink-muted font-mono flex-shrink-0">
                        {it.badge}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            <footer className="border-t border-border px-3 py-2.5 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-ink-muted">
                {filtered.length} su {items.length}
              </span>
              <CustomItemPlaceholder />
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}


function FamilyButton({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        // v1.7 T4: su mobile e' in flex-row → whitespace-nowrap evita wrap.
        // md:w-full ripristina il pieno width nella sidebar desktop.
        "whitespace-nowrap md:w-full text-left px-2.5 py-1.5 rounded text-[12px] transition-colors flex-shrink-0 md:flex-shrink",
        active
          ? "bg-bg-info text-ink-info font-medium"
          : "text-ink-muted hover:bg-bg-hover hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}


function CustomItemPlaceholder() {
  // v1.6 S0 · B13: il bottone "Crea custom" e' un placeholder per Sprint 2
  // (S2.T1 — material/section editor). Per ora mostra un toast.
  return (
    <button
      type="button"
      onClick={() => {
        toast("info", "Editor custom in arrivo nello Sprint 2.");
      }}
      className="text-[12px] text-ink-info hover:underline"
    >
      + Crea custom
    </button>
  );
}
