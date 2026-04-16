function normalizePriority(priority) {
  const numeric = Number(priority)
  if (Number.isFinite(numeric)) {
    if (numeric === 0) return "Low"
    if (numeric === 1) return "Medium"
    if (numeric === 2) return "High"
    if (numeric === 3) return "Critical"
  }
  const value = String(priority || "Medium").toLowerCase()
  if (value.includes("crit")) return "Critical"
  if (value.includes("high")) return "High"
  if (value.includes("med")) return "Medium"
  return "Medium"
}

function priorityClass(priority) {
  if (priority === "Critical") return "border-rose-200/90 bg-rose-50/80 text-rose-800"
  if (priority === "High") return "border-orange-200/90 bg-orange-50/80 text-orange-800"
  if (priority === "Medium") return "border-amber-200/90 bg-amber-50/80 text-amber-800"
  return "border-slate-200/90 bg-slate-50/80 text-slate-700"
}

const arLabel = {
  Low: "منخفضة",
  Medium: "متوسطة",
  High: "عالية",
  Critical: "حرجة",
}

export default function PriorityBadge({ priority, className = "" }) {
  const normalized = normalizePriority(priority)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityClass(normalized)} ${className}`}
    >
      {arLabel[normalized] || normalized}
    </span>
  )
}

export { normalizePriority }
