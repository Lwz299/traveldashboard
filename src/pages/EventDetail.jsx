import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import api from "../api/api"
import {
  deleteEventImage,
  normalizeEventImage,
  patchEventImage,
  uploadEventImages,
} from "../api/eventImages"
import { getEventStaff } from "../api/eventStaff"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import {
  ArrowRight,
  Calendar,
  MapPin,
  Coins,
  Users,
  Ticket,
  Image as ImageIcon,
  ListOrdered,
  BarChart3,
  ImagePlus,
  Star,
  Trash2,
  Eye,
  XCircle,
  Save,
  Loader2,
} from "lucide-react"
import { formatDateEn, formatDateTimeEn, formatCountEn, formatMoneyEn } from "../utils/formatEn"
import {
  eventLocation,
  eventPrice,
  eventBookingsCount,
  eventBookingsFromTicketTypes,
  eventAttendanceCount,
  eventCapacity,
  eventPrimaryImageUrl,
  eventImagesArray,
  statusBadgeClass,
  statusLabelAr,
  firstDefined,
} from "../utils/eventDisplay"
import { agendaItemId, staffMemberId } from "../utils/agendaDisplay"
import { normalizeEventPerformance } from "../utils/reportPayload"
import { MotionSection, EventsPageSkeleton } from "../components/motion"
import { orgCardClass, orgBtnPrimary } from "../lib/org-ui"
import { orgApiErrorMessage } from "../utils/orgApiError"
import { parseEventNotAvailableError } from "../utils/apiErrorCodes"
import { resolveApiAssetUrl } from "../utils/apiAssetUrl"

function toDatetimeLocalValue(raw) {
  if (raw == null || raw === "") return ""
  const s = String(raw)
  return s.length >= 16 ? s.slice(0, 16) : s
}

function imageRowId(img) {
  return firstDefined(img, ["id", "Id", "imageId", "ImageId"])
}

function imageRowUrl(img) {
  const u = firstDefined(img, ["url", "Url", "imageUrl", "ImageUrl"])
  return u != null ? resolveApiAssetUrl(String(u)) : ""
}

function ticketTypeId(row) {
  return row.id ?? row.ticketTypeId ?? row.Id
}

const selectInputClass =
  "flex h-10 w-full rounded-lg border border-emerald-900/15 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600/30 sm:min-w-0"

const textareaClass =
  "min-h-[100px] w-full resize-y rounded-xl border border-emerald-900/15 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600/30"

export default function EventDetail() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [categories, setCategories] = useState([])
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
  const [ticketTypes, setTicketTypes] = useState([])
  const [agenda, setAgenda] = useState([])
  const [staff, setStaff] = useState([])
  const [perfStats, setPerfStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [existingImages, setExistingImages] = useState([])
  const [pendingImages, setPendingImages] = useState([])
  const [pendingCoverIndex, setPendingCoverIndex] = useState(0)
  const [saveError, setSaveError] = useState("")
  const [saveLoading, setSaveLoading] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState(null)
  const [patchingImageId, setPatchingImageId] = useState(null)

  const [agendaForm, setAgendaForm] = useState({
    title: "",
    time: "",
    description: "",
    responsibleStaffMemberId: "",
  })
  const [agendaBusy, setAgendaBusy] = useState(false)

  const [segments, setSegments] = useState([])
  const [ttForm, setTtForm] = useState({
    name: "",
    description: "",
    price: "",
    capacity: "",
    userSegmentId: "",
  })
  const [ttError, setTtError] = useState("")
  const [ttLoading, setTtLoading] = useState(false)

  const syncFormFromEvent = useCallback((d) => {
    setForm({
      title: d.title ?? d.name ?? "",
      description: d.description ?? "",
      startDate: d.startDate ? d.startDate.slice(0, 16) : "",
      endDate: d.endDate ? d.endDate.slice(0, 16) : "",
      location: d.locationName ?? d.location ?? "",
      categoryId:
        d.categoryId != null ? String(d.categoryId) : d.CategoryId != null ? String(d.CategoryId) : "",
      capacity:
        firstDefined(d, ["capacity", "Capacity"]) != null
          ? String(firstDefined(d, ["capacity", "Capacity"]))
          : "100",
      price: firstDefined(d, ["price", "Price"]) != null ? String(firstDefined(d, ["price", "Price"])) : "",
      bookingDeadline: toDatetimeLocalValue(firstDefined(d, ["bookingDeadline", "BookingDeadline"])),
    })
    setExistingImages(eventImagesArray(d).map((row) => normalizeEventImage(row)))
  }, [])

  const reloadEvent = useCallback(async () => {
    const { data } = await api.get(`/events/${eventId}`)
    if (data && typeof data === "object") {
      setEvent(data)
      setExistingImages(eventImagesArray(data).map((row) => normalizeEventImage(row)))
    }
  }, [eventId])

  const loadTicketTypes = useCallback(async () => {
    setTtLoading(true)
    setTtError("")
    try {
      const { data } = await api.get(`/ticket-types/event/${eventId}`)
      setTicketTypes(Array.isArray(data) ? data : [])
    } catch (err) {
      setTicketTypes([])
      setTtError(err.response?.data?.message ?? "تعذر تحميل أنواع التذاكر")
    } finally {
      setTtLoading(false)
    }
  }, [eventId])

  const refreshAgenda = useCallback(async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/agenda`)
      setAgenda(Array.isArray(data) ? data : [])
    } catch {
      setAgenda([])
    }
  }, [eventId])

  useEffect(() => {
    api
      .get("/categories")
      .then((r) => {
        const d = r.data
        setCategories(Array.isArray(d) ? d : d?.items ?? [])
      })
      .catch(() => setCategories([]))
    api
      .get("/user-segments")
      .then((r) => setSegments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSegments([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      setEventUnavailable(null)
      setPerfStats(null)
      setAgenda([])
      try {
        const { data } = await api.get(`/events/${eventId}`)
        if (cancelled) return
        if (!data || typeof data !== "object") {
          setError("لم يُرجع الخادم بيانات الفعالية")
          setEvent(null)
          return
        }
        setEvent(data)
        syncFormFromEvent(data)

        let tt = []
        try {
          const r = await api.get(`/ticket-types/event/${eventId}`)
          tt = Array.isArray(r.data) ? r.data : []
        } catch {
          tt = []
        }
        if (cancelled) return
        setTicketTypes(tt)

        try {
          const { data: ag } = await api.get(`/events/${eventId}/agenda`)
          if (!cancelled) setAgenda(Array.isArray(ag) ? ag : [])
        } catch {
          if (!cancelled) setAgenda([])
        }

        try {
          const list = await getEventStaff(eventId)
          if (!cancelled) setStaff(Array.isArray(list) ? list : [])
        } catch {
          if (!cancelled) setStaff([])
        }

        const hasBookings =
          eventBookingsCount(data) != null || eventBookingsFromTicketTypes(tt) != null
        if (!hasBookings) {
          try {
            const { data: perf } = await api.get(`/reports/event-performance/${eventId}`)
            if (!cancelled) setPerfStats(normalizeEventPerformance(perf))
          } catch {
            if (!cancelled) setPerfStats(null)
          }
        }
      } catch (e) {
        if (!cancelled) {
          const na = parseEventNotAvailableError(e)
          if (na) {
            setEventUnavailable(na)
            setError("")
          } else {
            setError(orgApiErrorMessage(e, "تعذر تحميل الفعالية"))
            setEventUnavailable(null)
          }
          setEvent(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId, syncFormFromEvent])

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

  const handleSaveDetails = async (e) => {
    e.preventDefault()
    setSaveError("")
    setSaveLoading(true)
    try {
      await api.put(`/events/${eventId}`, buildPayload())
      if (pendingImages.length > 0) {
        await uploadEventImages(eventId, pendingImages, pendingCoverIndex)
      }
      const { data: fresh } = await api.get(`/events/${eventId}`)
      if (fresh && typeof fresh === "object") {
        setEvent(fresh)
        setExistingImages(eventImagesArray(fresh).map((row) => normalizeEventImage(row)))
        syncFormFromEvent(fresh)
      }
      setPendingImages([])
      setPendingCoverIndex(0)
    } catch (err) {
      setSaveError(orgApiErrorMessage(err))
    } finally {
      setSaveLoading(false)
    }
  }

  const onPickImages = (e) => {
    const files = Array.from(e.target.files ?? []).filter(Boolean)
    setPendingImages(files)
    setPendingCoverIndex(0)
  }

  const handleSetCoverImage = async (imageId) => {
    if (imageId == null) return
    setPatchingImageId(imageId)
    setSaveError("")
    try {
      await patchEventImage(eventId, imageId, { isCover: true })
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          isCover: imageRowId(img) === imageId,
        }))
      )
      await reloadEvent()
    } catch (err) {
      setSaveError(orgApiErrorMessage(err, "تعذر تعيين صورة الغلاف"))
    } finally {
      setPatchingImageId(null)
    }
  }

  const handleDeleteExistingImage = async (imageId) => {
    if (imageId == null) return
    if (!confirm("حذف هذه الصورة من الفعالية؟")) return
    setDeletingImageId(imageId)
    try {
      await deleteEventImage(imageId, eventId)
      setExistingImages((prev) => prev.filter((img) => imageRowId(img) !== imageId))
      await reloadEvent()
    } catch (err) {
      alert(orgApiErrorMessage(err, "تعذر حذف الصورة"))
    } finally {
      setDeletingImageId(null)
    }
  }

  const updateStatus = async (status) => {
    try {
      await api.patch(`/events/${eventId}/status`, { status })
      await reloadEvent()
    } catch (err) {
      alert(orgApiErrorMessage(err))
    }
  }

  const addAgendaItem = async (e) => {
    e.preventDefault()
    setAgendaBusy(true)
    try {
      const payload = {
        title: agendaForm.title.trim(),
        time: agendaForm.time.trim(),
        description: agendaForm.description.trim(),
      }
      const rid = agendaForm.responsibleStaffMemberId
      if (rid !== "" && rid != null) {
        const n = Number(rid)
        if (Number.isFinite(n)) payload.responsibleStaffMemberId = n
      }
      if (!payload.title) {
        alert("أدخل عنواناً للبند")
        return
      }
      await api.post(`/events/${eventId}/agenda`, payload)
      setAgendaForm({ title: "", time: "", description: "", responsibleStaffMemberId: "" })
      await refreshAgenda()
    } catch (err) {
      alert(err.response?.data?.message ?? orgApiErrorMessage(err, "تعذر إضافة البند"))
    } finally {
      setAgendaBusy(false)
    }
  }

  const deleteAgendaItem = async (item) => {
    const id = agendaItemId(item)
    if (id == null) return
    if (!confirm("حذف هذا البند من الأجندة؟")) return
    setAgendaBusy(true)
    try {
      await api.delete(`/events/${eventId}/agenda/${id}`)
      await refreshAgenda()
    } catch (err) {
      alert(err.response?.data?.message ?? orgApiErrorMessage(err, "تعذر الحذف — قد لا يدعم الخادم الحذف"))
    } finally {
      setAgendaBusy(false)
    }
  }

  const addTicketType = async (e) => {
    e.preventDefault()
    setTtError("")
    const name = ttForm.name.trim()
    const price = Number(ttForm.price)
    const capacity = Number(ttForm.capacity)
    if (!name || !Number.isFinite(price) || !Number.isFinite(capacity)) {
      setTtError("أدخل اسماً وسعراً وسعة صحيحة.")
      return
    }
    const userSegmentId = ttForm.userSegmentId === "" ? null : Number(ttForm.userSegmentId)
    if (ttForm.userSegmentId !== "" && !Number.isFinite(userSegmentId)) {
      setTtError("معرّف الفئة غير صالح.")
      return
    }
    try {
      await api.post("/ticket-types", {
        eventId: Number(eventId),
        name,
        description: ttForm.description.trim() || undefined,
        price,
        capacity,
        userSegmentId,
      })
      setTtForm({ name: "", description: "", price: "", capacity: "", userSegmentId: "" })
      await loadTicketTypes()
      await reloadEvent()
    } catch (err) {
      setTtError(err.response?.data?.message ?? "تعذر الإنشاء")
    }
  }

  const deleteTicketType = async (row) => {
    const id = ticketTypeId(row)
    if (id == null || !confirm("حذف نوع التذكرة هذا؟")) return
    try {
      await api.delete(`/ticket-types/${id}`)
      await loadTicketTypes()
      await reloadEvent()
    } catch (err) {
      setTtError(err.response?.data?.message ?? "تعذر الحذف")
    }
  }

  const staffOptionsForAgenda = useMemo(() => {
    return staff.map((s) => {
      const sid = staffMemberId(s)
      const jt = s.jobTitle ?? s.JobTitle ?? ""
      return {
        value: sid != null ? String(sid) : "",
        label: jt ? `${jt} (#${sid})` : `عضو طاقم #${sid}`,
      }
    })
  }, [staff])

  const bookings = useMemo(() => {
    if (!event) return null
    return (
      eventBookingsCount(event) ??
      eventBookingsFromTicketTypes(ticketTypes) ??
      perfStats?.ticketsSold ??
      null
    )
  }, [event, ticketTypes, perfStats])

  const attendance = useMemo(() => (event ? eventAttendanceCount(event) : null), [event])

  const bookingsSourceHint = useMemo(() => {
    if (!event || bookings == null) return null
    if (eventBookingsCount(event) != null) return "من بيانات الفعالية"
    if (eventBookingsFromTicketTypes(ticketTypes) != null) return "مجموع من أنواع التذاكر"
    if (perfStats?.ticketsSold != null) return "من تقرير الأداء"
    return null
  }, [event, ticketTypes, perfStats, bookings])

  const ev = event
  const displayTitle = form.title?.trim() || ev?.title || ev?.name || "بدون عنوان"
  const loc = ev ? eventLocation(ev) : null
  const price = ev ? eventPrice(ev) : null
  const cap = ev ? eventCapacity(ev) : null
  const st = (ev?.status || "Draft").toString()
  const heroUrl = ev ? eventPrimaryImageUrl(ev) : null

  if (loading) {
    return <EventsPageSkeleton />
  }

  if (eventUnavailable) {
    return (
      <div className="mx-auto max-w-lg space-y-5 px-1 py-4">
        <Button type="button" variant="outline" className="gap-2 rounded-xl border-emerald-900/20" asChild>
          <Link to="/events">
            <ArrowRight className="size-4 rotate-180" />
            العودة للرحلات
          </Link>
        </Button>
        <div
          className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]"
          role="status"
        >
          <p className="text-base font-semibold text-slate-900">{eventUnavailable.message}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{eventUnavailable.hint}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button className={orgBtnPrimary} asChild>
              <Link to="/events">تصفح الفعاليات</Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/">الصفحة الرئيسية</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error && !ev) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" className="gap-2 rounded-xl border-emerald-900/20" asChild>
          <Link to="/events">
            <ArrowRight className="size-4 rotate-180" />
            العودة للرحلات
          </Link>
        </Button>
        <div
          className="rounded-2xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Button type="button" variant="outline" className="h-11 w-fit gap-2 rounded-xl border-emerald-900/18" asChild>
          <Link to="/events">
            <ArrowRight className="size-4 rotate-180" />
            العودة للقائمة
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {st !== "Published" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => updateStatus("Published")}
            >
              <Eye className="size-4" />
              نشر
            </Button>
          )}
          {st !== "Draft" && st !== "Cancelled" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => updateStatus("Cancelled")}
            >
              <XCircle className="size-4" />
              إلغاء النشر
            </Button>
          )}
        </div>
      </div>

      <MotionSection delay={0.02}>
        <div className="overflow-hidden rounded-2xl border border-emerald-900/12 bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04]">
          <div className="relative aspect-[21/9] min-h-[180px] bg-gradient-to-br from-emerald-950/5 to-slate-100">
            {heroUrl ? (
              <img src={heroUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[180px] items-center justify-center text-slate-400">
                <ImageIcon className="size-12 opacity-40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            <div className="absolute bottom-0 right-0 left-0 p-5 md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/80">الرحلة</p>
                  <h1 className="text-2xl font-bold leading-tight text-white drop-shadow-sm md:text-3xl">
                    {displayTitle}
                  </h1>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${statusBadgeClass(st)}`}
                >
                  {statusLabelAr(st)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </MotionSection>

      <MotionSection delay={0.03}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className={`${orgCardClass} border-emerald-900/10`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-emerald-900/80">
                <Users className="size-5 text-emerald-700" />
                <span className="text-sm font-semibold">الحجوزات</span>
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
                {bookings != null ? formatCountEn(bookings) : "—"}
              </p>
              {attendance != null && (
                <p className="mt-2 text-sm font-medium text-slate-700">
                  حضور: <span className="tabular-nums font-bold">{formatCountEn(attendance)}</span>
                </p>
              )}
              {bookings != null && bookingsSourceHint && (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{bookingsSourceHint}</p>
              )}
            </CardContent>
          </Card>
          <Card className={`${orgCardClass} border-emerald-900/10`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-slate-800">
                <Coins className="size-5 text-amber-600" />
                <span className="text-sm font-semibold">السعر (من البيانات المحفوظة)</span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                {price != null ? formatMoneyEn(price, "") : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className={`${orgCardClass} border-emerald-900/10`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-slate-800">
                <Users className="size-5 text-slate-600" />
                <span className="text-sm font-semibold">السعة</span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                {cap != null ? formatCountEn(cap) : "—"}
              </p>
            </CardContent>
          </Card>
          {perfStats && (perfStats.revenue != null || perfStats.bookingRate != null) && (
            <Card className={`${orgCardClass} border-emerald-900/10`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-slate-800">
                  <BarChart3 className="size-5 text-emerald-600" />
                  <span className="text-sm font-semibold">أداء إضافي</span>
                </div>
                {perfStats.revenue != null && (
                  <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">
                    إيراد: {formatMoneyEn(perfStats.revenue, "")}
                  </p>
                )}
                {perfStats.bookingRate != null && (
                  <p className="mt-1 text-sm text-slate-600">
                    معدل الحجز:{" "}
                    <span className="font-semibold tabular-nums">{formatCountEn(perfStats.bookingRate)}%</span>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </MotionSection>

      <form onSubmit={handleSaveDetails}>
        <MotionSection delay={0.04}>
          <Card className={`${orgCardClass} border-emerald-900/10`}>
            <CardHeader className="flex flex-col gap-2 border-b border-emerald-900/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="org-heading text-lg">بيانات الرحلة</CardTitle>
              <Button type="submit" disabled={saveLoading} className={`h-11 gap-2 ${orgBtnPrimary}`}>
                {saveLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                حفظ التغييرات
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
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
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={textareaClass}
                  rows={4}
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
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
              <p className="text-xs text-slate-500">
                الموقع الحالي في البيانات المحفوظة: {loc ?? "—"}
              </p>
            </CardContent>
          </Card>
        </MotionSection>
      </form>

      <MotionSection delay={0.05}>
        <Card className={`${orgCardClass} border-emerald-900/10`}>
          <CardHeader className="border-b border-emerald-900/8 pb-4">
            <CardTitle className="org-heading flex items-center gap-2 text-lg">
              <ImageIcon className="size-5 text-emerald-700" />
              الصور
            </CardTitle>
            <p className="text-sm text-slate-600">
              تعيين غلاف، حذف، أو إضافة صور جديدة. تُحفظ الصور الجديدة عند الضغط على «حفظ التغييرات» أعلاه.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {existingImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {existingImages.map((img, idx) => {
                  const iid = imageRowId(img)
                  const src = imageRowUrl(img)
                  const isCover = Boolean(firstDefined(img, ["isCover", "IsCover"]))
                  return (
                    <div
                      key={iid != null ? String(iid) : `img-${idx}`}
                      className="group/img relative aspect-[16/9] overflow-hidden rounded-lg border border-emerald-900/10 bg-slate-100"
                    >
                      {src ? (
                        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                          بدون معاينة
                        </div>
                      )}
                      {isCover && (
                        <span className="absolute left-1.5 top-1.5 rounded bg-emerald-800/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          غلاف
                        </span>
                      )}
                      {iid != null && !isCover && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-1.5 left-1.5 right-1.5 h-7 text-[10px] font-medium"
                          disabled={saveLoading || deletingImageId === iid || patchingImageId === iid}
                          onClick={() => handleSetCoverImage(iid)}
                        >
                          {patchingImageId === iid ? "…" : "تعيين كغلاف"}
                        </Button>
                      )}
                      {iid != null && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute end-1.5 top-1.5 size-7 rounded-md shadow-sm"
                          disabled={saveLoading || deletingImageId === iid || patchingImageId === iid}
                          onClick={() => handleDeleteExistingImage(iid)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-emerald-900/20 bg-emerald-50/30 px-3 py-4 text-sm text-slate-600">
                لا توجد صور بعد. أضف صوراً من الأسفل ثم احفظ من قسم «بيانات الرحلة».
              </p>
            )}
            <div className="space-y-2 border-t border-emerald-900/10 pt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <ImagePlus className="size-4 text-emerald-700" />
                إضافة صور جديدة
              </div>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={onPickImages}
                className="h-11 rounded-xl border-emerald-900/15 bg-white"
                disabled={saveLoading}
              />
              {pendingImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600">صورة الغلاف من الملفات المختارة (تُرفع مع الحفظ):</p>
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
                          name="cover-pending-detail"
                          checked={pendingCoverIndex === idx}
                          onChange={() => setPendingCoverIndex(idx)}
                          disabled={saveLoading}
                        />
                        <span className="line-clamp-1">{file.name}</span>
                        {pendingCoverIndex === idx && <Star className="ms-auto size-3.5" />}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.06}>
        <Card className={`${orgCardClass} border-emerald-900/10`}>
          <CardHeader className="flex flex-row items-center gap-2 border-b border-emerald-900/8 pb-4">
            <ListOrdered className="size-5 text-emerald-700" />
            <CardTitle className="org-heading text-lg">الأجندة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <form onSubmit={addAgendaItem} className="space-y-3 rounded-xl border border-dashed border-emerald-900/20 bg-emerald-50/30 p-4">
              <p className="text-sm font-medium text-slate-800">إضافة بند</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">العنوان</Label>
                  <Input
                    value={agendaForm.title}
                    onChange={(e) => setAgendaForm((f) => ({ ...f, title: e.target.value }))}
                    className="rounded-xl"
                    placeholder="مثال: التجمع في المطار"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الوقت (نص حر)</Label>
                  <Input
                    value={agendaForm.time}
                    onChange={(e) => setAgendaForm((f) => ({ ...f, time: e.target.value }))}
                    className="rounded-xl"
                    placeholder="07:00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">مسؤول عن البند (اختياري)</Label>
                  <select
                    className={selectInputClass}
                    value={agendaForm.responsibleStaffMemberId}
                    onChange={(e) => setAgendaForm((f) => ({ ...f, responsibleStaffMemberId: e.target.value }))}
                  >
                    <option value="">— بدون —</option>
                    {staffOptionsForAgenda.map((o, idx) => (
                      <option key={`${o.value}-${idx}`} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">الوصف</Label>
                  <textarea
                    value={agendaForm.description}
                    onChange={(e) => setAgendaForm((f) => ({ ...f, description: e.target.value }))}
                    className={textareaClass}
                    rows={2}
                  />
                </div>
              </div>
              <Button type="submit" disabled={agendaBusy} className={orgBtnPrimary}>
                {agendaBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                إضافة البند
              </Button>
            </form>

            {agenda.length === 0 ? (
              <p className="text-center text-sm text-slate-500">لا توجد بنود بعد.</p>
            ) : (
              <ul className="space-y-2">
                {agenda.map((item, i) => {
                  const aid = agendaItemId(item)
                  const t = item.title ?? item.Title ?? item.name ?? `بند ${i + 1}`
                  const timeStr = item.time ?? item.Time ?? ""
                  const desc = item.description ?? item.Description ?? ""
                  return (
                    <li
                      key={aid ?? i}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-emerald-900/10 bg-white px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{t}</p>
                        {timeStr ? (
                          <p className="mt-1 text-xs tabular-nums text-slate-600">{timeStr}</p>
                        ) : null}
                        {desc ? <p className="mt-2 text-sm text-slate-700">{desc}</p> : null}
                      </div>
                      {aid != null && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-destructive hover:bg-red-50"
                          disabled={agendaBusy}
                          onClick={() => deleteAgendaItem(item)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.07}>
        <Card className={`${orgCardClass} border-emerald-900/10`}>
          <CardHeader className="flex flex-row items-center gap-2 border-b border-emerald-900/8 pb-4">
            <Ticket className="size-5 text-emerald-700" />
            <CardTitle className="org-heading text-lg">أنواع التذاكر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {ttLoading ? (
              <p className="text-sm text-slate-500">جاري التحميل…</p>
            ) : (
              <>
                {ttError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{ttError}</p>
                )}
                <ul className="space-y-2 rounded-xl border border-emerald-900/10 bg-white/60">
                  {ticketTypes.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-slate-500">لا توجد أنواع تذاكر بعد</li>
                  ) : (
                    ticketTypes.map((row) => {
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
                      <Label className="text-xs">فئة مستخدم (اختياري)</Label>
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
                  <Button type="submit" className={`w-full sm:w-auto ${orgBtnPrimary}`}>
                    إضافة نوع التذكرة
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.08}>
        <Card className={`${orgCardClass} border-emerald-900/10`}>
          <CardHeader>
            <CardTitle className="org-heading text-lg">المواعيد (للمعاينة)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="flex gap-3">
              <Calendar className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <div>
                <p className="font-medium text-slate-800">البداية</p>
                <p>{ev?.startDate ? formatDateTimeEn(ev.startDate) : "—"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <div>
                <p className="font-medium text-slate-800">النهاية</p>
                <p>{ev?.endDate ? formatDateTimeEn(ev.endDate) : "—"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <div>
                <p className="font-medium text-slate-800">الموقع المحفوظ</p>
                <p>{loc ?? "—"}</p>
              </div>
            </div>
            {ev?.bookingDeadline && (
              <div className="flex gap-3">
                <Calendar className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-slate-800">آخر موعد للحجز</p>
                  <p>{formatDateEn(ev.bookingDeadline)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionSection>

      {bookings == null && (
        <p className="text-center text-xs text-slate-500">
          لم يُرجع الخادم عدد الحجوزات في كائن الفعالية؛ عند توفر تقرير الأداء أو بيانات التذاكر يُعرض العدد تلقائياً.
        </p>
      )}
    </div>
  )
}
