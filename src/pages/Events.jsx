import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/api"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  XCircle,
  Ticket,
  Search,
  RotateCcw,
  ImagePlus,
  Image as ImageIcon,
  Star,
  ListOrdered,
} from "lucide-react"
import { formatDateEn, formatCountEn, formatMoneyEn } from "../utils/formatEn"
import {
  MotionHeader,
  MotionSection,
  MotionSurface,
  EventsPageSkeleton,
  StackedRowsSkeleton,
} from "../components/motion"
import { orgCardClass, orgModalBackdrop, orgBtnPrimary } from "../lib/org-ui"
import {
  eventLocation,
  eventPrice,
  eventBookingsCount,
  eventStartDate,
  statusBadgeClass,
  statusLabelAr,
  eventFiltersInitial,
  firstDefined,
  eventPrimaryImageUrl,
  eventImagesArray,
} from "../utils/eventDisplay"
import { uploadEventImages } from "../api/eventImages"
import { orgApiErrorMessage } from "../utils/orgApiError"
import {
  applyAgendaAndTicketsAfterEventCreate,
  defaultAgendaRow,
  defaultTicketTypeRow,
  validateEventCreationAgendaAndTickets,
} from "../utils/eventCreationFollowUp"

const btnAction =
  "transition-colors duration-200 ease-out"

function ticketTypeId(row) {
  return row.id ?? row.ticketTypeId ?? row.Id
}

function eventIdOf(ev) {
  const id = firstDefined(ev, ["id", "Id", "eventId", "EventId"])
  return id == null ? null : id
}

export default function Events() {
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(eventFiltersInitial)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    categoryId: "",
    capacity: "100",
    price: "",
    bookingDeadline: "",
  })

  const [ticketModal, setTicketModal] = useState(null)
  const [ttList, setTtList] = useState([])
  const [ttLoading, setTtLoading] = useState(false)
  const [segments, setSegments] = useState([])
  const [ttForm, setTtForm] = useState({
    name: "",
    description: "",
    price: "",
    capacity: "",
    userSegmentId: "",
  })
  const [ttError, setTtError] = useState("")
  const [pendingImages, setPendingImages] = useState([])
  const [pendingCoverIndex, setPendingCoverIndex] = useState(0)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [createAgendaRows, setCreateAgendaRows] = useState([defaultAgendaRow()])
  const [createTicketRows, setCreateTicketRows] = useState([defaultTicketTypeRow()])

  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await api.get("/events/organization/my-events")
      setEvents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(false)
    api
      .get("/categories")
      .then((r) => {
        const d = r.data
        setCategories(Array.isArray(d) ? d : d?.items ?? [])
      })
      .catch(() => setCategories([]))
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = filters.search.trim().toLowerCase()
      if (q) {
        const title = (ev.title ?? ev.name ?? "").toLowerCase()
        const desc = (ev.description ?? "").toLowerCase()
        const loc = (eventLocation(ev) ?? "").toLowerCase()
        if (!title.includes(q) && !desc.includes(q) && !loc.includes(q)) return false
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
      categoryId: "",
      capacity: "100",
      price: "",
      bookingDeadline: "",
    })
    setPendingImages([])
    setPendingCoverIndex(0)
    setSaveError("")
    setCreateAgendaRows([defaultAgendaRow()])
    setCreateTicketRows([defaultTicketTypeRow()])
  }

  /** CreateEventDto — camelCase؛ المنظمة من JWT (لا تُرسل organizationId). لا تُرسل images[] أو status أو availableSeats */
  const buildPayload = () => {
    const loc = form.location?.trim() || undefined
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      locationName: loc,
    }
    if (form.categoryId !== "" && form.categoryId != null) {
      const n = Number(form.categoryId)
      if (Number.isFinite(n) && n > 0) payload.categoryId = n
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

  const onPickImages = (e) => {
    const files = Array.from(e.target.files ?? []).filter(Boolean)
    setPendingImages(files)
    setPendingCoverIndex(0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (modal !== "create") return
    setSaveError("")
    const check = validateEventCreationAgendaAndTickets(createAgendaRows, createTicketRows)
    if (!check.ok) {
      setSaveError(check.message)
      return
    }
    setSubmitLoading(true)
    try {
      const payload = buildPayload()
      const { data } = await api.post("/events", payload)
      const eventId = eventIdOf(data)
      if (eventId && pendingImages.length > 0) {
        await uploadEventImages(eventId, pendingImages, pendingCoverIndex)
      }
      if (eventId) {
        try {
          await applyAgendaAndTicketsAfterEventCreate(api, eventId, check.agenda, check.tickets)
        } catch (followErr) {
          setSaveError(
            `${orgApiErrorMessage(followErr)} — تم إنشاء الفعالية؛ يمكنك إكمال الأجندة وأنواع التذاكر من صفحة التفاصيل.`
          )
          setModal(null)
          setPendingImages([])
          fetchEvents(true)
          return
        }
      }
      setModal(null)
      setPendingImages([])
      fetchEvents(true)
    } catch (err) {
      setSaveError(orgApiErrorMessage(err))
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/events/${id}/status`, { status })
      fetchEvents(true)
    } catch (err) {
      alert(orgApiErrorMessage(err))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرحلة؟")) return
    try {
      await api.delete(`/events/${id}`)
      fetchEvents(true)
    } catch (err) {
      alert(orgApiErrorMessage(err))
    }
  }

  const loadTicketTypes = async (eventId) => {
    setTtLoading(true)
    setTtError("")
    try {
      const { data } = await api.get(`/ticket-types/event/${eventId}`)
      setTtList(Array.isArray(data) ? data : [])
    } catch (err) {
      setTtList([])
      setTtError(err.response?.data?.message ?? "تعذر تحميل أنواع التذاكر")
    } finally {
      setTtLoading(false)
    }
  }

  const openTicketTypes = async (ev) => {
    setTicketModal({ eventId: ev.id, title: ev.title || ev.name || "رحلة" })
    setTtForm({ name: "", description: "", price: "", capacity: "", userSegmentId: "" })
    api
      .get("/user-segments")
      .then((r) => setSegments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSegments([]))
    await loadTicketTypes(ev.id)
  }

  const closeTicketModal = () => {
    setTicketModal(null)
    setTtList([])
    setTtError("")
  }

  const addTicketType = async (e) => {
    e.preventDefault()
    if (!ticketModal) return
    setTtError("")
    const name = ttForm.name.trim()
    const price = Number(ttForm.price)
    const capacity = Number(ttForm.capacity)
    if (!name || !Number.isFinite(price) || !Number.isFinite(capacity)) {
      setTtError("أدخل اسماً وسعراً وسعة صحيحة.")
      return
    }
    const userSegmentId =
      ttForm.userSegmentId === "" ? null : Number(ttForm.userSegmentId)
    if (ttForm.userSegmentId !== "" && !Number.isFinite(userSegmentId)) {
      setTtError("معرّف الفئة غير صالح.")
      return
    }
    try {
      await api.post("/ticket-types", {
        eventId: ticketModal.eventId,
        name,
        description: ttForm.description.trim() || undefined,
        price,
        capacity,
        userSegmentId,
      })
      setTtForm({ name: "", description: "", price: "", capacity: "", userSegmentId: "" })
      await loadTicketTypes(ticketModal.eventId)
    } catch (err) {
      setTtError(err.response?.data?.message ?? "تعذر الإنشاء")
    }
  }

  const deleteTicketType = async (row) => {
    const id = ticketTypeId(row)
    if (id == null || !confirm("حذف نوع التذكرة هذا؟")) return
    try {
      await api.delete(`/ticket-types/${id}`)
      await loadTicketTypes(ticketModal.eventId)
    } catch (err) {
      setTtError(err.response?.data?.message ?? "تعذر الحذف")
    }
  }

  const selectInputClass =
    "flex h-10 w-full rounded-lg border border-emerald-900/15 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600/30 sm:min-w-0"

  const toolbarFieldClass =
    "h-10 rounded-lg border border-emerald-900/15 bg-white px-2.5 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600/30"

  if (loading) {
    return <EventsPageSkeleton />
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <MotionHeader className="flex justify-end">
        <Button
          type="button"
          onClick={openCreate}
          className={`h-11 shrink-0 gap-2 px-5 ${orgBtnPrimary}`}
        >
          <Plus className="size-4" strokeWidth={2} />
          إنشاء فعالية
        </Button>
      </MotionHeader>

      <MotionSection delay={0.03}>
        <div className="overflow-hidden rounded-2xl border border-emerald-900/12 bg-gradient-to-b from-white to-emerald-50/35 shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_4px_20px_-10px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04]">
          <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-3 lg:p-3">
            <div className="relative min-w-0 flex-1 lg:max-w-xl lg:shrink">
              <Search
                className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                placeholder="بحث بالعنوان، الوصف، أو الموقع…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="h-10 w-full rounded-xl border-emerald-900/15 bg-white pr-10 shadow-sm"
                aria-label="بحث في الفعاليات"
              />
            </div>

            <div
              className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5 lg:flex-nowrap lg:justify-end lg:gap-2"
              role="group"
              aria-label="مرشحات الفعاليات"
            >
              <select
                className={`${selectInputClass} w-full min-w-[140px] sm:w-[158px] lg:w-[158px]`}
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                aria-label="تصفية حسب الحالة"
              >
                <option value="all">كل الحالات</option>
                <option value="Published">منشور</option>
                <option value="Draft">مسودة</option>
                <option value="Cancelled">ملغى</option>
              </select>

              <div className="hidden h-8 w-px shrink-0 bg-emerald-900/15 lg:block" aria-hidden />

              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-xs font-medium text-slate-500">من</span>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className={`${toolbarFieldClass} w-[min(100%,148px)] min-w-[8.75rem] sm:w-[9.25rem]`}
                  aria-label="من تاريخ"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-xs font-medium text-slate-500">إلى</span>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className={`${toolbarFieldClass} w-[min(100%,148px)] min-w-[8.75rem] sm:w-[9.25rem]`}
                  aria-label="إلى تاريخ"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 gap-1.5 rounded-xl border-emerald-900/18 bg-white px-3 text-xs font-medium hover:bg-emerald-50/90 sm:text-sm"
                  onClick={resetFilters}
                >
                  <RotateCcw className="size-3.5 sm:size-4" aria-hidden />
                  إعادة التعيين
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-emerald-900/10 bg-emerald-950/[0.02] px-3 py-2.5 text-xs text-slate-600 sm:px-4">
            <span>
              عرض{" "}
              <span className="font-semibold tabular-nums text-slate-800">{filteredEvents.length}</span> من{" "}
              <span className="tabular-nums text-slate-700">{events.length}</span> فعالية — اضغط على صف لعرض
              التفاصيل الكاملة.
            </span>
          </div>
        </div>
      </MotionSection>

      <MotionSection delay={0.05}>
        {events.length === 0 ? (
          <Card className="org-card-surface rounded-2xl border-0">
            <CardContent className="py-16 text-center">
              <p className="org-text-secondary text-sm">لا توجد فعاليات بعد.</p>
              <Button type="button" onClick={openCreate} className={`mt-4 ${orgBtnPrimary}`}>
                <Plus className="ms-2 size-4" />
                إنشاء أول فعالية
              </Button>
            </CardContent>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card className="org-card-surface rounded-2xl border-0">
            <CardContent className="py-14 text-center">
              <p className="org-text-secondary text-sm">لا توجد نتائج تطابق المرشحات.</p>
              <Button type="button" variant="link" className="mt-2 text-emerald-700" onClick={resetFilters}>
                مسح المرشحات
              </Button>
            </CardContent>
          </Card>
        ) : (
          <MotionSurface>
            <div className="overflow-hidden rounded-2xl border border-emerald-900/12 bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04]">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-right text-sm">
                  <thead>
                    <tr className="border-b border-emerald-900/10 bg-gradient-to-b from-emerald-50/90 to-white">
                      <th className="w-20 px-3 py-3.5 text-xs font-semibold text-slate-600">صورة</th>
                      <th className="min-w-[200px] px-4 py-3.5 text-xs font-semibold text-slate-600">الرحلة</th>
                      <th className="min-w-[120px] px-4 py-3.5 text-xs font-semibold text-slate-600">الموقع</th>
                      <th className="w-36 px-4 py-3.5 text-xs font-semibold text-slate-600">التاريخ</th>
                      <th className="w-28 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-600">السعر</th>
                      <th className="w-24 px-4 py-3.5 text-center text-xs font-semibold tabular-nums text-slate-600">
                        الحجوزات
                      </th>
                      <th className="w-28 px-4 py-3.5 text-xs font-semibold text-slate-600">الحالة</th>
                      <th className="min-w-[280px] px-4 py-3.5 text-xs font-semibold text-slate-600">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/[0.06]">
                    {filteredEvents.map((ev) => {
                      const loc = eventLocation(ev)
                      const price = eventPrice(ev)
                      const bookings = eventBookingsCount(ev)
                      const st = (ev.status || "Draft").toString()
                      const thumb = eventPrimaryImageUrl(ev)
                      const imgCount = eventImagesArray(ev).length
                      return (
                        <tr
                          key={ev.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/events/${ev.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              navigate(`/events/${ev.id}`)
                            }
                          }}
                          className="cursor-pointer bg-white/90 transition-colors hover:bg-emerald-50/70"
                        >
                          <td className="px-3 py-2 align-middle">
                            <div className="relative mx-auto size-14 overflow-hidden rounded-lg border border-emerald-900/10 bg-slate-100">
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
                            <span className="line-clamp-2 font-semibold text-slate-900">
                              {ev.title || ev.name || "بدون عنوان"}
                            </span>
                            {ev.description ? (
                              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{ev.description}</p>
                            ) : null}
                          </td>
                          <td className="max-w-[160px] px-4 py-3 align-top">
                            <span className="line-clamp-2 text-slate-600">{loc ?? "—"}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle tabular-nums text-slate-700">
                            {ev.startDate ? formatDateEn(ev.startDate) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle">
                            <span className="font-medium tabular-nums text-slate-800">
                              {price != null ? formatMoneyEn(price, "") : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <span className="inline-block min-w-[2.25rem] rounded-lg bg-slate-50 px-2 py-1 text-sm font-bold tabular-nums text-slate-900 ring-1 ring-emerald-900/10">
                              {bookings != null ? formatCountEn(bookings) : "—"}
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
                            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`h-8 rounded-lg border-emerald-200/80 bg-white/90 px-2 text-emerald-900 hover:bg-emerald-50 ${btnAction}`}
                                onClick={() => openTicketTypes(ev)}
                                title="أنواع التذاكر"
                              >
                                <Ticket className="size-3.5" />
                              </Button>
                              {st !== "Published" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={`h-8 rounded-lg px-2 ${btnAction}`}
                                  onClick={() => updateStatus(ev.id, "Published")}
                                  title="نشر"
                                >
                                  <Eye className="size-3.5" />
                                </Button>
                              )}
                              {st !== "Draft" && st !== "Cancelled" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={`h-8 rounded-lg px-2 ${btnAction}`}
                                  onClick={() => updateStatus(ev.id, "Cancelled")}
                                  title="إلغاء"
                                >
                                  <XCircle className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`h-8 rounded-lg px-2 ${btnAction}`}
                                onClick={() => navigate(`/events/${ev.id}`)}
                                title="تعديل"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className={`h-8 rounded-lg px-2 ${btnAction}`}
                                onClick={() => handleDelete(ev.id)}
                                title="حذف"
                              >
                                <Trash2 className="size-3.5" />
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
        <div className={orgModalBackdrop} role="presentation">
          <Card className="org-card-surface max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl border-0 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="org-heading text-lg">فعالية جديدة</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  setModal(null)
                  setSaveError("")
                }}
                disabled={submitLoading}
              >
                إغلاق
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {saveError ? (
                  <div
                    className="rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2.5 text-sm text-red-900 whitespace-pre-wrap [overflow-wrap:anywhere]"
                    role="alert"
                  >
                    {saveError}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label className="text-slate-700">التصنيف (اختياري)</Label>
                  <select
                    className={selectInputClass}
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">— بدون —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name ?? c.title ?? c.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">العنوان</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    className="h-11 rounded-xl border-emerald-900/15"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">الوصف</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="h-11 rounded-xl border-emerald-900/15"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">الموقع</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="h-11 rounded-xl border-emerald-900/15"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">تاريخ البداية</Label>
                  <Input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="h-11 rounded-xl border-emerald-900/15"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">تاريخ النهاية</Label>
                  <Input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="h-11 rounded-xl border-emerald-900/15"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700">السعة الإجمالية</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={form.capacity}
                      onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                      className="h-11 rounded-xl border-emerald-900/15 tabular-nums"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">السعر الإعلاني (اختياري)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      className="h-11 rounded-xl border-emerald-900/15 tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">آخر موعد للحجز (اختياري)</Label>
                  <Input
                    type="datetime-local"
                    value={form.bookingDeadline}
                    onChange={(e) => setForm((f) => ({ ...f, bookingDeadline: e.target.value }))}
                    className="h-11 rounded-xl border-emerald-900/15"
                  />
                  <p className="text-[11px] text-slate-500">
                    إن وُجد يجب أن يكون قبل تاريخ بداية الفعالية (تحقق الخادم).
                  </p>
                </div>

                <div className="space-y-3 rounded-xl border border-emerald-900/12 bg-emerald-50/25 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ListOrdered className="size-4 shrink-0 text-emerald-700" aria-hidden />
                    الأجندة (مطلوب)
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    بند واحد على الأقل؛ عنوان البند إلزامي. الوقت والوصف اختياريان.
                  </p>
                  {createAgendaRows.map((row, i) => (
                    <div
                      key={`agenda-${i}`}
                      className="space-y-2 rounded-lg border border-emerald-900/10 bg-white/80 p-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-600">بند {i + 1}</span>
                        {createAgendaRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg px-2 text-xs text-rose-700 hover:bg-rose-50"
                            onClick={() =>
                              setCreateAgendaRows((rows) =>
                                rows.length <= 1 ? [defaultAgendaRow()] : rows.filter((_, j) => j !== i)
                              )
                            }
                          >
                            حذف
                          </Button>
                        ) : null}
                      </div>
                      <Input
                        placeholder="عنوان البند *"
                        value={row.title}
                        onChange={(e) =>
                          setCreateAgendaRows((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, title: e.target.value } : r))
                          )
                        }
                        className="h-10 rounded-xl border-emerald-900/15"
                      />
                      <Input
                        placeholder="الوقت (اختياري)"
                        value={row.time}
                        onChange={(e) =>
                          setCreateAgendaRows((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, time: e.target.value } : r))
                          )
                        }
                        className="h-10 rounded-xl border-emerald-900/15 font-mono text-sm"
                        dir="ltr"
                      />
                      <Input
                        placeholder="وصف (اختياري)"
                        value={row.description}
                        onChange={(e) =>
                          setCreateAgendaRows((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r))
                          )
                        }
                        className="h-10 rounded-xl border-emerald-900/15"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-emerald-900/20"
                    onClick={() => setCreateAgendaRows((rows) => [...rows, defaultAgendaRow()])}
                  >
                    + إضافة بند
                  </Button>
                </div>

                <div className="space-y-3 rounded-xl border border-emerald-900/12 bg-white/90 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Ticket className="size-4 shrink-0 text-emerald-700" aria-hidden />
                    أنواع التذاكر (مطلوب)
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    نوع واحد على الأقل: الاسم والسعر والسعة كما في إعدادات الفعالية.
                  </p>
                  {createTicketRows.map((row, i) => (
                    <div
                      key={`tt-${i}`}
                      className="space-y-2 rounded-lg border border-emerald-900/10 bg-emerald-50/20 p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-600">نوع {i + 1}</span>
                        {createTicketRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg px-2 text-xs text-rose-700 hover:bg-rose-50"
                            onClick={() =>
                              setCreateTicketRows((rows) =>
                                rows.length <= 1 ? [defaultTicketTypeRow()] : rows.filter((_, j) => j !== i)
                              )
                            }
                          >
                            حذف
                          </Button>
                        ) : null}
                      </div>
                      <Input
                        placeholder="اسم النوع *"
                        value={row.name}
                        onChange={(e) =>
                          setCreateTicketRows((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r))
                          )
                        }
                        className="h-10 rounded-xl border-emerald-900/15"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="السعر *"
                          value={row.price}
                          onChange={(e) =>
                            setCreateTicketRows((rows) =>
                              rows.map((r, j) => (j === i ? { ...r, price: e.target.value } : r))
                            )
                          }
                          className="h-10 rounded-xl border-emerald-900/15 tabular-nums"
                          dir="ltr"
                        />
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="السعة *"
                          value={row.capacity}
                          onChange={(e) =>
                            setCreateTicketRows((rows) =>
                              rows.map((r, j) => (j === i ? { ...r, capacity: e.target.value } : r))
                            )
                          }
                          className="h-10 rounded-xl border-emerald-900/15 tabular-nums"
                          dir="ltr"
                        />
                      </div>
                      <Input
                        placeholder="وصف النوع (اختياري)"
                        value={row.description}
                        onChange={(e) =>
                          setCreateTicketRows((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r))
                          )
                        }
                        className="h-10 rounded-xl border-emerald-900/15"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-emerald-900/20"
                    onClick={() => setCreateTicketRows((rows) => [...rows, defaultTicketTypeRow()])}
                  >
                    + إضافة نوع تذكرة
                  </Button>
                </div>

                <div className="space-y-2 rounded-xl border border-emerald-900/10 bg-emerald-50/30 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <ImagePlus className="size-4 text-emerald-700" />
                    صور الفعالية (اختياري)
                  </div>
                  <p className="text-[13px] leading-relaxed text-slate-600">
                    تُرفع بعد إنشاء الفعالية. يمكنك تعديل الصور والمزيد من صفحة تفاصيل الرحلة.
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onPickImages}
                    className="h-11 rounded-xl border-emerald-900/15 bg-white"
                    disabled={submitLoading}
                  />
                  {pendingImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600">صورة الغلاف من الملفات المختارة:</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {pendingImages.map((file, idx) => (
                          <label
                            key={`${file.name}-${idx}`}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                              pendingCoverIndex === idx
                                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name="cover-image"
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
                <Button type="submit" className={`w-full ${orgBtnPrimary}`}>
                  {submitLoading ? "جاري الحفظ..." : "إنشاء"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {ticketModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <Card className="org-card-surface max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border-0 shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="org-heading text-lg">أنواع التذاكر</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{ticketModal.title}</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={closeTicketModal}>
                إغلاق
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {ttLoading ? (
                <StackedRowsSkeleton rows={4} />
              ) : (
                <>
                  {ttError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{ttError}</p>
                  )}
                  <ul className="space-y-2 rounded-xl border border-emerald-900/10 bg-white/60">
                    {ttList.length === 0 ? (
                      <li className="px-3 py-6 text-center text-sm text-slate-500">لا توجد أنواع تذاكر بعد</li>
                    ) : (
                      ttList.map((row) => {
                        const tid = ticketTypeId(row)
                        return (
                          <li
                            key={tid ?? JSON.stringify(row)}
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/5 px-3 py-2.5 text-sm last:border-0"
                          >
                            <div>
                              <span className="font-medium text-slate-900">{row.name ?? row.Name ?? "—"}</span>
                              <span className="ms-2 tabular-nums text-slate-600">
                                {row.price ?? row.Price ?? "—"} / سعة {row.capacity ?? row.Capacity ?? "—"}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-red-50"
                              onClick={() => deleteTicketType(row)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </li>
                        )
                      })
                    )}
                  </ul>

                  <form onSubmit={addTicketType} className="space-y-3 rounded-xl border border-dashed border-emerald-900/20 bg-emerald-50/30 p-4">
                    <p className="text-sm font-medium text-slate-800">إضافة نوع تذكرة</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">الاسم</Label>
                        <Input
                          value={ttForm.name}
                          onChange={(e) => setTtForm((f) => ({ ...f, name: e.target.value }))}
                          required
                          className="rounded-xl"
                          placeholder="مثال: عادية"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">السعر</Label>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={ttForm.price}
                          onChange={(e) => setTtForm((f) => ({ ...f, price: e.target.value }))}
                          required
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">السعة</Label>
                        <Input
                          type="number"
                          min={0}
                          value={ttForm.capacity}
                          onChange={(e) => setTtForm((f) => ({ ...f, capacity: e.target.value }))}
                          required
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">الوصف (اختياري)</Label>
                        <Input
                          value={ttForm.description}
                          onChange={(e) => setTtForm((f) => ({ ...f, description: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">فئة مستخدم (اختياري — Segments)</Label>
                        <select
                          className={selectInputClass}
                          value={ttForm.userSegmentId}
                          onChange={(e) => setTtForm((f) => ({ ...f, userSegmentId: e.target.value }))}
                        >
                          <option value="">— للجميع —</option>
                          {segments.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name || s.title || s.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button type="submit" className={`w-full ${orgBtnPrimary}`}>
                      إضافة نوع التذكرة
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
