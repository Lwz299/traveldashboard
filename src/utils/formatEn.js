/** أرقام وتواريخ بأرقام لاتينية (0–9) فقط — مناسب لعرض موحّد في الواجهة */

const NUM = "en-US"
const DATE = "en-GB"

export function formatCountEn(v) {
  if (v === undefined || v === null) return "—"
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString(NUM) : String(v)
}

/** String for KPI tiles — safe trim, em dash for empty (pairs with tabular-nums + truncate in UI). */
export function formatKpiDisplayText(v) {
  if (v == null) return "—"
  const s = String(v).trim()
  return s === "" ? "—" : s
}

/** مبلغ مع فاصل آلاف إنجليزي */
export function formatMoneyEn(v, suffix = "د.ع") {
  if (v === undefined || v === null) return "—"
  const n = Number(v)
  return Number.isFinite(n) ? `${n.toLocaleString(NUM)} ${suffix}`.trim() : "—"
}

export function formatDateEn(iso) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(DATE)
  } catch {
    return "—"
  }
}

export function formatDateTimeEn(iso) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(NUM, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return "—"
  }
}
