import { createElement } from "react"
import { cn } from "../../lib/utils.mjs"
import { formatKpiDisplayText } from "../../utils/formatEn"

/**
 * Primary stat number for admin KPI / glass cards — LTR numerals, clamp sizing, hover title.
 * @param {{ value: unknown, size?: 'compact'|'comfortable', className?: string, as?: 'p'|'div' }}=} props
 */
export default function AdminKpiValue({ value, size = "compact", className, as = "p" }) {
  const text = formatKpiDisplayText(value)
  const clamp =
    size === "comfortable"
      ? "text-[clamp(1.35rem,2.2vw,2.05rem)]"
      : "text-[clamp(1.15rem,1.9vw,1.6rem)]"

  const elProps = {
    className: cn(
      "truncate font-bold leading-none tracking-tight tabular-nums text-brand-navy",
      clamp
    ),
    title: text,
    children: text,
  }

  return (
    <div dir="ltr" className={cn("min-w-0", className)}>
      {createElement(as, elProps)}
    </div>
  )
}
