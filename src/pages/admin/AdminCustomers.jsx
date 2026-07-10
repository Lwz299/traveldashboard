import { useCallback, useEffect, useState } from "react"
import {
  fetchAdminCustomers,
  fetchAdminCustomer,
  patchCustomerStatus,
  revokeCustomerSessions,
  normalizeAdminCustomer,
} from "../../api/adminCustomers"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import {
  Users,
  Search,
  RefreshCw,
  Ban,
  Check,
  KeyRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { formatCountEn, formatDateTimeEn } from "../../utils/formatEn"
import { MotionSurface } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminTextMuted } from "../../lib/admin-ui"

const PAGE_SIZE = 20

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionId, setActionId] = useState(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const { items, totalCount: total } = await fetchAdminCustomers({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
      })
      setCustomers(items)
      setTotalCount(total)
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل العملاء")
      setCustomers([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, search, activeFilter])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const openDetail = async (id) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const row = await fetchAdminCustomer(id)
      setDetail(normalizeAdminCustomer(row) ?? row)
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل تفاصيل العميل")
    } finally {
      setDetailLoading(false)
    }
  }

  const runAction = async (id, fn) => {
    setActionId(id)
    setError("")
    try {
      await fn()
      await loadCustomers()
      if (detail && String(detail.id) === String(id)) {
        await openDetail(id)
      }
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تنفيذ الإجراء")
    } finally {
      setActionId(null)
    }
  }

  const handleToggleStatus = (customer) => {
    const nextActive = !customer.isActive
    const reason = nextActive
      ? ""
      : prompt("سبب التعطيل (اختياري):") ?? ""
    if (!nextActive && reason === null) return
    const msg = nextActive
      ? "تفعيل هذا الحساب؟"
      : "تعطيل الحساب؟ لن يستطيع العميل تسجيل الدخول."
    if (!confirm(msg)) return
    runAction(customer.id, () =>
      patchCustomerStatus(customer.id, { isActive: nextActive, reason: reason || undefined })
    )
  }

  const handleRevokeSessions = (customer) => {
    if (!confirm("إلغاء كل جلسات هذا العميل؟")) return
    runAction(customer.id, () => revokeCustomerSessions(customer.id))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">إدارة العملاء</h1>
        <p className={`mt-1 text-sm ${adminTextMuted}`}>
          بحث وتعطيل حسابات العملاء وإلغاء الجلسات
        </p>
      </div>

      {error && <div className={adminPageError}>{error}</div>}

      <Card className={adminCardClass}>
        <CardHeader className="pb-3">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label>بحث</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="بريد، اسم، هاتف…"
                  className="h-11 rounded-xl pe-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <select
                className="h-11 rounded-xl border border-slate-200/90 bg-white px-3 text-sm"
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">الكل</option>
                <option value="true">نشط</option>
                <option value="false">معطّل</option>
              </select>
            </div>
            <Button type="submit" className={`h-11 rounded-xl ${adminBtnPrimary}`}>
              بحث
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={loading}
              onClick={() => loadCustomers()}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {loading && customers.length === 0 ? (
            <AdminCardsSkeleton count={6} gridClassName="grid gap-4 p-4 sm:grid-cols-2" />
          ) : customers.length === 0 ? (
            <p className={`px-6 py-14 text-center text-sm ${adminTextMuted}`}>لا يوجد عملاء</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3 text-right">العميل</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">بوستات</th>
                    <th className="px-4 py-3 text-right">حجوزات</th>
                    <th className="px-4 py-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => {
                    const row = normalizeAdminCustomer(c)
                    const busy = actionId === row.id
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-right hover:underline"
                            onClick={() => openDetail(row.id)}
                          >
                            <span className="block font-medium text-brand-navy">
                              {row.fullName || `عميل #${row.id}`}
                            </span>
                            <span className="block text-xs text-slate-500">{row.email || row.phone || "—"}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                              row.isActive
                                ? "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
                                : "bg-rose-50 text-rose-900 ring-rose-200/80"
                            }`}
                          >
                            {row.isActive ? "نشط" : "معطّل"}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {row.postsCount != null ? formatCountEn(row.postsCount) : "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {row.tripsBooked != null ? formatCountEn(row.tripsBooked) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              disabled={busy}
                              onClick={() => handleToggleStatus(row)}
                            >
                              {row.isActive ? (
                                <>
                                  <Ban className="size-3.5" />
                                  تعطيل
                                </>
                              ) : (
                                <>
                                  <Check className="size-3.5" />
                                  تفعيل
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              disabled={busy}
                              onClick={() => handleRevokeSessions(row)}
                            >
                              <KeyRound className="size-3.5" />
                              إلغاء الجلسات
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-3">
              <span className="text-xs text-slate-500">صفحة {page} من {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(detail || detailLoading) && (
        <MotionSurface>
          <Card className={adminCardClass}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-brand-navy">
                <Users className="size-5" />
                تفاصيل العميل
              </CardTitle>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setDetail(null)}>
                إغلاق
              </Button>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <p className="text-sm text-slate-500">جاري التحميل…</p>
              ) : detail ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">الاسم</dt>
                    <dd className="font-medium text-slate-900">{detail.fullName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">البريد</dt>
                    <dd className="font-medium text-slate-900">{detail.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">الهاتف</dt>
                    <dd className="font-medium text-slate-900">{detail.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">تاريخ التسجيل</dt>
                    <dd className="font-medium text-slate-900">
                      {detail.createdAt ? formatDateTimeEn(String(detail.createdAt)) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">معرّف الحساب</dt>
                    <dd className="font-mono text-xs font-medium text-slate-900">
                      {detail.applicationUserId ?? detail.id ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">آخر دخول</dt>
                    <dd className="font-medium text-slate-900">
                      {detail.lastLoginAt ? formatDateTimeEn(String(detail.lastLoginAt)) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">عدد البوستات</dt>
                    <dd className="font-medium tabular-nums text-slate-900">
                      {detail.postsCount != null ? formatCountEn(detail.postsCount) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">حجوزات الرحلات</dt>
                    <dd className="font-medium tabular-nums text-slate-900">
                      {detail.tripsBooked != null ? formatCountEn(detail.tripsBooked) : "—"}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </CardContent>
          </Card>
        </MotionSurface>
      )}
    </div>
  )
}
