import { motion, useReducedMotion } from "framer-motion"
import { EASE } from "../../lib/motion-variants"

function ShimmerBlock({ className = "" }) {
  const reduce = useReducedMotion()
  return (
    <div
      className={`rounded-xl bg-slate-200/60 ${reduce ? "" : "animate-pulse"} ${className}`}
      aria-hidden
    />
  )
}

export function AdminCardsSkeleton({ count = 6, gridClassName = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" }) {
  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE, delay: i * 0.02 }}
          className="rounded-2xl border border-slate-200/60 bg-white/60 p-4"
        >
          <ShimmerBlock className="h-4 w-2/3 mb-3" />
          <ShimmerBlock className="h-3 w-full mb-2" />
          <ShimmerBlock className="h-3 w-4/5 mb-2" />
          <div className="mt-4 flex items-center justify-between gap-3">
            <ShimmerBlock className="h-8 w-2/3 rounded-xl" />
            <ShimmerBlock className="h-8 w-10 rounded-xl" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/** Admin events listing — toolbar + card grid (matches Events page structure) */
export function AdminEventsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <ShimmerBlock className="h-9 w-56 max-w-full" />
          <ShimmerBlock className="h-4 w-80 max-w-full" />
        </div>
        <ShimmerBlock className="h-11 w-full shrink-0 rounded-xl sm:w-44" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <ShimmerBlock className="h-11 w-full rounded-xl lg:min-w-[200px] lg:flex-1" />
        <ShimmerBlock className="h-11 w-full rounded-xl lg:w-40" />
        <ShimmerBlock className="h-11 w-full rounded-xl lg:w-44" />
        <ShimmerBlock className="h-11 w-full rounded-xl lg:w-44" />
      </div>
      <ShimmerBlock className="h-4 w-48" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="admin-card-surface rounded-2xl p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <ShimmerBlock className="h-5 w-[70%]" />
              <ShimmerBlock className="h-6 w-16 shrink-0 rounded-full" />
            </div>
            <ShimmerBlock className="mb-2 h-3 w-full" />
            <ShimmerBlock className="mb-4 h-3 w-[80%]" />
            <ShimmerBlock className="mb-2 h-4 w-3/5" />
            <div className="mb-4 flex gap-3">
              <ShimmerBlock className="h-4 w-20" />
              <ShimmerBlock className="h-4 w-24" />
            </div>
            <ShimmerBlock className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminTableSkeleton({ rows = 7 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90">
      <div className="border-b border-slate-200/80 bg-slate-50/80">
        <div className="grid grid-cols-[56px_1.6fr_1fr_1fr_1fr] gap-2 px-3 py-3 text-xs font-medium text-slate-600">
          <div />
          <ShimmerBlock className="h-3 w-28" />
          <ShimmerBlock className="h-3 w-20" />
          <ShimmerBlock className="h-3 w-20" />
          <ShimmerBlock className="h-3 w-14" />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-[56px_1.6fr_1fr_1fr_1fr] gap-2 px-3 py-3">
            <ShimmerBlock className="h-6 w-10 rounded-xl" />
            <ShimmerBlock className="h-4 w-40 rounded-xl" />
            <ShimmerBlock className="h-4 w-28 rounded-xl" />
            <ShimmerBlock className="h-4 w-24 rounded-xl" />
            <ShimmerBlock className="h-4 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

