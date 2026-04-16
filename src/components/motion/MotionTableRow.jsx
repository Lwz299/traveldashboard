import { motion, useReducedMotion } from "framer-motion"
import { EASE } from "../../lib/motion-variants"

export default function MotionTableRow({ className = "", delay = 0, children, ...rest }) {
  const reduce = useReducedMotion()
  return (
    <motion.tr
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.28, ease: EASE, delay: reduce ? 0 : delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.tr>
  )
}

