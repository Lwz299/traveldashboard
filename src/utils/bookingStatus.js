/**
 * حالات الحجز (Booking v2): Pending · Confirmed · Expired · Cancelled
 */

export function bookingStatusLabelAr(raw) {
  if (raw == null || String(raw).trim() === "") return "—"
  const s = String(raw).trim().toLowerCase()
  if (s === "confirmed" || s.includes("paid") || s.includes("complete")) return "مؤكد / مدفوع"
  if (s === "pending") return "بانتظار الدفع"
  if (s === "expired") return "منتهي الصلاحية"
  if (s === "cancelled" || s.includes("cancel")) return "ملغى / مسترد"
  return String(raw)
}

export function bookingStatusBadgeClass(raw) {
  const s = String(raw ?? "").toLowerCase()
  if (s === "confirmed" || s.includes("paid") || s.includes("complete")) {
    return "border-emerald-200/90 bg-emerald-50 text-emerald-900 ring-emerald-600/15"
  }
  if (s === "pending") return "border-amber-200/90 bg-amber-50 text-amber-900 ring-amber-600/12"
  if (s === "expired") return "border-slate-200/80 bg-slate-100 text-slate-700 ring-slate-300/60"
  if (s === "cancelled" || s.includes("cancel")) {
    return "border-rose-200/90 bg-rose-50 text-rose-900 ring-rose-600/12"
  }
  return "border-slate-200/80 bg-slate-100 text-slate-800 ring-slate-300/60"
}
