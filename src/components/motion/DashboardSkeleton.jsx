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

/** KPI row skeleton — org or admin */
export function DashboardKpiSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
          className="org-card-surface rounded-2xl p-5"
        >
          <ShimmerBlock className="mb-4 h-3 w-24" />
          <ShimmerBlock className="mb-2 h-8 w-32" />
          <ShimmerBlock className="h-3 w-20" />
        </motion.div>
      ))}
    </div>
  )
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <ShimmerBlock className="h-8 w-48 max-w-full" />
        <ShimmerBlock className="h-4 w-full max-w-xl" />
      </div>
      <DashboardKpiSkeleton />
      <div className="org-card-surface rounded-2xl p-6">
        <ShimmerBlock className="mb-2 h-5 w-40" />
        <ShimmerBlock className="mb-6 h-3 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <ShimmerBlock key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Events listing — toolbar + card grid (org-app) */
export function EventsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <ShimmerBlock className="h-9 w-56 max-w-full" />
          <ShimmerBlock className="h-4 w-72 max-w-full" />
        </div>
        <ShimmerBlock className="h-11 w-full shrink-0 rounded-xl sm:w-44" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <ShimmerBlock className="h-11 w-full rounded-xl lg:min-w-[200px] lg:flex-1" />
        <ShimmerBlock className="h-11 w-full rounded-xl lg:w-40" />
        <ShimmerBlock className="h-11 w-full rounded-xl lg:w-44" />
        <ShimmerBlock className="h-11 w-full rounded-xl lg:w-44" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="org-card-surface rounded-2xl p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <ShimmerBlock className="h-5 w-[70%]" />
              <ShimmerBlock className="h-6 w-16 shrink-0 rounded-full" />
            </div>
            <ShimmerBlock className="mb-2 h-3 w-full" />
            <ShimmerBlock className="mb-4 h-3 w-[80%]" />
            <div className="mb-4 space-y-2">
              <ShimmerBlock className="h-4 w-3/5" />
              <ShimmerBlock className="h-4 w-1/2" />
            </div>
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

/** سطور نصية — لوحات تفاصيل / تحميل جزئي */
export function InlineDetailSkeleton({ rows = 6 }) {
  const reduce = useReducedMotion()
  const widths = ["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4", "w-5/6"]
  return (
    <div className="space-y-2 py-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`h-4 rounded-lg bg-slate-200/60 ${reduce ? "" : "animate-pulse"} ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  )
}

/** صفوف قائمة — جداول أو قوائم مستخدمين */
export function StackedRowsSkeleton({ rows = 5 }) {
  const reduce = useReducedMotion()
  return (
    <div className="space-y-2 py-1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE, delay: i * 0.03 }}
          className="rounded-xl border border-slate-200/60 bg-white/70 px-4 py-3"
        >
          <div className={`mb-2 h-4 w-1/3 max-w-[200px] rounded-lg bg-slate-200/60 ${reduce ? "" : "animate-pulse"}`} />
          <div className={`h-3 w-2/3 max-w-sm rounded-lg bg-slate-200/50 ${reduce ? "" : "animate-pulse"}`} />
        </motion.div>
      ))}
    </div>
  )
}
