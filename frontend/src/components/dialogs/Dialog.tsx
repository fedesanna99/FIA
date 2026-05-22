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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel rounded shadow-xl w-[calc(100vw-24px)] max-h-[calc(100vh-48px)] flex flex-col"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* v1.7 T5: no crocetta X. Dismiss via ESC, click-outside, swipe-back.
            Vedi mockup_reference.html sezione 02 "Dismiss". */}
        <div className="px-4 py-2.5 border-b border-border">
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
        {footer && (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
