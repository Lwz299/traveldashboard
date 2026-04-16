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

export function TicketsListSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE, delay: i * 0.03 }}
          className="rounded-2xl border border-slate-200/60 bg-white/60 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <ShimmerBlock className="h-3 w-40" />
              <ShimmerBlock className="h-2 w-28" />
            </div>
            <ShimmerBlock className="h-9 w-20 rounded-xl" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function TicketsDetailSkeleton({ bubbles = 4 }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4">
        <ShimmerBlock className="mb-3 h-4 w-64" />
        <ShimmerBlock className="h-3 w-48" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: bubbles }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <ShimmerBlock
              className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-3/4" : "w-2/3"}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

