import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, Link } from "react-router-dom"
import api from "../../api/api"
import {
  deleteEventImage,
  normalizeEventImage,
  patchEventImage,
  uploadEventImages,
} from "../../api/eventImages"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import {
  ArrowRight,
  Building2,
  Calendar,
  MapPin,
  Coins,
  Users,
  Ticket,
  Image as ImageIcon,
  ImagePlus,
  Star,
  Trash2,
  Eye,
  XCircle,
  Save,
  Loader2,
  CheckCircle2,
  Hash,
} from "lucide-react"
import { formatDateEn, formatDateTimeEn, formatCountEn, formatMoneyEn } from "../../utils/formatEn"
import {
  eventLocation,
  eventPrice,
  eventBookingsCount,
  eventBookingsFromTicketTypes,
  eventAttendanceCount,
  eventOrganizationName,
  eventCapacity,
  eventPrimaryImageUrl,
  eventImagesArray,
  statusBadgeClass,
  statusLabelAr,
  firstDefined,
} from "../../utils/eventDisplay"
import { resolveApiAssetUrl } from "../../utils/apiAssetUrl"
import { normalizeEventPerformance } from "../../utils/reportPayload"
import { MotionSection } from "../../components/motion"
import { AdminEventsPageSkeleton } from "../../components/motion/AdminSkeletons"
import {
  adminCardClassStatic,
  adminBtnPrimary,
  adminPageError,
  adminTextMuted,
} from "../../lib/admin-ui"
import { orgApiErrorMessage } from "../../utils/orgApiError"
import { parseEventNotAvailableError } from "../../utils/apiErrorCodes"

function toDatetimeLocalValue(raw) {
  if (raw == null || raw === "") return ""
  const s = String(raw)
  return s.length >= 16 ? s.slice(0, 16) : ""
}

function imageRowId(img) {
  return firstDefined(img, ["id", "Id", "imageId", "ImageId"])
}

function imageRowUrl(img) {
  const u = firstDefined(img, ["url", "Url", "imageUrl", "ImageUrl"])
  return u != null ? resolveApiAssetUrl(String(u)) : ""
}

const selectInputClass =
  "flex h-10 w-full rounded-lg border border-slate-200/90 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-400/40 sm:min-w-0"

const textareaClass =
  "min-h-[100px] w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-400/40"

function buildFormStateFromEvent(d) {
  return {
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
  }
}

export default function AdminEventDetail() {
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
  const [savedFormJson, setSavedFormJson] = useState("")
  const [ticketTypes, setTicketTypes] = useState([])
  const [perfStats, setPerfStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [eventUnavailable, setEventUnavailable] = useState(null)
  const [saveError, setSaveError] = useState("")
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const successTimerRef = useRef(null)
  const [existingImages, setExistingImages] = useState([])
  const [pendingImages, setPendingImages] = useState([])
  const [pendingCoverIndex, setPendingCoverIndex] = useState(0)
  const [deletingImageId, setDeletingImageId] = useState(null)
  const [patchingImageId, setPatchingImageId] = useState(null)

  const syncFormFromEvent = useCallback((d) => {
    const nf = buildFormStateFromEvent(d)
    setForm(nf)
    setSavedFormJson(JSON.stringify(nf))
    setExistingImages(eventImagesArray(d).map((row) => normalizeEventImage(row)))
  }, [])

  const reloadEvent = useCallback(async () => {
    const { data } = await api.get(`/events/${eventId}`)
    if (data && typeof data === "object") {
      setEvent(data)
      setExistingImages(eventImagesArray(data).map((row) => normalizeEventImage(row)))
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
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      setEventUnavailable(null)
      setPerfStats(null)
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
            setError(e.response?.data?.message ?? "تعذر تحميل الفعالية")
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

  const isDirty = useMemo(() => {
    if (!savedFormJson) return false
    const pending = pendingImages.length > 0
    try {
      return JSON.stringify(form) !== savedFormJson || pending
    } catch {
      return pending
    }
  }, [form, savedFormJson, pendingImages.length])

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        const el = document.getElementById("admin-event-edit-form")
        el?.requestSubmit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!saveSuccess) return
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => setSaveSuccess(false), 4500)
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [saveSuccess])

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
    setSaveSuccess(false)
    try {
      await api.put(`/events/${eventId}`, buildPayload())
      if (pendingImages.length > 0) {
        await uploadEventImages(eventId, pendingImages, pendingCoverIndex)
      }
      const { data: fresh } = await api.get(`/events/${eventId}`)
      if (fresh && typeof fresh === "object") {
        setEvent(fresh)
        syncFormFromEvent(fresh)
      }
      setPendingImages([])
      setPendingCoverIndex(0)
      setSaveSuccess(true)
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

  const handleSetCoverImage = async (imgId) => {
    if (imgId == null) return
    setPatchingImageId(imgId)
    setSaveError("")
    try {
      await patchEventImage(eventId, imgId, { isCover: true })
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          isCover: imageRowId(img) === imgId,
        }))
      )
      await reloadEvent()
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(orgApiErrorMessage(err, "تعذر تعيين صورة الغلاف"))
    } finally {
      setPatchingImageId(null)
    }
  }

  const handleDeleteExistingImage = async (imgId) => {
    if (imgId == null) return
    if (!confirm("حذف هذه الصورة من الفعالية؟")) return
    setDeletingImageId(imgId)
    try {
      await deleteEventImage(imgId, eventId)
      setExistingImages((prev) => prev.filter((img) => imageRowId(img) !== imgId))
      await reloadEvent()
      setSaveSuccess(true)
    } catch (err) {
      alert(orgApiErrorMessage(err, "تعذر حذف الصورة"))
    } finally {
      setDeletingImageId(null)
    }
  }

  const updateStatus = async (status) => {
    try {
      await api.patch(`/events/${eventId}/status`, { status })
      const { data } = await api.get(`/events/${eventId}`)
      if (data && typeof data === "object") {
        setEvent(data)
        syncFormFromEvent(data)
      }
      setSaveSuccess(true)
    } catch (err) {
      alert(orgApiErrorMessage(err))
    }
  }

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
    if (perfStats?.ticketsSold != null) return "من تقرير الأداء للفعالية"
    return null
  }, [event, ticketTypes, perfStats, bookings])

  if (loading) {
    return <AdminEventsPageSkeleton />
  }

  if (eventUnavailable) {
    return (
      <div className="mx-auto max-w-lg space-y-5 px-1 py-4">
        <Button type="button" variant="outline" className="gap-2 rounded-xl border-slate-200/90" asChild>
          <Link to="/admin/events">
            <ArrowRight className="size-4 rotate-180" />
            العودة للفعاليات
          </Link>
        </Button>
        <div
          className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]"
          role="status"
        >
          <p className="text-base font-semibold text-brand-navy">{eventUnavailable.message}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{eventUnavailable.hint}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button className={adminBtnPrimary} asChild>
              <Link to="/admin/events">قائمة الفعاليات</Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/admin">لوحة التحكم</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" className="gap-2 rounded-xl" asChild>
          <Link to="/admin/events">
            <ArrowRight className="size-4 rotate-180" />
            العودة للفعاليات
          </Link>
        </Button>
        <div className={adminPageError}>{error}</div>
      </div>
    )
  }

  const ev = event
  const orgName = eventOrganizationName(ev)
  const loc = eventLocation(ev)
  const price = eventPrice(ev)
  const cap = eventCapacity(ev)
  const st = (ev.status || "Draft").toString()
  const displayTitle = form.title?.trim() || ev.title || ev.name || "بدون عنوان"
  const heroUrl = eventPrimaryImageUrl(ev)

  return (
    <div className="space-y-5 pb-24 md:space-y-6 md:pb-8">
      {/* شريط علوي: تنقّل سريع + حالة */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-10 gap-2 rounded-xl border-slate-200/90" asChild>
            <Link to="/admin/events">
              <ArrowRight className="size-4 rotate-180" />
              الفعاليات
            </Link>
          </Button>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            <Hash className="size-3.5 opacity-70" aria-hidden />
            معرّف {eventId}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {st !== "Published" && (
            <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl" onClick={() => updateStatus("Published")}>
              <Eye className="size-4" />
              نشر
            </Button>
          )}
          {st !== "Draft" && st !== "Cancelled" && (
            <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl" onClick={() => updateStatus("Cancelled")}>
              <XCircle className="size-4" />
              إلغاء النشر
            </Button>
          )}
        </div>
      </div>

      <MotionSection delay={0.02}>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="relative aspect-[21/9] min-h-[160px] bg-gradient-to-br from-slate-100 to-slate-50 sm:min-h-[200px]">
            {heroUrl ? (
              <img src={heroUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center text-slate-400 sm:min-h-[200px]">
                <div className="text-center">
                  <ImageIcon className="mx-auto size-12 opacity-35" />
                  <p className={`mt-2 text-sm ${adminTextMuted}`}>لا توجد صورة غلاف بعد</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            <div className="absolute bottom-0 right-0 left-0 p-4 sm:p-6 md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">تفاصيل الفعالية</p>
                  <h1 className="text-xl font-bold leading-tight text-white drop-shadow-sm sm:text-2xl md:text-3xl">{displayTitle}</h1>
                  {orgName ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-white/95">
                      <Building2 className="size-4 shrink-0 opacity-90" />
                      <span className="truncate">{orgName}</span>
                    </p>
                  ) : null}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${statusBadgeClass(st)}`}>
                  {statusLabelAr(st)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </MotionSection>

      <MotionSection delay={0.03}>
        <Card className={adminCardClassStatic}>
          <CardContent className="grid gap-4 pt-5 sm:gap-5 sm:pt-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50/80 to-white p-4 ring-1 ring-sky-100/60 sm:p-5">
              <div className="flex items-center gap-2 text-sky-800">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-sky-100/80">
                  <Users className="size-4" />
                </div>
                <span className="text-sm font-semibold">الحجوزات</span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-brand-navy sm:text-3xl">
                {bookings != null ? formatCountEn(bookings) : "—"}
              </p>
              {attendance != null && (
                <p className="mt-2 text-sm font-medium text-slate-700">
                  حضور: <span className="tabular-nums font-bold">{formatCountEn(attendance)}</span>
                </p>
              )}
              <p className={`mt-2 text-[11px] leading-relaxed sm:text-xs ${adminTextMuted}`}>
                {bookings == null
                  ? "قد لا يُرجع الـ API العدد مباشرة؛ يُستكمل من التقرير أو أنواع التذاكر."
                  : bookingsSourceHint}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 ring-1 ring-slate-900/[0.04] sm:p-5">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100/80">
                  <Coins className="size-4 text-amber-600" />
                </div>
                <span className="text-sm font-semibold">السعر</span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-brand-navy sm:text-3xl">{price != null ? formatMoneyEn(price, "") : "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 ring-1 ring-slate-900/[0.04] sm:p-5">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="flex size-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
                  <Users className="size-4 text-slate-600" />
                </div>
                <span className="text-sm font-semibold">السعة</span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-brand-navy sm:text-3xl">{cap != null ? formatCountEn(cap) : "—"}</p>
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      {saveSuccess && (
        <div
          className="flex items-center gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-900 shadow-sm"
          role="status"
        >
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
          <span>تم التحديث بنجاح.</span>
        </div>
      )}

      <form id="admin-event-edit-form" onSubmit={handleSaveDetails} className="space-y-5 md:space-y-6">
        {/* شريط لزجّ: حفظ دائماً ظاهر عند التمرير */}
        <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-3 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md sm:-mx-0 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-brand-navy">تعديل الفعالية</span>
            {isDirty ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
                تغييرات غير محفوظة
              </span>
            ) : (
              <span className={`text-xs ${adminTextMuted}`}>محفوظ</span>
            )}
            {pendingImages.length > 0 && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900 ring-1 ring-sky-200/80">
                {pendingImages.length} ملف جاهز للرفع
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden text-[11px] sm:inline ${adminTextMuted}`}>Ctrl+S للحفظ</span>
            <Button type="submit" disabled={saveLoading} className={`h-10 gap-2 px-5 ${adminBtnPrimary}`}>
              {saveLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              حفظ كل التغييرات
            </Button>
          </div>
        </div>

        <MotionSection delay={0.04}>
          <Card className={adminCardClassStatic}>
            <CardHeader className="border-b border-slate-200/80 pb-4">
              <CardTitle className="text-lg text-brand-navy">البيانات الأساسية</CardTitle>
              <p className={`text-sm ${adminTextMuted}`}>عدّل الحقول ثم اضغط «حفظ كل التغييرات» في الشريط أعلاه أو أسفل الصفحة.</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {saveError ? (
                <div className="rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2.5 text-sm text-red-900" role="alert">
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
                  className="h-11 rounded-xl border-slate-200/90"
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
                  className="h-11 rounded-xl border-slate-200/90"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">السعة</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200/90 tabular-nums"
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
                    className="h-11 rounded-xl border-slate-200/90 tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">آخر موعد للحجز (اختياري)</Label>
                <Input
                  type="datetime-local"
                  value={form.bookingDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, bookingDeadline: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200/90"
                />
              </div>
            </CardContent>
          </Card>
        </MotionSection>

        <MotionSection delay={0.05}>
          <Card className={adminCardClassStatic}>
            <CardHeader className="border-b border-slate-200/80 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-brand-navy">
                <ImageIcon className="size-5 text-sky-600" />
                صور الفعالية
              </CardTitle>
              <p className={`text-sm ${adminTextMuted}`}>
                الغلاف والحذف يُطبّقان فوراً. الملفات الجديدة تُرفع عند الضغط على «حفظ كل التغييرات» مع باقي الحقول. استخدم{" "}
                <span className="font-mono text-xs">images[].id</span> من الـ API.
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
                        className="group relative aspect-[16/9] overflow-hidden rounded-lg border border-slate-200/90 bg-slate-100 shadow-sm transition-shadow hover:shadow-md"
                      >
                        {src ? (
                          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">بدون معاينة</div>
                        )}
                        {isCover && (
                          <span className="absolute left-1.5 top-1.5 rounded bg-sky-800/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            غلاف
                          </span>
                        )}
                        {iid != null && !isCover && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="absolute bottom-1.5 left-1.5 right-1.5 h-7 text-[10px] font-medium opacity-95"
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
                <p className={`rounded-lg border border-dashed border-slate-200/90 bg-slate-50/80 px-3 py-4 text-sm ${adminTextMuted}`}>
                  لا توجد صور بعد. أضف ملفات من الأسفل ثم احفظ.
                </p>
              )}
              <div className="space-y-2 border-t border-slate-200/80 pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <ImagePlus className="size-4 text-sky-600" />
                  إضافة صور جديدة
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPickImages}
                  className="h-11 cursor-pointer rounded-xl border-slate-200/90 bg-white file:me-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-sky-900"
                  disabled={saveLoading}
                />
                {pendingImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">اختر صورة الغلاف من الملفات المحددة:</p>
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
                            name="admin-cover-pending"
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

        <div className="flex justify-center border-t border-slate-200/80 pt-4">
          <Button type="submit" disabled={saveLoading} size="lg" className={`min-w-[min(100%,280px)] gap-2 ${adminBtnPrimary}`}>
            {saveLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ كل التغييرات
          </Button>
        </div>
      </form>

      {/* مرجع من الخادم — دمج المعاينة المكررة */}
      <MotionSection delay={0.06}>
        <Card className={adminCardClassStatic}>
          <CardHeader className="border-b border-slate-200/80 pb-4">
            <CardTitle className="text-lg text-brand-navy">مرجع سريع (كما على الخادم)</CardTitle>
            <p className={`text-sm ${adminTextMuted}`}>
              يتحدث بعد الحفظ. مفيد للمقارنة مع ما في النموذج قبل الحفظ.
            </p>
          </CardHeader>
          <CardContent className="grid gap-6 pt-6 lg:grid-cols-2">
            <div className="space-y-4 text-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">المواعيد والموقع</h4>
              <div className="flex gap-3">
                <Calendar className="mt-0.5 size-5 shrink-0 text-sky-600" />
                <div>
                  <p className="font-medium text-slate-800">البداية</p>
                  <p className="text-slate-600">{ev.startDate ? formatDateTimeEn(ev.startDate) : "—"}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Calendar className="mt-0.5 size-5 shrink-0 text-sky-600" />
                <div>
                  <p className="font-medium text-slate-800">النهاية</p>
                  <p className="text-slate-600">{ev.endDate ? formatDateTimeEn(ev.endDate) : "—"}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-sky-600" />
                <div>
                  <p className="font-medium text-slate-800">الموقع</p>
                  <p className="text-slate-600">{loc ?? "—"}</p>
                </div>
              </div>
              {ev.bookingDeadline && (
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 size-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium text-slate-800">آخر موعد للحجز</p>
                    <p className="text-slate-600">{formatDateEn(ev.bookingDeadline)}</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">الوصف المحفوظ</h4>
              <p className={`whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 ${!ev.description?.trim() ? adminTextMuted : ""}`}>
                {ev.description?.trim() ? ev.description : "لا يوجد وصف."}
              </p>
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.07}>
        <Card className={adminCardClassStatic}>
          <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-200/80 pb-4">
            <Ticket className="size-5 text-sky-600" />
            <CardTitle className="text-lg text-brand-navy">أنواع التذاكر</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {ticketTypes.length === 0 ? (
              <p className={`px-4 py-10 text-center text-sm ${adminTextMuted}`}>لا توجد أنواع تذاكر لهذه الفعالية.</p>
            ) : (
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3 text-right">النوع</th>
                    <th className="w-28 px-4 py-3 text-end tabular-nums">السعر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ticketTypes.map((t, i) => (
                    <tr key={t.id ?? i} className="bg-white/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{t.name ?? t.title ?? `نوع ${i + 1}`}</td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums text-slate-900">
                        {t.price != null ? formatMoneyEn(t.price, "") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </MotionSection>
    </div>
  )
}
