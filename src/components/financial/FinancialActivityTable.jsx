import { formatCountEn, formatDateEn, formatDateTimeEn } from "../../utils/formatEn"
import { payoutStatusLabelAr } from "../../utils/financialActivity"

function walletTypeBadgeClass(rawType) {
  const s = String(rawType ?? "").toLowerCase()
  if (s.includes("credit")) return "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
  if (s.includes("debit")) return "bg-rose-50 text-rose-900 ring-rose-200/80"
  if (s.includes("refund")) return "bg-amber-50 text-amber-900 ring-amber-200/80"
  return "bg-slate-50 text-slate-800 ring-slate-200/80"
}

/**
 * جدول نشاط مالي موحّد (حركات محفظة + سحوبات).
 * @param {{ rows: Array<{ kind: string, id: string, amount: number, label: string, date: Date|null, meta?: object }>, emptyLabel?: string }} props
 */
export default function FinancialActivityTable({ rows, emptyLabel = "لا توجد بيانات" }) {
  if (!rows?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white/60 py-14 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]">
        <p className="text-sm font-medium text-slate-500">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_4px_24px_-8px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04]">
      <table className="w-full min-w-[800px] border-collapse text-[13px] leading-snug">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[16%]" />
          <col className="min-w-0" />
          <col className="w-[18%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-slate-50/70">
            <th
              scope="col"
              className="px-4 py-3.5 text-right text-xs font-semibold tracking-wide text-slate-600 sm:px-5"
            >
              التاريخ
            </th>
            <th scope="col" className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600 sm:px-5">
              النوع
            </th>
            <th scope="col" className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600 sm:px-5">
              التفاصيل
            </th>
            <th
              scope="col"
              className="px-4 py-3.5 text-end text-xs font-semibold tabular-nums text-slate-600 sm:px-5"
            >
              المبلغ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/90">
          {rows.map((row, i) => (
            <tr
              key={`${row.kind}-${row.id}`}
              className={[
                "transition-colors",
                i % 2 === 0 ? "bg-white/90" : "bg-slate-50/40",
                "hover:bg-emerald-50/50",
              ].join(" ")}
            >
              <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-slate-600 sm:px-5">
                {row.date instanceof Date && !Number.isNaN(row.date.getTime())
                  ? row.kind === "wallet"
                    ? formatDateTimeEn(row.date.toISOString())
                    : formatDateEn(row.date.toISOString())
                  : "—"}
              </td>
              <td className="px-4 py-3.5 sm:px-5">
                {row.kind === "wallet" ? (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${walletTypeBadgeClass(row.meta?.rawType)}`}
                  >
                    {row.label}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-900 ring-1 ring-sky-200/80">
                    سحب
                  </span>
                )}
              </td>
              <td className="min-w-[200px] px-4 py-3.5 text-slate-700 sm:min-w-[280px] sm:px-5">
                {row.kind === "payout" && row.meta?.status && (
                  <>
                    <span className="font-medium text-slate-800">طلب سحب</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {payoutStatusLabelAr(row.meta.status)}
                    </span>
                  </>
                )}
                {row.kind === "wallet" && (
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {row.meta?.orderId != null && (
                      <span className="text-sm text-slate-700">
                        حجز <span className="font-medium tabular-nums">#{row.meta.orderId}</span>
                      </span>
                    )}
                    {row.meta?.commissionRate != null && row.meta.commissionRate !== "" && (
                      <span className="text-xs text-slate-500">
                        عمولة:{" "}
                        {typeof row.meta.commissionRate === "number"
                          ? `${Math.round(Number(row.meta.commissionRate) * 1000) / 10}%`
                          : String(row.meta.commissionRate)}
                      </span>
                    )}
                    {row.meta?.orderId == null &&
                      (row.meta?.commissionRate == null || row.meta?.commissionRate === "") && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-end text-sm font-semibold tabular-nums text-slate-900 sm:px-5">
                {formatCountEn(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
