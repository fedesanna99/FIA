// v2.6.2 Shell · Command Palette
//
// v2.6.2.1 polish F2: ora legge il registry centrale `lib/paletteItems.ts`
// (~140 voci) e usa `usePaletteDispatch` come single source of truth per
// l'execution. Niente più 7 voci hardcoded.
//
// UI cmdk + Radix Dialog secondo §3.6 DESIGN_HANDOFF. Toggle Ctrl+K/Cmd+K
// via App.tsx (workspaceStore.togglePalette). Esc chiude; ↑↓ naviga; ↵ esegue.

import { useEffect, useMemo } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useModelStore } from "../store/modelStore";
import {
  PALETTE_ITEMS,
  SECTION_LABELS,
  SECTION_ORDER,
  type PaletteItem,
  type PaletteSection,
} from "../lib/paletteItems";
import { usePaletteDispatch } from "../lib/usePaletteDispatch";

export function ShellCommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen);
  const setOpen = useWorkspaceStore((s) => s.setPalette);
  const model = useModelStore((s) => s.model);
  const dispatch = usePaletteDispatch();

  // Toggle Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useWorkspaceStore.getState().paletteOpen);
      } else if (e.key === "Escape" && useWorkspaceStore.getState().paletteOpen) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // Grouping per section (escluso favorites che è runtime-driven nel legacy)
  const grouped = useMemo(() => {
    const out = new Map<PaletteSection, PaletteItem[]>();
    for (const it of PALETTE_ITEMS) {
      const arr = out.get(it.section) ?? [];
      arr.push(it);
      out.set(it.section, arr);
    }
    return out;
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="cmd-backdrop" />
        <Dialog.Content
          className="cmd-modal"
          data-testid="shell-command-palette"
          onOpenAutoFocus={(e) => {
            // Lasciamo che cmdk gestisca il focus sull'input
            e.preventDefault();
          }}
        >
          <Dialog.Title className="sr-only">Palette comandi</Dialog.Title>
          <Dialog.Description className="sr-only">
            Cerca azioni, workspace, analisi, verifiche o invoca l'AI Copilot.
          </Dialog.Description>
          <Command label="Comandi" loop>
            <div className="cmd-search">
              <span className="cmd-search-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <Command.Input
                placeholder={`Cerca tra ${PALETTE_ITEMS.length} comandi · workspace · analisi · verifiche…`}
                autoFocus
                data-testid="shell-palette-input"
              />
              <span className="cmd-esc">esc</span>
            </div>

            <Command.List className="cmd-list">
              <Command.Empty style={{ padding: 16, color: "var(--ink-dim)", fontSize: 13 }}>
                Nessun risultato. Prova "model", "run", "theme", "help"…
              </Command.Empty>

              {SECTION_ORDER.filter((s) => s !== "favorites").map((section) => {
                const items = grouped.get(section) ?? [];
                if (items.length === 0) return null;
                return (
                  <Command.Group
                    key={section}
                    heading={`${SECTION_LABELS[section]} · ${items.length}`}
                  >
                    <div className="cmd-group-head">
                      {SECTION_LABELS[section]} · {items.length}
                    </div>
                    {items.map((item) => (
                      <ShellPaletteRow
                        key={item.id}
                        item={item}
                        disabled={(item.needsModel && !model) || !!item.soon}
                        onSelect={() => dispatch(item, () => setOpen(false))}
                      />
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>

            <div className="cmd-foot">
              <span>
                <kbd>↑↓</kbd> navigazione
              </span>
              <span>
                <kbd>↵</kbd> esegui
              </span>
              <span>
                <kbd>esc</kbd> chiudi
              </span>
              <span className="cmd-ai">✨ Inizia con "?" per il Copilot</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ShellPaletteRowProps {
  item: PaletteItem;
  onSelect: () => void;
  disabled?: boolean;
}

function ShellPaletteRow({ item, onSelect, disabled }: ShellPaletteRowProps) {
  const Icon = item.icon;
  // Aliases concatenati nel `value` per cmdk fuzzy match
  const matchValue = [item.label, item.description, ...(item.aliases ?? [])]
    .filter(Boolean)
    .join(" ");

  return (
    <Command.Item
      value={matchValue}
      onSelect={() => !disabled && onSelect()}
      disabled={disabled}
      data-testid={`shell-palette-item-${item.id}`}
      className="cmd-item"
    >
      <span className="cmd-item-icon">
        {Icon ? <Icon size={13} strokeWidth={1.8} /> : "·"}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="cmd-item-name">
          {item.label}
          {item.soon && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--purple)",
                background: "var(--bg-purple)",
                padding: "1px 5px",
                borderRadius: 4,
                textTransform: "uppercase",
                letterSpacing: 0.06,
                fontWeight: 600,
              }}
            >
              soon
            </span>
          )}
          {item.group && (
            <span
              style={{
                marginLeft: 6,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                color: "var(--ink-dim)",
              }}
            >
              · {item.group}
            </span>
          )}
        </div>
        {item.description && <div className="cmd-item-sub">{item.description}</div>}
      </div>
      {item.shortcut && <span className="cmd-item-kbd">{item.shortcut}</span>}
    </Command.Item>
  );
}
