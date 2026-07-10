/**
 * تدقيق مالي للفعالية قبل الحذف أو الإيقاف — GET /events/{eventId}/financial-audit
 */
import api from "./api"
import { formatMoneyEn } from "../utils/formatEn"

function pickNum(row, keys) {
  if (!row || typeof row !== "object") return null
  for (const k of keys) {
    const v = row[k]
    if (v != null && v !== "") {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

/** @returns {Promise<{ issuedTicketCount: number|null, totalPaidAmount: number|null, exposureOrders: object[] }|null>} */
export async function fetchEventFinancialAudit(eventId) {
  if (eventId == null || eventId === "") return null
  try {
    const { data } = await api.get(`/events/${eventId}/financial-audit`)
    if (!data || typeof data !== "object") return null
    const exposure = data.exposureOrders ?? data.ExposureOrders ?? []
    return {
      issuedTicketCount: pickNum(data, ["issuedTicketCount", "IssuedTicketCount"]),
      totalPaidAmount: pickNum(data, ["totalPaidAmount", "TotalPaidAmount"]),
      exposureOrders: Array.isArray(exposure) ? exposure : [],
    }
  } catch {
    return null
  }
}

/** نص تأكيد عربي للعرض قبل حذف فعالية */
export function formatFinancialAuditConfirmMessage(audit) {
  if (!audit) return ""
  const lines = ["── تدقيق مالي ──"]
  if (audit.issuedTicketCount != null) {
    lines.push(`تذاكر مصدرة: ${audit.issuedTicketCount}`)
  }
  if (audit.totalPaidAmount != null) {
    lines.push(`إجمالي المدفوع: ${formatMoneyEn(audit.totalPaidAmount, "")}`)
  }
  const exposure = audit.exposureOrders ?? []
  if (exposure.length > 0) {
    lines.push(`حجوزات ذات تعرض مالي: ${exposure.length}`)
    const preview = exposure.slice(0, 3)
    for (const row of preview) {
      const bid = row.orderId ?? row.OrderId ?? row.bookingId ?? row.BookingId ?? "?"
      const st = row.status ?? row.Status ?? "—"
      const amt = row.totalPrice ?? row.TotalPrice
      lines.push(
        `  · حجز #${bid} (${st})${amt != null ? ` — ${formatMoneyEn(Number(amt), "")}` : ""}`
      )
    }
    if (exposure.length > 3) lines.push(`  … و${exposure.length - 3} أخرى`)
  }
  return lines.join("\n")
}
