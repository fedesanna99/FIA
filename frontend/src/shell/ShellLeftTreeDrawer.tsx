/**
 * ShellLeftTreeDrawer (v3.4 Fetta M3 mobile · 30/05/2026 mattina).
 *
 * Drawer overlay mobile per il panel SX "Albero modello". Wrappa il
 * `ShellLeftTreePanel` esistente (Fetta E2.4) e ne cambia il rendering:
 * invece di occupare una colonna grid (desktop), diventa un drawer
 * sticky a sinistra che scorre fuori dal viewport via transform.
 *
 * Pattern ADR 004 D4 "drawer semi-modal" (Slack/Telegram-style):
 *   - chiuso: translateX(-100%), invisibile, niente layout shift
 *   - aperto: translateX(0), copre 80% larghezza schermo (max 280px),
 *     backdrop scuro semi-trasparente sopra il viewport
 *   - tap su backdrop → toggle (chiude)
 *   - tap su X interno del ShellLeftTreePanel → close (gia' esistente E2.4)
 *   - body scroll lock quando aperto (useEffect, cleanup garantito)
 *
 * State: usa `leftTreeStore` esistente — stesso `treeState` open/closed
 * che governa il rendering desktop nella grid. Quindi:
 *   - su mobile, l'utente apre il drawer dall'hamburger menu (M1) →
 *     voce "Albero modello" toggle → treeState=open → drawer slide-in
 *   - su desktop, l'utente apre dal toggle Albero in topbar →
 *     treeState=open → colonna grid 240px (comportamento E2.4 invariato)
 *
 * Zero duplicazione: il drawer NON ha un proprio store, riusa quello
 * esistente per coerenza cross-viewport (se l'utente apre l'albero su
 * mobile poi va su desktop, lo trova ancora aperto).
 *
 * Visibilita': il componente si auto-nasconde quando treeState=closed
 * (transform translateX e backdrop conditional). Non serve `display:
 * none` esterno. Renderizzato in Shell.tsx solo quando isMobile +
 * !focus + !takeover (vedi gate `showLeftTreeDrawer`).
 */
import { ReactNode, useEffect } from "react";
import { useLeftTreeStore } from "../store/leftTreeStore";


interface ShellLeftTreeDrawerProps {
  /** Il `ShellLeftTreePanel` (o test mock). Wrapped come content
   *  del drawer scrollable. */
  children: ReactNode;
}


export function ShellLeftTreeDrawer({ children }: ShellLeftTreeDrawerProps) {
  const treeState = useLeftTreeStore((s) => s.treeState);
  const toggle = useLeftTreeStore((s) => s.toggle);
  const isOpen = treeState === "open";

  // Body scroll lock quando aperto. Cleanup garantito al unmount o
  // alla chiusura. Pattern identico a ShellPanelMobileSheet (Fetta M4).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop: appare solo quando drawer aperto. Click → toggle
          (chiude). aria-hidden perche' decorativo, il drawer e' il
          target effettivo dell'interazione. */}
      {isOpen && (
        <div
          className="shell-left-tree-drawer-backdrop"
          onClick={toggle}
          data-testid="shell-left-tree-drawer-backdrop"
          aria-hidden
        />
      )}

      {/* Drawer: sempre montato (anche quando treeState=closed) cosi'
          la transition CSS funziona in entrata/uscita. La visibilita'
          effettiva e' guidata dal data-drawer-state + transform CSS. */}
      <aside
        className="shell-left-tree-drawer"
        data-drawer-state={treeState}
        data-testid="shell-left-tree-drawer"
        aria-label="Albero modello"
        aria-hidden={!isOpen}
      >
        {children}
      </aside>
    </>
  );
}
