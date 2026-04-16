import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Outlet, useLocation } from "react-router-dom"
import { EASE } from "../../lib/motion-variants"

/**
 * Subtle route transition for org + admin shells.
 */
export default function AnimatedOutlet() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 4 }}
        transition={{
          duration: reduceMotion ? 0 : 0.28,
          ease: EASE,
        }}
        className="min-h-0"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
