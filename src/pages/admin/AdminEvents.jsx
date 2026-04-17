import { useEffect, useState, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import api from "../../api/api"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import {
  Pencil,
  Trash2,
  Eye,
  XCircle,
  Search,
  RotateCcw,
  Plus,
  Image as ImageIcon,
  ImagePlus,
  Star,
} from "lucide-react"
import { formatDateEn, formatCountEn, formatMoneyEn } from "../../utils/formatEn"
import {
  eventLocation,
  eventPrice,
  eventBookingsCount,
  eventStartDate,
  eventOrganizationName,
  statusBadgeClass,
  statusLabelAr,
  eventFiltersInitial,
  eventPrimaryImageUrl,
  eventImagesArray,
} from "../../utils/eventDisplay"
import { uploadEventImages } from "../../api/eventImages"
import { normalizeEventPerformance } from "../../utils/reportPayload"
import { eventIdFromCreateResponse } from "../../utils/createEventPayload"
import { useAuth } from "../../context/AuthContext"
import { MotionSection, MotionSurface } from "../../components/motion"
import { AdminEventsPageSkeleton } from "../../components/motion/AdminSkeletons"
import {
  adminListCardClass,
  adminPageError,
  adminBtnPrimary,
  adminModalBackdrop,
  adminCardClassStatic,
  adminTextMuted,
} from "../../lib/admin-ui"

const btnAction =
  "transition-all duration-200 ease-out active:scale-[0.97] hover:shadow-sm"

/** دمج عدد الحجوزات من كائن الفعالية أو من تقرير الأداء */
function resolveBookingsCount(ev, reportBookings) {
  const direct = eventBookingsCount(ev)
  if (direct != null) return direct
  const id = ev?.id != null ? String(ev.id) : null
  if (id != null && reportBookings[id] != null) return reportBookings[id]
  return null
}

function orgRowId(org) {
  return org?.id ?? org?.organizationId ?? org?.Id ?? org?.OrganizationId
}

function orgRowName(org) {
  return (
    org?.organizationName ??
    org?.OrganizationName ??
    org?.name ??
    org?.Name ??
    "—"
  )
}

export default function AdminEvents() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = Boolean(user?.isSuperAdmin)
  const [searchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState(eventFiltersInitial)
  const [modal, setModal] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    organizationId: "",
    categoryId: "",
    capacity: "100",
    price: "",
    bookingDeadline: "",
  })
  /** map eventId → ticketsSold من GET /reports/event-performance/:id */
  const [reportBookings, setReportBookings] = useState({})

  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true)
    setError("")
    try {
      const { data } = await api.get("/events")
      setEvents(Array.isArray(data) ? data : data?.items ?? data?.events ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل الفعاليات")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(false)
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganizations([])
      return
    }
    let cancelled = false
    api
      .get("/organizations")
      .then((r) => {
        const d = r.data
        const list = Array.isArray(d) ? d : d?.items ?? d?.organizations ?? []
        if (!cancelled) setOrganizations(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setOrganizations([])
      })
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  useEffect(() => {
    api
      .get("/categories")
      .then((r) => {
        const d = r.data
        setCategories(Array.isArray(d) ? d : d?.items ?? [])
      })
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (events.length === 0) {
      setReportBookings({})
      return
    }
    let cancelled = false
    const ids = events.map((e) => e.id).filter((id) => id != null)
    Promise.all(
      ids.map(async (id) => {
        try {
          const { data } = await api.get(`/reports/event-performance/${id}`)
          const n = normalizeEventPerformance(data)
          const sold = n?.ticketsSold
          return {
            id: String(id),
            sold: sold != null && Number.isFinite(Number(sold)) ? Number(sold) : null,
          }
        } catch {
          return { id: String(id), sold: null }
        }
      })
    ).then((rows) => {
      if (cancelled) return
      const next = {}
      for (const { id, sold } of rows) {
        if (sold != null) next[id] = sold
      }
      setReportBookings(next)
    })
    return () => {
      cancelled = true
    }
  }, [events])

  const [pendingImages, setPendingImages] = useState([])
  const [pendingCoverIndex, setPendingCoverIndex] = useState(0)
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    const editId = searchParams.get("edit")
    if (!editId || loading || events.length === 0) return
    const ev = events.find((e) => String(e.id) === String(editId))
    if (ev) {
      navigate(`/admin/events/${editId}`, { replace: true })
    }
  }, [searchParams, events, loading, navigate])

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = filters.search.trim().toLowerCase()
      if (q) {
        const title = (ev.title ?? ev.name ?? "").toLowerCase()
        const desc = (ev.description ?? "").toLowerCase()
        const loc = (eventLocation(ev) ?? "").toLowerCase()
        const org = (eventOrganizationName(ev) ?? "").toLowerCase()
        if (!title.includes(q) && !desc.includes(q) && !loc.includes(q) && !org.includes(q)) return false
      }
      if (filters.status !== "all") {
        const st = (ev.status || "Draft").toString()
        if (st !== filters.status) return false
      }
      if (filters.dateFrom) {
        const d = eventStartDate(ev)
        const from = new Date(filters.dateFrom)
        from.setHours(0, 0, 0, 0)
        if (!d || d < from) return false
      }
      if (filters.dateTo) {
        const d = eventStartDate(ev)
        const to = new Date(filters.dateTo)
        to.setHours(23, 59, 59, 999)
        if (!d || d > to) return false
      }
      return true
    })
  }, [events, filters])

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== ""

  const resetFilters = () => setFilters(eventFiltersInitial)

  const openCreate = () => {
    setModal("create")
    setForm({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      organizationId: "",
      categoryId: "",
      capacity: "100",
      price: "",
      bookingDeadline: "",
    })
    setPendingImages([])
    setPendingCoverIndex(0)
    setError("")
  }

  const onPickImages = (e) => {
    const files = Array.from(e.target.files ?? []).filter(Boolean)
    setPendingImages(files)
    setPendingCoverIndex(0)
  }

  /** @returns {Record<string, unknown>} جسم POST /events — يتضمن organizationId للسوبر أدمن فقط */
  const buildPayload = () => {
    const loc = form.location?.trim() || undefined
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      location: loc,
      locationName: loc,
    }
    if (isSuperAdmin) {
      const oid = Number(form.organizationId)
      if (!Number.isFinite(oid) || oid <= 0) {
        throw new Error("اختر المنظمة المالكة للفعالية")
      }
      payload.organizationId = oid
    }
    if (form.categoryId !== "" && form.categoryId != null) {
      const cid = Number(form.categoryId)
      if (Number.isFinite(cid) && cid > 0) payload.categoryId = cid
    }
    const cap = Number(form.capacity)
    if (Number.isFinite(cap) && cap > 0) payload.capacity = Math.floor(cap)
    if (form.price !== "" && form.price != null) {
      const pr = Number(form.price)
      if (Number.isFinite(pr) && pr >= 0) payload.price = pr
    }
    if (form.bookingDeadline?.trim()) {
      payload.bookingDeadline = new Date(form.bookingDeadline).toISOString()
    }
    return payload
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (modal !== "create") return
    setError("")
    setSubmitLoading(true)
    try {
      let payload
      try {
        payload = buildPayload()
      } catch (validationErr) {
        setError(validationErr.message ?? "تحقق من الحقول")
        setSubmitLoading(false)
        return
      }
      const { data } = await api.post("/events", payload)
      const newId = eventIdFromCreateResponse(data)
      if (newId != null && pendingImages.length > 0) {
        await uploadEventImages(newId, pendingImages, pendingCoverIndex)
      }
      setModal(null)
      setPendingImages([])
      setPendingCoverIndex(0)
      fetchEvents(true)
    } catch (err) {
      setError(err.response?.data?.message ?? "حدث خطأ")
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateStatus = async (e, id, status) => {
    e.stopPropagation()
    setError("")
    try {
      await api.patch(`/events/${id}/status`, { status })
      fetchEvents(true)
    } catch (err) {
      setError(err.response?.data?.message ?? "حدث خطأ")
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm("هل أنت متأكد من حذف هذه الفعالية؟")) return
    setError("")
    try {
      await api.delete(`/events/${id}`)
      fetchEvents(true)
    } catch (err) {
      setError(err.response?.data?.message ?? "حدث خطأ")
    }
  }

  const handleEditClick = (e, ev) => {
    e.stopPropagation()
    navigate(`/admin/events/${ev.id}`)
  }

  const selectInputClass =
    "flex h-11 min-w-0 shrink-0 rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-400/40 sm:w-[140px] lg:w-[150px]"

  const dateInputClass =
    "h-11 min-w-0 shrink-0 rounded-xl border border-slate-200/90 bg-white px-3 text-sm shadow-sm sm:w-[145px]"

  if (loading) {
    return <AdminEventsPageSkeleton />
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {error && !modal && <div className={adminPageError}>{error}</div>}

      <MotionSection delay={0.02}>
        <Card className={adminListCardClass}>
          <CardHeader className="border-b border-slate-200/80 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-lg font-semibold text-brand-navy">البحث والمرشحات</CardTitle>
              <Button type="button" onClick={openCreate} className={`h-11 shrink-0 gap-2 px-5 ${adminBtnPrimary}`}>
                <Plus className="size-4" strokeWidth={2} />
                إنشاء فعالية
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="flex w-full flex-col gap-3 xl:flex-row xl:flex-nowrap xl:items-center xl:gap-3">
              <div className="relative min-w-0 flex-1 xl:min-w-[200px]">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="بحث: عنوان، وصف، موقع، شركة…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200/90 bg-white pr-10 shadow-sm"
                  aria-label="بحث"
                />
              </div>
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-3 xl:w-auto xl:flex-nowrap xl:justify-end">
                <select
                  className={selectInputClass}
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                  aria-label="الحالة"
                >
                  <option value="all">كل الحالات</option>
                  <option value="Published">منشور</option>
                  <option value="Draft">مسودة</option>
                  <option value="Cancelled">ملغى</option>
                </select>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="hidden text-xs text-slate-500 sm:inline">من</span>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    className={dateInputClass}
                    aria-label="من تاريخ"
                  />
                  <span className="hidden text-xs text-slate-500 sm:inline">إلى</span>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    className={dateInputClass}
                    aria-label="إلى تاريخ"
                  />
                </div>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0 rounded-xl border-slate-200/90 bg-white hover:bg-slate-50"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="ms-1 size-4" />
                    إعادة التعيين
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              عرض <span className="font-semibold tabular-nums text-slate-700">{filteredEvents.length}</span> من{" "}
              <span className="tabular-nums">{events.length}</span> فعالية — اضغط على صف لعرض التفاصيل الكاملة.
            </p>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.05}>
        {events.length === 0 ? (
          <Card className={adminListCardClass}>
            <CardContent className={`py-16 text-center ${adminTextMuted}`}>
              <p className="text-sm">لا توجد فعاليات بعد.</p>
              <Button type="button" onClick={openCreate} className={`mt-4 ${adminBtnPrimary}`}>
                <Plus className="ms-2 size-4" />
                إنشاء فعالية
              </Button>
            </CardContent>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card className={adminListCardClass}>
            <CardContent className="py-14 text-center">
              <p className={`text-sm ${adminTextMuted}`}>لا توجد نتائج تطابق المرشحات.</p>
              <Button type="button" variant="link" className="mt-2 text-sky-700" onClick={resetFilters}>
                مسح المرشحات
              </Button>
            </CardContent>
          </Card>
        ) : (
          <MotionSurface>
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-right text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-slate-50/70">
                      <th className="w-20 px-3 py-3.5 text-xs font-semibold text-slate-600">صورة</th>
                      <th className="min-w-[200px] px-4 py-3.5 text-xs font-semibold text-slate-600">الفعالية</th>
                      <th className="min-w-[160px] px-4 py-3.5 text-xs font-semibold text-slate-600">الشركة / المنظمة</th>
                      <th className="w-28 px-4 py-3.5 text-center text-xs font-semibold tabular-nums text-slate-600">
                        الحجوزات
                      </th>
                      <th className="min-w-[120px] px-4 py-3.5 text-xs font-semibold text-slate-600">الموقع</th>
                      <th className="w-32 px-4 py-3.5 text-xs font-semibold text-slate-600">التاريخ</th>
                      <th className="w-24 px-4 py-3.5 text-xs font-semibold text-slate-600">السعر</th>
                      <th className="w-24 px-4 py-3.5 text-xs font-semibold text-slate-600">الحالة</th>
                      <th className="min-w-[260px] px-4 py-3.5 text-xs font-semibold text-slate-600">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map((ev) => {
                      const loc = eventLocation(ev)
                      const price = eventPrice(ev)
                      const bookings = resolveBookingsCount(ev, reportBookings)
                      const st = (ev.status || "Draft").toString()
                      const orgName = eventOrganizationName(ev)
                      const start = ev.startDate ? formatDateEn(ev.startDate) : "—"
                      const thumb = eventPrimaryImageUrl(ev)
                      const imgCount = eventImagesArray(ev).length
                      return (
                        <tr
                          key={ev.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/admin/events/${ev.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              navigate(`/admin/events/${ev.id}`)
                            }
                          }}
                          className="cursor-pointer bg-white/90 transition-colors hover:bg-sky-50/70"
                        >
                          <td className="px-3 py-2 align-middle">
                            <div className="relative mx-auto size-14 overflow-hidden rounded-lg border border-slate-200/90 bg-slate-100">
                              {thumb ? (
                                <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-400">
                                  <ImageIcon className="size-6" />
                                </div>
                              )}
                              {imgCount > 1 && (
                                <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
                                  {formatCountEn(imgCount)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="line-clamp-2 font-semibold text-brand-navy">
                              {ev.title || ev.name || "بدون عنوان"}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {orgName ? (
                              <span className="line-clamp-2 font-medium text-slate-800">{orgName}</span>
                            ) : (
                              <span className={adminTextMuted}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <span className="inline-block min-w-[2.5rem] rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm font-bold tabular-nums text-slate-900 ring-1 ring-slate-200/80">
                              {bookings != null ? formatCountEn(bookings) : "—"}
                            </span>
                          </td>
                          <td className="max-w-[180px] px-4 py-3 align-top">
                            <span className="line-clamp-2 text-slate-600">{loc ?? "—"}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle tabular-nums text-slate-700">
                            {start}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle">
                            <span className="font-medium tabular-nums text-slate-800">
                              {price != null ? formatMoneyEn(price, "") : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(st)}`}
                            >
                              {statusLabelAr(st)}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div
                              className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50/95 p-1 shadow-sm ring-1 ring-slate-900/[0.03]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {st !== "Published" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 gap-1 rounded-lg px-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50/90 sm:px-2.5 ${btnAction}`}
                                  onClick={(e) => updateStatus(e, ev.id, "Published")}
                                  title="نشر الفعالية"
                                >
                                  <Eye className="size-3.5 shrink-0" aria-hidden />
                                  <span className="hidden sm:inline">نشر</span>
                                </Button>
                              )}
                              {st !== "Draft" && st !== "Cancelled" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 gap-1 rounded-lg px-2 text-xs font-medium text-amber-900 hover:bg-amber-50/90 sm:px-2.5 ${btnAction}`}
                                  onClick={(e) => updateStatus(e, ev.id, "Cancelled")}
                                  title="إلغاء الفعالية"
                                >
                                  <XCircle className="size-3.5 shrink-0" aria-hidden />
                                  <span className="hidden sm:inline">إلغاء</span>
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={`h-8 gap-1 rounded-lg px-2 text-xs font-medium text-sky-900 hover:bg-sky-50/90 sm:px-2.5 ${btnAction}`}
                                onClick={(e) => handleEditClick(e, ev)}
                                title="تعديل"
                              >
                                <Pencil className="size-3.5 shrink-0" aria-hidden />
                                <span className="hidden sm:inline">تعديل</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={`h-8 gap-1 rounded-lg px-2 text-xs font-medium text-rose-800 hover:bg-rose-50/90 sm:px-2.5 ${btnAction}`}
                                onClick={(e) => handleDelete(e, ev.id)}
                                title="حذف"
                              >
                                <Trash2 className="size-3.5 shrink-0" aria-hidden />
                                <span className="hidden sm:inline">حذف</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </MotionSurface>
        )}
      </MotionSection>

      {modal === "create" && (
        <div className={adminModalBackdrop} role="presentation">
          <Card className={`${adminCardClassStatic} max-h-[90vh] w-full max-w-md overflow-y-auto`}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 py-4">
              <CardTitle className="text-brand-navy">إنشاء فعالية</CardTitle>
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setModal(null)}>
                إغلاق
              </Button>
            </CardHeader>
            <CardContent>
              {error && modal && <div className={`mb-4 ${adminPageError}`}>{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label className="text-slate-700">المنظمة المالكة *</Label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                      value={form.organizationId}
                      onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                      required
                      disabled={submitLoading || organizations.length === 0}
                    >
                      <option value="">— اختر منظمة —</option>
                      {organizations.map((org) => {
                        const id = orgRowId(org)
                        if (id == null) return null
                        return (
                          <option key={String(id)} value={String(id)}>
                            {orgRowName(org)}
                          </option>
                        )
                      })}
                    </select>
                    {organizations.length === 0 && (
                      <p className="text-xs text-amber-800">تعذر تحميل قائمة المنظمات. تحقق من الصلاحيات أو حاول لاحقاً.</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-slate-700">التصنيف</Label>
                  <select
                    className="flex h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    disabled={submitLoading}
                  >
                    <option value="">— اختياري —</option>
                    {categories.map((c) => {
                      const id = c.id ?? c.categoryId ?? c.Id
                      const name = c.name ?? c.Name ?? c.title ?? id
                      if (id == null) return null
                      return (
                        <option key={String(id)} value={String(id)}>
                          {name}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">العنوان</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">الوصف</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">الموقع</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">تاريخ البداية</Label>
                  <Input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">تاريخ النهاية</Label>
                  <Input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700">السعة</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                      className="h-11 rounded-xl border-slate-200/90"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">السعر</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      className="h-11 rounded-xl border-slate-200/90"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">آخر موعد للحجز</Label>
                  <Input
                    type="datetime-local"
                    value={form.bookingDeadline}
                    onChange={(e) => setForm((f) => ({ ...f, bookingDeadline: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2 rounded-xl border border-slate-200/90 bg-slate-50/80 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <ImagePlus className="size-4 text-sky-600" />
                    صور (اختياري)
                  </div>
                  <p className="text-xs text-slate-600">
                    بعد الإنشاء تُرفع الصور تلقائياً. للتعديل الكامل افتح صفحة الفعالية من الجدول.
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onPickImages}
                    className="h-11 rounded-xl border-slate-200/90 bg-white"
                    disabled={submitLoading}
                  />
                  {pendingImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600">صورة الغلاف:</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {pendingImages.map((file, idx) => (
                          <label
                            key={`${file.name}-${idx}`}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                              pendingCoverIndex === idx
                                ? "border-sky-500 bg-sky-50 text-sky-900"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name="admin-create-cover"
                              checked={pendingCoverIndex === idx}
                              onChange={() => setPendingCoverIndex(idx)}
                              disabled={submitLoading}
                            />
                            <span className="line-clamp-1">{file.name}</span>
                            {pendingCoverIndex === idx && <Star className="ms-auto size-3.5" />}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={submitLoading} className={`w-full ${adminBtnPrimary}`}>
                  {submitLoading ? "جاري الإنشاء…" : "إنشاء"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
