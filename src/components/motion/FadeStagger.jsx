import { motion, useReducedMotion } from "framer-motion"
import { staggerContainer, staggerItem, fadeSlideUp, transition, EASE } from "../../lib/motion-variants"

/** Fade + slight slide for page header blocks */
export function MotionHeader({ children, className = "" }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Stagger children (cards, rows) */
export function StaggerList({ children, className = "" }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={reduce ? undefined : staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = "" }) {
  const reduce = useReducedMotion()
  return (
    <motion.div variants={reduce ? undefined : staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

/** Single section fade-in */
export function MotionSection({ children, className = "", delay = 0, ...rest }) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      initial={reduce ? false : fadeSlideUp.initial}
      animate={fadeSlideUp.animate}
      transition={{ ...(fadeSlideUp.transition || {}), delay: reduce ? 0 : delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.section>
  )
}

/** Wrapper for Card — hover lift + tap */
export function MotionSurface({ children, className = "" }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
      whileHover={reduce ? undefined : { y: -1, transition: transition.fast }}
      whileTap={reduce ? undefined : { scale: 0.997, transition: transition.fast }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
