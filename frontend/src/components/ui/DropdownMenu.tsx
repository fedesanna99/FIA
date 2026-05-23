/**
 * DropdownMenu — wrapper Radix con stile consistente.
 *
 * Uso:
 *   <DropdownMenu>
 *     <DropdownMenuTrigger asChild><Button>Esporta ▾</Button></DropdownMenuTrigger>
 *     <DropdownMenuContent>
 *       <DropdownMenuItem onSelect={…}>JSON</DropdownMenuItem>
 *       <DropdownMenuItem onSelect={…}>CSV</DropdownMenuItem>
 *       <DropdownMenuSeparator />
 *       <DropdownMenuItem disabled>PDF server (M6)</DropdownMenuItem>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 */
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "./cn";

export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;

export const DropdownMenuContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixMenu.Content>
>(function DropdownMenuContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-[30] min-w-[200px] p-1",
          "bg-bg-elevated border border-border rounded-md shadow-dropdown",
          "animate-slide-up",
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixMenu.Item>
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <RadixMenu.Item
      ref={ref}
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 text-sm rounded outline-none cursor-pointer",
        "text-ink hover:bg-bg-hover focus:bg-bg-hover",
        "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
});

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <RadixMenu.Separator
      ref={ref}
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
});

export const DropdownMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixMenu.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <RadixMenu.Label
      ref={ref}
      className={cn("px-2.5 py-1 text-[10px] uppercase tracking-wider text-ink-3 font-medium", className)}
      {...props}
    />
  );
});
