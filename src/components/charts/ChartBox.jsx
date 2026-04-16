import { useEffect, useRef, useState } from "react"

/**
 * Prevents recharts from rendering when the container has 0/invalid size.
 * This avoids console warnings like width(-1)/height(-1) during layout transitions.
 *
 * @param {{
 *  className?: string,
 *  style?: React.CSSProperties,
 *  children: React.ReactNode
 * }} props
 */
export default function ChartBox({ className = "", style, children }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const mark = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setReady(Number.isFinite(w) && Number.isFinite(h) && w > 8 && h > 8)
    }

    mark()

    const ro = new ResizeObserver(() => mark())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className={`min-w-0 ${className}`} style={style}>
      {ready ? children : null}
    </div>
  )
}

