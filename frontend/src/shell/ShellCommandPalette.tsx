// v2.6.2 Shell · Command Palette
//
// Replica del mockup §3.6 con cmdk + Radix Dialog. NON riscrive il registry
// (paletteItems.ts): import e re-use della lista esistente, solo rendering UI
// nuovo.
//
// Toggle Ctrl+K / Cmd+K via App.tsx (workspaceStore.togglePalette).
// Esc chiude; ↑↓ naviga (cmdk auto); ↵ esegue (cmdk auto + listener).

import { useEffect } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { useWorkspaceStore } from "../store/workspaceStore";

export function ShellCommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen);
  const setOpen = useWorkspaceStore((s) => s.setPalette);

  // Toggle via Ctrl+K / Cmd+K (handler globale)
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
                placeholder="Cerca azioni, modelli, norme… o chiedi al Copilot"
                autoFocus
              />
              <span className="cmd-esc">esc</span>
            </div>

            <Command.List className="cmd-list">
              <Command.Empty style={{ padding: 16, color: "var(--ink-dim)", fontSize: 13 }}>
                Nessun risultato. Prova un'altra query.
              </Command.Empty>

              {/* Suggerito ora */}
              <Command.Group heading="Suggerito ora">
                <div className="cmd-group-head">Suggerito ora</div>
                <Command.Item
                  value="ai-ask Chiedi al Copilot"
                  onSelect={() => {
                    // TODO Fase 3+: dispatch evento feapro:open-ai-copilot
                    setOpen(false);
                  }}
                >
                  <span
                    className="cmd-item-icon"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(8,145,178,0.2), rgba(8,145,178,0.05))",
                      borderColor: "rgba(8,145,178,0.4)",
                      color: "var(--accent)",
                    }}
                  >
                    ✨
                  </span>
                  <div>
                    <div className="cmd-item-name">Chiedi al Copilot</div>
                    <div className="cmd-item-sub">AI · usa contesto modello attivo</div>
                  </div>
                  <span className="cmd-item-kbd">↵</span>
                </Command.Item>
                <Command.Item
                  value="export-pdf esporta report"
                  onSelect={() => {
                    window.dispatchEvent(new Event("feapro:open-export-pdf"));
                    setOpen(false);
                  }}
                >
                  <span className="cmd-item-icon">⬇</span>
                  <div>
                    <div className="cmd-item-name">Esporta report PDF</div>
                    <div className="cmd-item-sub">reportlab · 7 sezioni</div>
                  </div>
                  <span className="cmd-item-kbd">⌘P</span>
                </Command.Item>
              </Command.Group>

              {/* Workspace navigation */}
              <Command.Group heading="Workspace">
                <div className="cmd-group-head">Workspace</div>
                <PaletteWorkspaceItem label="Vai a Modello" kbd="1" workspace="model" onClose={() => setOpen(false)} />
                <PaletteWorkspaceItem label="Vai a Analisi" kbd="2" workspace="analysis" onClose={() => setOpen(false)} />
                <PaletteWorkspaceItem label="Vai a Verifiche" kbd="3" workspace="verify" onClose={() => setOpen(false)} />
              </Command.Group>

              {/* Analisi */}
              <Command.Group heading="Analisi">
                <div className="cmd-group-head">Analisi</div>
                <Command.Item
                  value="run-static esegui statica"
                  onSelect={() => {
                    window.dispatchEvent(new Event("feapro:run-static"));
                    setOpen(false);
                  }}
                >
                  <span className="cmd-item-icon">▶</span>
                  <div>
                    <div className="cmd-item-name">Esegui statica</div>
                    <div className="cmd-item-sub">K u = F</div>
                  </div>
                  <span className="cmd-item-kbd">F5</span>
                </Command.Item>
              </Command.Group>

              {/* Sistema */}
              <Command.Group heading="Sistema">
                <div className="cmd-group-head">Sistema</div>
                <Command.Item
                  value="undo annulla"
                  onSelect={() => {
                    // Dispatch su modelStore
                    import("../store/modelStore").then((m) => m.useModelStore.getState().undo());
                    setOpen(false);
                  }}
                >
                  <span className="cmd-item-icon">↶</span>
                  <div>
                    <div className="cmd-item-name">Annulla ultima mutation</div>
                    <div className="cmd-item-sub">modelStore history</div>
                  </div>
                  <span className="cmd-item-kbd">⌘Z</span>
                </Command.Item>
              </Command.Group>
            </Command.List>

            <div className="cmd-foot">
              <span><kbd>↑↓</kbd> navigazione</span>
              <span><kbd>↵</kbd> esegui</span>
              <span><kbd>esc</kbd> chiudi</span>
              <span className="cmd-ai">✨ Inizia con "?" per il Copilot</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteWorkspaceItem({
  label,
  kbd,
  workspace,
  onClose,
}: {
  label: string;
  kbd: string;
  workspace: "model" | "analysis" | "verify";
  onClose: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={() => {
        useWorkspaceStore.getState().setWorkspace(workspace);
        onClose();
      }}
    >
      <span className="cmd-item-icon">→</span>
      <div>
        <div className="cmd-item-name">{label}</div>
        <div className="cmd-item-sub">workspace switch</div>
      </div>
      <span className="cmd-item-kbd">{kbd}</span>
    </Command.Item>
  );
}
