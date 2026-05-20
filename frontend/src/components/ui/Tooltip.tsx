/**
 * Tooltip — Radix con stile consistente.
 *
 * Setup necessario: avvolgi l'app in <TooltipProvider> una sola volta in main.tsx
 * Uso quotidiano:
 *   <Tooltip content="Esegui analisi">
 *     <Button iconLeft={<Play />} />
 *   </Tooltip>
 */
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { type ReactNode } from "react";
import { cn } from "./cn";

export const TooltipProvider = ({ children, delayDuration = 250 }: { children: ReactNode; delayDuration?: number }) => (
  <RadixTooltip.Provider delayDuration={delayDuration}>{children}</RadixTooltip.Provider>
);

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Disabilita il tooltip senza dover rimuovere il wrapper. */
  disabled?: boolean;
}

export function Tooltip({ content, children, side = "top", align = "center", disabled }: TooltipProps) {
  if (disabled) return <>{children}</>;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            "z-[60] max-w-xs",
            "bg-bg-elevated border border-border rounded-md px-2.5 py-1.5",
            "text-xs text-ink shadow-dropdown",
            "animate-fade-in",
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-bg-elevated" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
