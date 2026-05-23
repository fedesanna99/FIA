/**
 * Tabs — wrapper Radix con styling consistente.
 *
 * Uso:
 *   <Tabs defaultValue="t1">
 *     <TabsList>
 *       <TabsTrigger value="t1">Generale</TabsTrigger>
 *       <TabsTrigger value="t2">Avanzato</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="t1">…</TabsContent>
 *     <TabsContent value="t2">…</TabsContent>
 *   </Tabs>
 */
import * as RadixTabs from "@radix-ui/react-tabs";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "./cn";

export const Tabs = RadixTabs.Root;

export const TabsList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixTabs.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <RadixTabs.List
      ref={ref}
      className={cn(
        "flex items-center gap-1 border-b border-border px-1 overflow-x-auto",
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        "relative px-3 py-2 text-xs font-medium text-ink-3",
        "hover:text-ink transition-colors duration-fast",
        "data-[state=active]:text-ink",
        "data-[state=active]:after:content-[''] data-[state=active]:after:absolute",
        "data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-3 data-[state=active]:after:right-3",
        "data-[state=active]:after:h-[2px] data-[state=active]:after:bg-accent",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        "whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <RadixTabs.Content
      ref={ref}
      className={cn("focus-visible:outline-none", className)}
      {...props}
    />
  );
});
