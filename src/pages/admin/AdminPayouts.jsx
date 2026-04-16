import { useState, useEffect, useCallback } from "react"
import api from "../../api/api"
import { fetchSuperAdminPayouts } from "../../api/adminFinance"
import { Button } from "../../components/ui/button"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Wallet, Check, Inbox, ListTree, RefreshCw, ChevronRight, ChevronLeft } from "lucide-react"
import { formatCountEn, formatDateTimeEn, formatMoneyEn } from "../../utils/formatEn"
import { MotionSection, MotionSurface, StaggerList, StaggerItem } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminIconBoxRound, adminTextMuted } from "../../lib/admin-ui"

const PAGE_SIZE = 50

const tabBtn = (active) =>
  [
    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-sky-600 text-white shadow-sm"
      : "bg-slate-100/90 text-slate-600 hover:bg-sky-50 hover:text-brand-navy",
  ].join(" ")

function pick(row, keys, fallback = "—") {
  if (!row || typeof row !== "object") return fallback
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      const v = row[k]
      if (v !== undefined && v !== null && v !== "") return v
    }
  }
  return fallback
}

function statusLabelAr(status) {
  if (status == null || status === "") return "—"
  const s = String(status).toLowerCase()
  if (s === "pending") return "معلقة"
  if (s === "approved") return "معتمد"
  if (s === "rejected") return "مرفوض"
  if (s === "processing" || s === "processed") return "قيد المعالجة"
  return String(status)
}

function statusBadgeClass(status) {
  const s = String(status ?? "").toLowerCase()
  if (s === "pending") return "bg-amber-50 text-amber-900 ring-amber-200/80"
  if (s === "approved") return "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
  if (s === "rejected") return "bg-rose-50 text-rose-900 ring-rose-200/80"
  return "bg-slate-50 text-slate-800 ring-slate-200/70"
}

export default function AdminPayouts() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [approvingId, setApprovingId] = useState(null)
  const [tab, setTab] = useState("pending")

  const [feed, setFeed] = useState([])
  const [feedTotal, setFeedTotal] = useState(0)
  const [feedSkip, setFeedSkip] = useState(0)
  const [feedStatus, setFeedStatus] = useState("")
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState("")

  const fetchPending = async () => {
    setLoading(true)
    setError("")
    try {
      const { data } = await api.get("/payouts/pending")
      setPending(Array.isArray(data) ? data : data?.items ?? data?.payouts ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل طلبات السحب")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    setFeedError("")
    try {
      const { items, totalCount } = await fetchSuperAdminPayouts({
        skip: feedSkip,
        take: PAGE_SIZE,
        status: feedStatus || undefined,
      })
      setFeed(Array.isArray(items) ? items : [])
      setFeedTotal(totalCount)
    } catch (err) {
      console.error(err)
      setFeedError(err.response?.data?.message ?? "تعذر تحميل سجل السحوبات")
      setFeed([])
      setFeedTotal(0)
    } finally {
      setFeedLoading(false)
    }
  }, [feedSkip, feedStatus])

  useEffect(() => {
    if (tab !== "feed") return
    loadFeed()
  }, [tab, loadFeed])

  const feedHasMore = feedSkip + PAGE_SIZE < feedTotal
  const feedHasPrev = feedSkip > 0
  const feedPages = Math.max(1, Math.ceil(feedTotal / PAGE_SIZE) || 1)
  const feedPageIdx = feedTotal === 0 ? 0 : Math.floor(feedSkip / PAGE_SIZE) + 1

  const handleApprove = async (id) => {
    setApprovingId(id)
    try {
      await api.post(`/payouts/approve/${id}`)
      setError("")
      await fetchPending()
      if (tab === "feed") await loadFeed()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر اعتماد السحب")
    } finally {
      setApprovingId(null)
    }
  }

  const handleFeedStatusChange = (value) => {
    setFeedStatus(value)
    setFeedSkip(0)
  }

  return (
    <div className="space-y-6">
      {error && <div className={adminPageError}>{error}</div>}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="عرض السحوبات">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "pending"}
            className={tabBtn(tab === "pending")}
            onClick={() => setTab("pending")}
          >
            <span className="inline-flex items-center gap-1.5">
              <Inbox className="size-4" />
              معلقة
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "feed"}
            className={tabBtn(tab === "feed")}
            onClick={() => setTab("feed")}
          >
            <span className="inline-flex items-center gap-1.5">
              <ListTree className="size-4" />
              سجل
            </span>
          </button>
        </div>
      </div>

      {tab === "pending" && (
        <>
          {loading ? (
            <AdminCardsSkeleton count={8} gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
          ) : pending.length === 0 ? (
            <MotionSurface>
              <Card className={adminCardClass}>
                <CardContent className={`py-12 text-center ${adminTextMuted}`}>لا توجد طلبات سحب معلقة</CardContent>
              </Card>
            </MotionSurface>
          ) : (
            <MotionSection delay={0.05} aria-label="قائمة السحوبات المعلقة">
              <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pending.map((p) => (
                  <StaggerItem key={p.id}>
                    <MotionSurface>
                      <Card className={adminCardClass}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <div className={adminIconBoxRound}>
                              <Wallet className="size-5" strokeWidth={1.75} />
                            </div>
                            <div>
                              <CardTitle className="text-base font-semibold text-brand-navy">
                                {p.organizationName ?? p.orgName ?? `طلب #${p.id}`}
                              </CardTitle>
                              <CardDescription className="text-slate-600">
                                {p.amount != null ? formatMoneyEn(p.amount, "") : "—"}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className={`space-y-1 text-sm ${adminTextMuted}`}>
                            {p.bankAccount && <p>الحساب: {p.bankAccount}</p>}
                            {p.notes && <p>{p.notes}</p>}
                          </div>
                          <Button
                            className={`mt-4 w-full ${adminBtnPrimary}`}
                            onClick={() => handleApprove(p.id)}
                            disabled={approvingId != null}
                          >
                            {approvingId === p.id ? "جاري الاعتماد..." : "اعتماد السحب"}
                            <Check className="ms-2 size-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </MotionSurface>
                  </StaggerItem>
                ))}
              </StaggerList>
            </MotionSection>
          )}
        </>
      )}

      {tab === "feed" && (
        <Card className={adminCardClass}>
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100/90 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-brand-navy">سجل السحوبات</CardTitle>
              <CardDescription className="text-[13px] leading-relaxed text-slate-600">
                سجل شامل لجميع طلبات السحب على المنصة. صفِّ النتائج حسب حالة الطلب، وانتقل بين الصفحات لعرض المزيد.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-payout-status" className="text-xs text-slate-600">
                  حالة الطلب
                </Label>
                <select
                  id="admin-payout-status"
                  className="h-10 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none ring-1 ring-slate-900/[0.04] focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  value={feedStatus}
                  onChange={(e) => handleFeedStatusChange(e.target.value)}
                  disabled={feedLoading}
                >
                  <option value="">الكل</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 gap-2 rounded-xl"
                disabled={feedLoading}
                onClick={() => loadFeed()}
              >
                <RefreshCw className={`size-4 ${feedLoading ? "animate-spin" : ""}`} aria-hidden />
                تحديث
              </Button>
            </div>
            <div className="w-full text-xs text-slate-500 sm:text-end">
              <span className="tabular-nums">
                {formatCountEn(feedTotal)} طلب · صفحة {formatCountEn(feedPageIdx)} من {formatCountEn(feedPages)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {feedLoading ? (
              <p className={`py-10 text-center text-sm ${adminTextMuted}`}>جاري التحميل…</p>
            ) : feedError ? (
              <p className="py-10 text-center text-sm text-rose-600">{feedError}</p>
            ) : feed.length === 0 ? (
              <p className={`py-10 text-center text-sm ${adminTextMuted}`}>لا توجد سجلات في هذه الصفحة.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse text-right text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2.5 sm:px-4">#</th>
                        <th className="px-3 py-2.5 sm:px-4">المنظمة</th>
                        <th className="px-3 py-2.5 sm:px-4">المبلغ</th>
                        <th className="px-3 py-2.5 sm:px-4">الحالة</th>
                        <th className="px-3 py-2.5 sm:px-4">مرجع المعاملة</th>
                        <th className="px-3 py-2.5 sm:px-4">طُلب في</th>
                        <th className="px-3 py-2.5 sm:px-4">عُالج في</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feed.map((row, idx) => {
                        const id = pick(row, ["id", "Id"], null)
                        const orgName = pick(row, ["organizationName", "OrganizationName"], "—")
                        const orgId = pick(row, ["organizationId", "OrganizationId"], null)
                        const amount = pick(row, ["amount", "Amount"], null)
                        const status = pick(row, ["status", "Status"], "—")
                        const ref = pick(row, ["transactionReference", "TransactionReference"], "—")
                        const reqAt = pick(row, ["requestedAt", "RequestedAt"], null)
                        const procAt = pick(row, ["processedAt", "ProcessedAt"], null)
                        return (
                          <tr key={id ?? idx} className="border-b border-slate-100/90 hover:bg-sky-50/30">
                            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium text-brand-navy sm:px-4">
                              {id != null ? formatCountEn(id) : "—"}
                            </td>
                            <td className="max-w-[220px] px-3 py-2.5 sm:px-4">
                              <div className="font-medium text-slate-900">{orgName}</div>
                              {orgId != null && (
                                <div className="text-[10px] text-slate-400 tabular-nums">منظمة #{formatCountEn(orgId)}</div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-800 sm:px-4">
                              {amount != null && amount !== "—" ? formatMoneyEn(amount, "") : "—"}
                            </td>
                            <td className="px-3 py-2.5 sm:px-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${statusBadgeClass(status)}`}
                              >
                                {statusLabelAr(status)}
                              </span>
                            </td>
                            <td className="max-w-[160px] break-all px-3 py-2.5 font-mono text-xs text-slate-700 sm:px-4">
                              {ref !== "—" ? String(ref) : "—"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600 sm:px-4">
                              {reqAt && reqAt !== "—" ? formatDateTimeEn(reqAt) : "—"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600 sm:px-4">
                              {procAt && procAt !== "—" ? formatDateTimeEn(procAt) : "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100/90 px-4 py-3">
                  <span className={`text-xs ${adminTextMuted}`}>
                    عرض {formatCountEn(feedSkip + 1)}–{formatCountEn(Math.min(feedSkip + PAGE_SIZE, feedTotal))} من{" "}
                    {formatCountEn(feedTotal)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      disabled={!feedHasPrev || feedLoading}
                      onClick={() => setFeedSkip((s) => Math.max(0, s - PAGE_SIZE))}
                    >
                      <ChevronRight className="size-4" />
                      السابق
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      disabled={!feedHasMore || feedLoading}
                      onClick={() => setFeedSkip((s) => s + PAGE_SIZE)}
                    >
                      التالي
                      <ChevronLeft className="size-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
