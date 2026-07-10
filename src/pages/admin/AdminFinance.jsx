import { useState, useEffect, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  fetchPlatformWallet,
  fetchPlatformWalletTransactions,
  fetchOrganizationsFinancialOverview,
  putOrganizationCommissionRate,
} from "../../api/adminFinance"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import {
  Landmark,
  ArrowDownLeft,
  Building2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Pencil,
  BarChart3,
  Inbox,
} from "lucide-react"
import { formatCountEn, formatDateTimeEn, formatMoneyEn } from "../../utils/formatEn"
import { MotionSection, MotionSurface } from "../../components/motion"
import { AdminCardsSkeleton, AdminTableSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminTextMuted, adminIconBoxRound } from "../../lib/admin-ui"

const TX_PAGE = 25

function pick(obj, keys, fallback = undefined) {
  if (!obj || typeof obj !== "object") return fallback
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k]
      if (v !== undefined && v !== null) return v
    }
  }
  return fallback
}

function orgIdFromRow(row) {
  return pick(row, ["organizationId", "OrganizationId", "id", "Id"])
}

function orgNameFromRow(row) {
  return pick(row, ["name", "Name", "organizationName", "OrganizationName"]) ?? "—"
}

function formatRatePercent01(rate) {
  const n = Number(rate)
  if (!Number.isFinite(n)) return "—"
  if (n >= 0 && n <= 1) return `${(n * 100).toFixed(2).replace(/\.?0+$/, "")}٪`
  return `${n}٪`
}

export default function AdminFinance() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [wallet, setWallet] = useState(null)
  const [overview, setOverview] = useState([])
  const [txRows, setTxRows] = useState([])
  const [txTotal, setTxTotal] = useState(0)
  const [txSkip, setTxSkip] = useState(0)
  const [txLoading, setTxLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [editingOrgId, setEditingOrgId] = useState(null)
  const [editRateStr, setEditRateStr] = useState("")
  const [savingOrgId, setSavingOrgId] = useState(null)

  const loadCore = useCallback(async () => {
    setError("")
    const [w, ov] = await Promise.allSettled([
      fetchPlatformWallet(),
      fetchOrganizationsFinancialOverview(),
    ])
    if (w.status === "fulfilled") setWallet(w.value)
    else setWallet(null)
    if (ov.status === "fulfilled") setOverview(Array.isArray(ov.value) ? ov.value : [])
    else setOverview([])
    const failed = [w, ov].filter((s) => s.status === "rejected")
    if (failed.length === 2) {
      const r = failed[0].reason
      setError(r?.response?.data?.message ?? "تعذر تحميل بيانات المالية")
    }
  }, [])

  const loadTransactions = useCallback(async (skip) => {
    setTxLoading(true)
    try {
      const { items, totalCount, skip: sOut } = await fetchPlatformWalletTransactions({
        skip,
        take: TX_PAGE,
      })
      setTxRows(items)
      setTxTotal(totalCount)
      setTxSkip(sOut)
    } catch (err) {
      console.error(err)
      setTxRows([])
      setTxTotal(0)
    } finally {
      setTxLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await loadCore()
      if (!cancelled) await loadTransactions(0)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadCore, loadTransactions])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError("")
    try {
      await loadCore()
      await loadTransactions(txSkip)
    } finally {
      setRefreshing(false)
    }
  }

  const balance = pick(wallet, ["balance", "Balance"])
  const lastUpdated = pick(wallet, ["lastUpdated", "LastUpdated"])
  const sumTx = pick(wallet, ["sumOfTransactions", "SumOfTransactions"])

  const txHasMore = txSkip + TX_PAGE < txTotal
  const txHasPrev = txSkip > 0
  const txPages = Math.max(1, Math.ceil(txTotal / TX_PAGE) || 1)
  const txPageIdx = txTotal === 0 ? 0 : Math.floor(txSkip / TX_PAGE) + 1

  const startEdit = (row) => {
    const id = orgIdFromRow(row)
    if (id == null) return
    const r = Number(pick(row, ["commissionRate", "CommissionRate"]))
    setEditingOrgId(id)
    setEditRateStr(Number.isFinite(r) ? String(r) : "")
  }

  const cancelEdit = () => {
    setEditingOrgId(null)
    setEditRateStr("")
  }

  const saveCommission = async (organizationId) => {
    const n = parseFloat(editRateStr)
    if (!Number.isFinite(n) || n < 0 || n > 1) {
      setError("أدخل نسبة عمولة بين 0 و 1 (مثلاً 0.03 لـ 3٪).")
      return
    }
    setSavingOrgId(organizationId)
    setError("")
    try {
      await putOrganizationCommissionRate(organizationId, n)
      cancelEdit()
      await loadCore()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر حفظ نسبة العمولة")
    } finally {
      setSavingOrgId(null)
    }
  }

  const overviewSorted = useMemo(() => {
    const copy = [...(overview ?? [])]
    copy.sort((a, b) => String(orgNameFromRow(a)).localeCompare(String(orgNameFromRow(b)), "ar"))
    return copy
  }, [overview])

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminCardsSkeleton count={2} gridClassName="grid gap-4 sm:grid-cols-2" />
        <AdminTableSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">المالية</h1>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-2"
          disabled={refreshing}
          onClick={handleRefresh}
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          تحديث
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" asChild>
          <Link to="/admin/payouts">
            <Inbox className="size-4" aria-hidden />
            طلبات السحب
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" asChild>
          <Link to="/admin/reports">
            <BarChart3 className="size-4" aria-hidden />
            التقارير
          </Link>
        </Button>
      </div>

      {error && <div className={adminPageError}>{error}</div>}

      <MotionSection delay={0.04} aria-label="محفظة المنصة">
        <MotionSurface>
          <Card className={`${adminCardClass} overflow-hidden`} role="region" aria-label="محفظة المنصة">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100/90 pb-3">
                <div className={adminIconBoxRound} aria-hidden>
                  <Landmark className="size-5 text-sky-700" strokeWidth={1.75} />
                </div>
                <span className="text-sm font-semibold text-brand-navy">محفظة المنصة</span>
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
                تتراكم عمولات الحجوزات المؤكدة (<span className="font-mono text-[10px]">platformFee</span>) هنا بعد دفع العميل من التطبيق.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-sky-100/80 bg-sky-50/40 px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">الرصيد</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">
                    {formatMoneyEn(balance, "")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">مجموع الحركات</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">
                    {formatMoneyEn(sumTx, "")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">آخر تحديث</p>
                  <p className="mt-1 text-sm font-medium tabular-nums text-slate-700">
                    {lastUpdated ? formatDateTimeEn(lastUpdated) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionSurface>
      </MotionSection>

      <MotionSection delay={0.06} aria-label="حركات العمولة">
        <Card className={adminCardClass}>
          <CardHeader className="flex flex-col gap-2 border-b border-slate-100/90 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="size-5 text-sky-600" strokeWidth={1.75} aria-hidden />
              <CardTitle className="text-base font-semibold text-brand-navy">حركات العمولة</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="tabular-nums">
                {formatCountEn(txTotal)} حركة · صفحة {formatCountEn(txPageIdx)} من {formatCountEn(txPages)}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  disabled={!txHasPrev || txLoading}
                  onClick={() => loadTransactions(Math.max(0, txSkip - TX_PAGE))}
                >
                  <ChevronRight className="size-4" />
                  السابق
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  disabled={!txHasMore || txLoading}
                  onClick={() => loadTransactions(txSkip + TX_PAGE)}
                >
                  التالي
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">جاري التحميل…</div>
            ) : txRows.length === 0 ? (
              <p className={`px-4 py-8 text-center text-sm ${adminTextMuted}`}>لا توجد حركات أو المسار غير متاح.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] border-collapse text-right text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2.5">التاريخ</th>
                      <th className="px-3 py-2.5">المنظمة</th>
                      <th className="px-3 py-2.5">المبلغ</th>
                      <th className="px-3 py-2.5">النوع</th>
                      <th className="px-3 py-2.5">العمولة</th>
                      <th className="px-3 py-2.5">طلب / بند</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txRows.map((row, idx) => {
                      const amt = pick(row, ["amount", "Amount", "value", "Value"])
                      const typ = pick(row, ["type", "Type", "transactionType", "TransactionType"])
                      const cr = pick(row, ["commissionRate", "CommissionRate"])
                      const oid = pick(row, ["orderId", "OrderId"])
                      const oiid = pick(row, ["orderItemId", "OrderItemId"])
                      const orgId = pick(row, ["organizationId", "OrganizationId"])
                      const orgName = pick(row, ["organizationName", "OrganizationName", "organization", "Organization"])
                      const when = pick(row, ["createdAt", "CreatedAt", "date", "Date", "timestampUtc"])
                      return (
                        <tr key={`${orgId}-${idx}`} className="border-b border-slate-100/90 hover:bg-sky-50/30">
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700">
                            {when ? formatDateTimeEn(when) : "—"}
                          </td>
                          <td className="max-w-[200px] px-3 py-2.5">
                            <div className="font-medium text-slate-900">{orgName ?? "—"}</div>
                            {orgId != null && (
                              <div className="text-[10px] text-slate-400 tabular-nums">#{formatCountEn(orgId)}</div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium text-slate-800">
                            {formatMoneyEn(amt, "")}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{typ != null ? String(typ) : "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700">
                            {formatRatePercent01(cr)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                            {oid != null && <span>طلب {formatCountEn(oid)} </span>}
                            {oiid != null && <span>· بند {formatCountEn(oiid)}</span>}
                            {oid == null && oiid == null && "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.08} aria-label="ملخص الشركات">
        <Card className={adminCardClass}>
          <CardHeader className="flex flex-row flex-wrap items-center gap-3 border-b border-slate-100/90">
            <div className={adminIconBoxRound}>
              <Building2 className="size-5 text-sky-700" strokeWidth={1.75} />
            </div>
            <CardTitle className="text-base font-semibold text-brand-navy">ملخص الشركات</CardTitle>
            <p className="w-full text-[11px] leading-relaxed text-slate-500 sm:mr-auto sm:max-w-xl">
              عمولة «المبيعات» تُجمَع من حقل <span className="font-mono text-[10px]">platformFee</span> في الحجوزات المؤكدة — يجب أن تتوافق مع محفظة المنصة.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {overviewSorted.length === 0 ? (
              <p className={`px-4 py-8 text-center text-sm ${adminTextMuted}`}>لا توجد بيانات أو المسار غير متاح.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-right text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="sticky right-0 z-10 bg-slate-50/95 px-3 py-2.5">الشركة</th>
                      <th className="px-3 py-2.5">نسبة المنصة</th>
                      <th className="px-3 py-2.5">رصيد المحفظة</th>
                      <th className="px-3 py-2.5">إجمالي مبيعات</th>
                      <th className="px-3 py-2.5">عمولة المنصة (مبيعات)</th>
                      <th className="px-3 py-2.5">صافي المنظمة</th>
                      <th className="px-3 py-2.5">عمولة الماركت (مسجّلة)</th>
                      <th className="px-3 py-2.5 w-[140px]">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewSorted.map((row, idx) => {
                      const id = orgIdFromRow(row)
                      const name = orgNameFromRow(row)
                      const cr = pick(row, ["commissionRate", "CommissionRate"])
                      const wb = pick(row, ["walletBalance", "WalletBalance"])
                      const gr = pick(row, ["grossRevenue", "GrossRevenue"])
                      const tpc = pick(row, ["totalPlatformCommissionFromSales", "TotalPlatformCommissionFromSales"])
                      const onet = pick(row, ["organizerNetFromSales", "OrganizerNetFromSales"])
                      const mp = pick(row, ["marketplacePlatformFeeAccrued", "MarketplacePlatformFeeAccrued"])
                      const isEditing = id != null && editingOrgId === id
                      return (
                        <tr key={id ?? idx} className="border-b border-slate-100/90 hover:bg-sky-50/25">
                          <td className="sticky right-0 z-[1] bg-white/95 px-3 py-2.5 font-medium text-brand-navy shadow-[0_0_0_1px_rgba(226,232,240,0.6)]">
                            {name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                            {isEditing ? (
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                <Input
                                  className="h-9 w-28 rounded-lg text-xs tabular-nums"
                                  value={editRateStr}
                                  onChange={(e) => setEditRateStr(e.target.value)}
                                  placeholder="0.03"
                                  inputMode="decimal"
                                />
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 rounded-lg text-xs"
                                    disabled={savingOrgId === id}
                                    onClick={() => saveCommission(id)}
                                  >
                                    {savingOrgId === id ? "…" : "حفظ"}
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={cancelEdit}>
                                    إلغاء
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              formatRatePercent01(cr)
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatMoneyEn(wb, "")}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatMoneyEn(gr, "")}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatMoneyEn(tpc, "")}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium text-emerald-800">
                            {formatMoneyEn(onet, "")}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700">{formatMoneyEn(mp, "")}</td>
                          <td className="px-3 py-2.5">
                            {id != null && !isEditing && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 rounded-lg text-xs"
                                onClick={() => startEdit(row)}
                              >
                                <Pencil className="size-3" aria-hidden />
                                تعديل النسبة
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionSection>
    </div>
  )
}
