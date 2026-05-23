/**
 * Dialog modale — Radix.
 *
 * Uso:
 *   <Dialog open={open} onOpenChange={setOpen}>
 *     <DialogContent title="Titolo" description="Sottotitolo">
 *       … contenuto …
 *       <DialogFooter>
 *         <Button onClick={() => setOpen(false)}>Annulla</Button>
 *         <Button variant="primary" onClick={submit}>Conferma</Button>
 *       </DialogFooter>
 *     </DialogContent>
 *   </Dialog>
 */
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";
import { cn } from "./cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

interface DialogContentProps
  extends Omit<ComponentPropsWithoutRef<typeof RadixDialog.Content>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  /** Larghezza max. Default 480 px. */
  maxWidth?: string;
  /** Se true, nasconde il bottone X di chiusura. */
  hideClose?: boolean;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    { title, description, maxWidth = "480px", hideClose, className, children, ...props },
    ref,
  ) {
    return (
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
            "animate-fade-in",
          )}
        />
        <RadixDialog.Content
          ref={ref}
          style={{ maxWidth }}
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "z-40 w-[calc(100vw-32px)]",
            "bg-bg-elevated border border-border rounded-lg shadow-dialog",
            "animate-slide-up",
            "max-h-[calc(100vh-64px)] flex flex-col",
            "focus:outline-none",
            className,
          )}
          {...props}
        >
          {(title || description) && (
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
              <div className="min-w-0">
                {title && (
                  <RadixDialog.Title className="text-md font-semibold text-ink">
                    {title}
                  </RadixDialog.Title>
                )}
                {description && (
                  <RadixDialog.Description className="text-xs text-ink-3 mt-1">
                    {description}
                  </RadixDialog.Description>
                )}
              </div>
              {!hideClose && (
                <RadixDialog.Close className="flex-shrink-0 text-ink-3 hover:text-ink p-1 rounded hover:bg-bg-hover transition-colors">
                  <X className="h-4 w-4" />
                </RadixDialog.Close>
              )}
            </div>
          )}
          <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-bg-panel/30 -mx-5 -mb-4 mt-4 rounded-b-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}
