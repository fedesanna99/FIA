import { Loader2 } from "lucide-react";
import { cn } from "./cn";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return <Loader2 className={cn("animate-spin text-accent", SIZE[size], className)} />;
}
