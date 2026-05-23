/**
 * Barrel export per i primitives UI.
 * Importa da qui in tutta l'app: `import { Button, Card, Tabs } from "@/components/ui"`.
 */
export { Button } from "./Button";
export type { ButtonVariant, ButtonSize } from "./Button";
export { Card } from "./Card";
export { Field, Input, NumericInput } from "./Input";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";
export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogFooter } from "./Dialog";
export { Tooltip, TooltipProvider } from "./Tooltip";
export { Badge } from "./Badge";
export { Spinner } from "./Spinner";
export { EmptyState } from "./EmptyState";
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "./DropdownMenu";
export { cn } from "./cn";
export { TipBubble } from "./TipBubble";
// Precision v2.0 PR1 atoms (Sharp · Cyan accent · Hairline borders)
export { Chip } from "./Chip";
export type { ChipTone } from "./Chip";
export { Kbd } from "./Kbd";
export { Avatar } from "./Avatar";
export { Skeleton } from "./Skeleton";
export { Toggle } from "./Toggle";
export { IconButton } from "./IconButton";
export { FormField } from "./FormField";
