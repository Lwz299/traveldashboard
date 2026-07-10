import { useEffect, useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
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
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  BarChart3,
  ShoppingCart,
  MoreVertical,
  Copy,
  Archive,
  Share2,
  CalendarDays,
  FileText,
  DollarSign,
  MapPin,
  Users
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { formatDateEn, formatDateTimeEn, formatCountEn, formatMoneyEn } from "../utils/formatEn"
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
  eventIsSoftDeleted,
  eventDeletedAt,
} from "../utils/eventDisplay"
import { uploadEventImages } from "../api/eventImages"
import { orgApiErrorMessage } from "../utils/orgApiError"
import { parseConflictError } from "../utils/apiErrorCodes"
import {
  fetchEventFinancialAudit,
  formatFinancialAuditConfirmMessage,
} from "../api/eventFinancialAudit"
import { patchEventStatus, patchEventSuspendSales } from "../api/events"
import { useOrgPermissions } from "../hooks/useOrgPermissions"
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
  const { can } = useOrgPermissions()
  const canManageEvents = can(["CanManageEvents", "CanManageTrips"])

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
      const soft = eventIsSoftDeleted(ev)
      if (filters.listing === "listed" && soft) return false
      if (filters.listing === "removed" && !soft) return false
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
      if (filters.categoryId && String(ev.categoryId) !== String(filters.categoryId)) return false
      return true
    })
  }, [events, filters])

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.listing !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    !!filters.categoryId

  const resetFilters = () => setFilters(eventFiltersInitial)

  const openCreate = () => {
    navigate("/events/create")
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
      await patchEventStatus(id, status)
      fetchEvents(true)
    } catch (err) {
      alert(orgApiErrorMessage(err))
    }
  }

  const toggleSuspendSales = async (ev) => {
    const id = eventRowId(ev)
    if (id == null) return
    const suspended = Boolean(ev?.isSalesSuspended ?? ev?.IsSalesSuspended)
    const msg = suspended
      ? "إعادة تفعيل بيع التذاكر لهذه الرحلة؟"
      : "إيقاف بيع التذاكر مؤقتاً؟ ستظهر الرحلة للعميل لكن لا يمكن الحجز."
    if (!confirm(msg)) return
    try {
      await patchEventSuspendSales(id, !suspended)
      fetchEvents(true)
    } catch (err) {
      alert(orgApiErrorMessage(err))
    }
  }

  const handleDelete = async (id) => {
    let auditBlock = ""
    try {
      const audit = await fetchEventFinancialAudit(id)
      if (audit) auditBlock = formatFinancialAuditConfirmMessage(audit)
    } catch {
      /* اختياري — نتابع بدون تدقيق */
    }

    const confirmMsg = [
      auditBlock,
      auditBlock ? "" : null,
      "هل أنت متأكد من حذف هذه الرحلة؟",
      auditBlock ? "تأكد من مراجعة التعرض المالي أعلاه قبل المتابعة." : null,
    ]
      .filter(Boolean)
      .join("\n\n")

    if (!confirm(confirmMsg)) return
    try {
      await api.delete(`/events/${id}`)
      fetchEvents(true)
    } catch (err) {
      const c = parseConflictError(err)
      if (c) {
        const parts = [c.message, c.hint, c.suggestedAction, c.auditHint].filter(Boolean)
        alert(parts.join("\n\n"))
        return
      }
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
    if (id == null) return
    const eid = ticketModal?.eventId
    let warn = ""
    if (eid != null) {
      try {
        const audit = await fetchEventFinancialAudit(eid)
        if (audit?.issuedTicketCount > 0) {
          warn = `\n\nتنبيه: توجد ${audit.issuedTicketCount} تذكرة مصدرة لهذه الرحلة. راجع التدقيق المالي قبل الحذف.`
        }
      } catch {
        /* optional */
      }
    }
    if (!confirm(`حذف نوع التذكرة هذا؟${warn}`)) return
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
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <MotionHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[34px] font-bold text-slate-900 tracking-tight">الرحلات</h1>
          <p className="mt-1 text-sm text-slate-500">إدارة جميع الرحلات والفعاليات بسهولة.</p>
        </div>
        {canManageEvents && (
          <Button
            type="button"
            onClick={openCreate}
            className="h-11 shrink-0 gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-6 text-white shadow-lg shadow-green-600/20 transition-all hover:scale-[1.02] hover:shadow-green-600/30"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            إنشاء رحلة
          </Button>
        )}
      </MotionHeader>

      {/* Stats Cards */}
      <MotionSection delay={0.02}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group flex items-center gap-4 rounded-[16px] border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <CalendarDays className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">إجمالي الرحلات</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{events.length}</h3>
            </div>
          </div>
          <div className="group flex items-center gap-4 rounded-[16px] border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">نشط ومنشور</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{events.filter(e => e.status === 'Published').length}</h3>
            </div>
          </div>
          <div className="group flex items-center gap-4 rounded-[16px] border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <FileText className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">مسودات</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{events.filter(e => e.status === 'Draft' || !e.status).length}</h3>
            </div>
          </div>
          <div className="group flex items-center gap-4 rounded-[16px] border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <DollarSign className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">الإيرادات (تقريبي)</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {events.reduce((sum, ev) => sum + ((ev.price || 0) * (eventBookingsCount(ev) || 0)), 0).toLocaleString()}{" "}
                <span className="text-sm font-normal text-slate-500">ر.س</span>
              </h3>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Filter Card */}
      <MotionSection delay={0.03}>
        <div className="rounded-[18px] border border-slate-200/60 bg-white p-2 shadow-sm sm:p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="ابحث عن رحلة، موقع..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/50 pr-10 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-green-600/20"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="flex h-11 min-w-[140px] items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all focus:ring-2 focus:ring-green-600/20"
                value={filters.categoryId || ""}
                onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">كل التصنيفات</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name ?? c.title ?? c.id}</option>
                ))}
              </select>

              <select
                className="flex h-11 min-w-[130px] items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all focus:ring-2 focus:ring-green-600/20"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="all">كل الحالات</option>
                <option value="Published">منشور</option>
                <option value="Draft">مسودة</option>
                <option value="Cancelled">ملغى</option>
                <option value="Completed">منتهية</option>
                <option value="Deleted">مُزالة من العرض</option>
              </select>

              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2">
                <span className="text-xs text-slate-400">من</span>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="h-10 w-32 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                />
                <div className="h-4 w-px bg-slate-200" />
                <span className="text-xs text-slate-400">إلى</span>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="h-10 w-32 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  onClick={resetFilters}
                >
                  <RotateCcw className="ms-2 size-4" />
                  إعادة تعيين
                </Button>
              )}
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Data Grid */}
      <MotionSection delay={0.05}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-white/50 py-24 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
              <CalendarDays className="size-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">لا توجد رحلات بعد</h3>
            <p className="mt-1 text-sm text-slate-500">ابدأ بإنشاء رحلتك الأولى لإدارتها من هنا.</p>
            <Button onClick={openCreate} className="mt-6 h-11 rounded-xl bg-green-600 px-6 text-white hover:bg-green-700">
              <Plus className="ms-2 size-4" />
              إنشاء رحلة
            </Button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-white/50 py-24 text-center">
            <Search className="mb-4 size-10 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">لم يتم العثور على نتائج</h3>
            <p className="mt-1 text-sm text-slate-500">حاول تعديل فلاتر البحث أو مسحها.</p>
            <Button variant="link" onClick={resetFilters} className="mt-2 text-green-600">مسح الفلاتر</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((ev) => {
              const loc = eventLocation(ev)
              const price = eventPrice(ev)
              const bookings = eventBookingsCount(ev)
              const st = (ev.status || "Draft").toString()
              const salesSuspended = Boolean(ev?.isSalesSuspended ?? ev?.IsSalesSuspended)
              const thumb = eventPrimaryImageUrl(ev)
              
              let badgeColor = "bg-slate-100 text-slate-700"
              let dotColor = "bg-slate-400"
              let statusText = statusLabelAr(st)
              
              if (st === "Published") {
                badgeColor = "bg-green-50 text-green-700 ring-1 ring-green-600/20"
                dotColor = "bg-green-500"
              } else if (st === "Draft") {
                badgeColor = "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                dotColor = "bg-red-500"
              } else if (st === "Pending" || st === "Cancelled") {
                badgeColor = "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20"
                dotColor = "bg-orange-500"
              }

              if (salesSuspended && st === "Published") {
                badgeColor = "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                dotColor = "bg-amber-500"
                statusText = "بيع موقوف"
              }

              return (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/events/${ev.id}`)}
                  className="group flex cursor-pointer flex-col gap-4 rounded-[16px] border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-green-600/30 hover:shadow-md sm:flex-row sm:items-center"
                >
                  <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[14px] bg-slate-100 ring-1 ring-slate-900/5">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageIcon className="size-8" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <h4 className="truncate text-[17px] font-bold text-slate-900 transition-colors group-hover:text-green-700">
                      {ev.title || ev.name || "بدون عنوان"}
                    </h4>
                    {ev.description && <p className="mt-0.5 truncate text-[14px] text-slate-500">{ev.description}</p>}
                    <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-slate-400">
                      <MapPin className="size-3.5" />
                      <span className="truncate">{loc ?? "لم يحدد موقع"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:flex sm:shrink-0 sm:items-center sm:gap-8">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-slate-400">التاريخ</span>
                      <span className="mt-0.5 text-sm font-semibold tabular-nums text-slate-700">{ev.startDate ? formatDateEn(ev.startDate) : "—"}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-slate-400">السعر</span>
                      <div className="mt-0.5 flex items-baseline gap-1">
                        <span className="text-lg font-bold tabular-nums text-slate-900">{price != null ? price : "—"}</span>
                        {price != null && <span className="text-[11px] font-medium text-slate-500">ر.س</span>}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-slate-400">الحجوزات</span>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Users className="size-4 text-slate-400" />
                        <span className="text-sm font-bold tabular-nums text-slate-900">{bookings != null ? bookings : 0}</span>
                      </div>
                    </div>

                    <div className="flex w-[100px] flex-col items-end justify-center">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${badgeColor}`}>
                        <div className={`size-1.5 rounded-full ${dotColor}`} />
                        {statusText}
                      </div>
                    </div>
                  </div>

                  <div className="ms-2 flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900" onClick={() => navigate(`/events/${ev.id}`)} title="عرض التفاصيل">
                      <Eye className="size-[18px]" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900" onClick={() => navigate(`/events/${ev.id}?edit=1`)} title="تعديل">
                      <Pencil className="size-[18px]" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900">
                          <MoreVertical className="size-[18px]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-[14px] p-1.5 shadow-lg">
                        <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 text-sm" onClick={() => openTicketTypes(ev)}>
                          <Ticket className="ms-2 size-4 text-slate-400" />
                          أنواع التذاكر
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 text-sm" asChild>
                          <Link to={`/bookings?eventId=${ev.id}`}>
                            <ShoppingCart className="ms-2 size-4 text-slate-400" />
                            الحجوزات
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 text-sm" asChild>
                          <Link to={`/reports?eventId=${ev.id}`}>
                            <BarChart3 className="ms-2 size-4 text-slate-400" />
                            الإحصائيات
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                        {st === "Published" && (
                          <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 text-sm" onClick={() => toggleSuspendSales(ev)}>
                            {salesSuspended ? <PlayCircle className="ms-2 size-4 text-green-500" /> : <PauseCircle className="ms-2 size-4 text-orange-500" />}
                            {salesSuspended ? "تفعيل الحجوزات" : "إيقاف الحجوزات"}
                          </DropdownMenuItem>
                        )}
                        {st !== "Published" && (
                          <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 text-sm" onClick={() => updateStatus(ev.id, "Published")}>
                            <Eye className="ms-2 size-4 text-green-500" />
                            نشر الرحلة
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                        <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 text-sm text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => handleDelete(ev.id)}>
                          <Trash2 className="ms-2 size-4" />
                          حذف الرحلة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
            
            {filteredEvents.length > 0 && (
              <div className="mt-6 flex items-center justify-between rounded-[16px] border border-slate-200/60 bg-white px-4 py-3 shadow-sm">
                <span className="text-sm text-slate-500">عرض <span className="font-semibold text-slate-900">{filteredEvents.length}</span> من <span className="font-semibold text-slate-900">{events.length}</span></span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg border-slate-200" disabled>السابق</Button>
                  <Button variant="outline" size="sm" className="rounded-lg border-slate-200" disabled>التالي</Button>
                </div>
              </div>
            )}
          </div>
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
