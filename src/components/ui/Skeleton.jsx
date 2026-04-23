/**
 * Skeleton — pulsing gray placeholder for loading states.
 * Usage:
 *   <Skeleton className="h-4 w-32" />          — custom size
 *   <SkeletonCard />                            — stat card placeholder
 *   <SkeletonRow />                             — list-row placeholder
 */

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-14" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-4 h-4 rounded-full shrink-0" />
      <Skeleton className="h-3.5 flex-1 max-w-xs" />
      <Skeleton className="h-3 w-14 shrink-0" />
    </div>
  );
}
