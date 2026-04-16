/** Shared motion presets — fast, ease-in-out, dashboard-friendly */

export const EASE = [0.4, 0, 0.2, 1]

export const transition = {
  fast: { duration: 0.22, ease: EASE },
  base: { duration: 0.32, ease: EASE },
  spring: { type: "spring", stiffness: 380, damping: 28 },
}

/** Page / route wrapper */
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: transition.base,
}

/** Stagger parent — use initial="hidden" animate="show" */
export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

/** Child of stagger */
export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: transition.base,
  },
}

/** Single block fade + slide */
export const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: transition.base,
}

/** Card hover — very subtle */
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    y: -2,
    transition: transition.fast,
  },
  tap: { scale: 0.995, transition: transition.fast },
}
