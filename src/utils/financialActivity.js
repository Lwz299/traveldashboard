/**
 * تطبيع ودمج أحداث مالية من مصادر مختلفة (حركات محفظة + سحوبات)
 * يدعم حقول camelCase / PascalCase شائعة من الـ API.
 */

import { firstDefinedNonEmpty as firstDefined } from "./firstDefined"

function parseDate(v) {
  if (v == null || v === "") return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** تسمية عربية لنوع حركة المحفظة */
export function walletTypeLabelAr(raw) {
  const s = String(raw ?? "").toLowerCase()
  if (s.includes("credit")) return "إيداع"
  if (s.includes("debit")) return "خصم"
  if (s.includes("refund")) return "استرداد"
  if (!s) return "حركة محفظة"
  return String(raw)
}

/**
 * @returns {{ kind: 'wallet', id: string, amount: number, label: string, date: Date|null, meta: object }}
 */
export function normalizeWalletTransaction(row) {
  if (!row || typeof row !== "object") return null
  const id = firstDefined(row, ["id", "Id", "transactionId", "TransactionId"]) ?? ""
  const amount = Number(firstDefined(row, ["amount", "Amount"]))
  const rawType = firstDefined(row, ["type", "Type", "transactionType", "TransactionType"]) ?? ""
  const dateRaw = firstDefined(row, [
    "createdAt",
    "CreatedAt",
    "transactionDate",
    "TransactionDate",
    "date",
    "Date",
  ])
  return {
    kind: "wallet",
    id: String(id || `w-${Math.random().toString(36).slice(2, 9)}`),
    amount: Number.isFinite(amount) ? amount : 0,
    label: walletTypeLabelAr(rawType),
    date: parseDate(dateRaw),
    meta: {
      rawType: String(rawType),
      orderId: firstDefined(row, ["orderId", "OrderId", "bookingId", "BookingId"]),
      commissionRate: firstDefined(row, ["commissionRate", "CommissionRate"]),
    },
  }
}

/**
 * @returns {{ kind: 'payout', id: string, amount: number, label: string, date: Date|null, meta: object }}
 */
export function normalizePayoutHistoryRow(row) {
  if (!row || typeof row !== "object") return null
  const id = firstDefined(row, ["id", "Id"]) ?? ""
  const amount = Number(firstDefined(row, ["amount", "Amount"]))
  const dateRaw = firstDefined(row, [
    "requestedAt",
    "RequestedAt",
    "createdAt",
    "CreatedAt",
    "date",
    "Date",
  ])
  const status = firstDefined(row, ["status", "Status", "payoutStatus", "PayoutStatus"])
  return {
    kind: "payout",
    id: String(id || `p-${Math.random().toString(36).slice(2, 9)}`),
    amount: Number.isFinite(amount) ? amount : 0,
    label: "طلب سحب",
    date: parseDate(dateRaw),
    meta: { status: status != null ? String(status) : "" },
  }
}

function toSortTime(d) {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0
}

/**
 * دمج وترتيب تنازلي حسب التاريخ (الأحدث أولاً).
 * @param {unknown[]} walletRows
 * @param {unknown[]} payoutRows
 */
export function mergeFinancialActivity(walletRows, payoutRows) {
  const w = (Array.isArray(walletRows) ? walletRows : [])
    .map(normalizeWalletTransaction)
    .filter(Boolean)
  const p = (Array.isArray(payoutRows) ? payoutRows : [])
    .map(normalizePayoutHistoryRow)
    .filter(Boolean)
  return [...w, ...p].sort((a, b) => toSortTime(b.date) - toSortTime(a.date))
}

export function payoutStatusLabelAr(status) {
  const s = String(status ?? "").toLowerCase()
  if (s.includes("pending")) return "قيد الانتظار"
  if (s.includes("approved")) return "معتمد"
  if (s.includes("rejected")) return "مرفوض"
  if (s.includes("completed")) return "مكتمل"
  return status ? String(status) : "—"
}
