/**
 * Skeleton atom (Precision v2.0 PR1) — placeholder loading.
 *
 *   <Skeleton width="60%" height={12} />
 *   <Skeleton.Row /> · <Skeleton.Block />
 *
 * Usa animate-shimmer (precision keyframe). Sharp (radius 0).
 */
import { cn } from "./cn";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

function SkeletonBase({ width, height, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block bg-bg-hover relative overflow-hidden",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent",
        className,
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

function SkeletonRow({ className }: { className?: string }) {
  return <SkeletonBase width="100%" height={12} className={className} />;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <SkeletonBase width="100%" height={60} className={className} />;
}

export const Skeleton = Object.assign(SkeletonBase, {
  Row: SkeletonRow,
  Block: SkeletonBlock,
});
