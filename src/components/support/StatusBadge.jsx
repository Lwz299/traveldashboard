function normalizeStatus(status) {
  const numeric = Number(status)
  if (Number.isFinite(numeric)) {
    if (numeric === 0) return "Open"
    if (numeric === 1) return "Pending"
    if (numeric === 2) return "Resolved"
    if (numeric === 3) return "Closed"
  }
  const value = String(status || "Open").toLowerCase()
  if (value.includes("in progress") || value === "inprogress") return "InProgress"
  if (value.includes("pend")) return "Pending"
  if (value.includes("resolve")) return "Resolved"
  if (value.includes("cancel") || value.includes("close")) return "Closed"
  return "Open"
}

function statusClass(status) {
  if (status === "Resolved") return "border-emerald-200/90 bg-emerald-50/80 text-emerald-800"
  if (status === "Pending") return "border-amber-200/90 bg-amber-50/80 text-amber-800"
  if (status === "InProgress") return "border-sky-200/90 bg-sky-50/80 text-sky-900"
  if (status === "Closed") return "border-rose-200/90 bg-rose-50/80 text-rose-800"
  return "border-slate-200/90 bg-slate-50/80 text-slate-700"
}

export const STATUS_LABELS_AR = {
  Open: "مفتوحة",
  Pending: "معلّقة",
  InProgress: "قيد التنفيذ",
  Resolved: "محلولة",
  Closed: "مغلقة",
}

/** تسمية عربية موحّدة للحالة (للقوائم والتفاصيل) */
export function formatStatusArabic(raw) {
  const normalized = normalizeStatus(raw)
  return STATUS_LABELS_AR[normalized] ?? String(raw ?? "—")
}

export default function StatusBadge({ status, className = "" }) {
  const normalized = normalizeStatus(status)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(normalized)} ${className}`}
    >
      {STATUS_LABELS_AR[normalized] || normalized}
    </span>
  )
}

export { normalizeStatus }
