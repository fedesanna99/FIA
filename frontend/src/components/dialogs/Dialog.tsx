import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Dialog({ open, onClose, title, children, footer, width = 420 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-dialog flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-bg-elevated border border-border-light shadow-dialog w-[calc(100vw-24px)] max-h-[calc(100vh-48px)] flex flex-col animate-slide-up"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* v1.7 T5: no crocetta X. Dismiss via ESC, click-outside, swipe-back.
            v2.0 PR16 T12: title font-display Precision (era text-sm). */}
        <div className="px-5 py-3 border-b border-border">
          <h2 id="dialog-title" className="font-display text-lg font-semibold tracking-tight-1 text-ink">
            {title}
          </h2>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-bg-panel">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
