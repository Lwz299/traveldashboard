import { useEffect, useState, useMemo, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import api from "../api/api"
import { fetchOrganizationBookings, fetchOrganizationBookingDetail } from "../api/bookings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import { ShoppingCart, Ticket, RefreshCw, MapPin, Calendar, Sparkles, Receipt } from "lucide-react"
import { formatCountEn, formatDateTimeEn, formatMoneyEn } from "../utils/formatEn"
import {
  eventIdFromOrderPayload,
  eventTitleFromOrderPayload,
  orderAmountFromPayload,
  organizationAmountFromPayload,
  platformFeeFromPayload,
  paymentReferenceFromPayload,
  bookingFinancialSummary,
  orderRowIdFromPayload,
  orderStatusFromPayload,
  orderCreatedFromPayload,
  eventObjectFromDetail,
  orderDetailPrimitiveEntries,
  eventDetailEntries,
} from "../utils/orderDisplay"
import {
  MotionSection,
  MotionSurface,
  DashboardPageSkeleton,
  InlineDetailSkeleton,
} from "../components/motion"
import { orgCardClass, orgCardClassSubtle, orgBtnPrimary } from "../lib/org-ui"
import {
  normalizeOrdersListPayload,
  mergeOrderDetailFromSources,
} from "../utils/orderNormalize"
import { bookingStatusLabelAr, bookingStatusBadgeClass } from "../utils/bookingStatus"

const btnTap = "transition-transform duration-200 ease-in-out active:scale-[0.98]"

function formatDetailValue(key, value) {
  if (typeof value === "boolean") return value ? "نعم" : "لا"
  const lower = String(key).toLowerCase()
  if (value != null && value !== "" && /amount|price|total|grand|sub|fee|cost/i.test(lower)) {
    const n = Number(value)
    if (Number.isFinite(n)) return formatMoneyEn(n, "")
  }
  const s = String(value)
  if (
    (lower.includes("date") || lower.includes("at")) &&
    s.length >= 8 &&
    !Number.isNaN(Date.parse(s))
  ) {
    try {
      return formatDateTimeEn(s)
    } catch {
      return s
    }
  }
  return s
}

function OrderDetailContent({ detail, eventsById }) {
  const eventObj = eventObjectFromDetail(detail)
  const tripTitle = eventTitleFromOrderPayload(detail, eventsById)
  const eventRows = eventObj ? eventDetailEntries(eventObj) : []
  const finance = bookingFinancialSummary(detail)
  const primitiveRows = orderDetailPrimitiveEntries(detail).filter(
    ({ key }) =>
      !/^(status|Status|totalPrice|TotalPrice|totalAmount|TotalAmount|organizationAmount|OrganizationAmount|platformFee|PlatformFee|paymentReference|PaymentReference)$/.test(
        String(key).split(".")[0]
      )
  )
  const nestedItems = detail?.items ?? detail?.Items ?? detail?.tickets ?? detail?.Tickets
  const hasLineItems = Array.isArray(nestedItems) && nestedItems.length > 0

  return (
    <div className="space-y-4">
      {finance && (
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 ring-1 ring-emerald-900/[0.06]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-900/80">ملخص الحجز والدفع</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {finance.status != null && (
              <div className="flex justify-between gap-2 rounded-lg bg-white/90 px-3 py-2">
                <dt className="text-slate-600">الحالة</dt>
                <dd>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${bookingStatusBadgeClass(finance.status)}`}
                  >
                    {bookingStatusLabelAr(finance.status)}
                  </span>
                </dd>
              </div>
            )}
            {finance.paymentReference && (
              <div className="flex justify-between gap-2 rounded-lg bg-white/90 px-3 py-2 sm:col-span-2">
                <dt className="text-slate-600">مرجع الدفع</dt>
                <dd className="font-mono text-xs font-medium text-slate-900" dir="ltr">
                  {finance.paymentReference}
                </dd>
              </div>
            )}
            {finance.total != null && (
              <div className="flex justify-between gap-2 rounded-lg bg-white/90 px-3 py-2">
                <dt className="text-slate-600">الإجمالي</dt>
                <dd className="font-semibold tabular-nums">{formatMoneyEn(Number(finance.total), "")}</dd>
              </div>
            )}
            {finance.platformFee != null && (
              <div className="flex justify-between gap-2 rounded-lg bg-white/90 px-3 py-2">
                <dt className="text-slate-600">عمولة المنصة</dt>
                <dd className="font-semibold tabular-nums text-amber-900">
                  {formatMoneyEn(Number(finance.platformFee), "")}
                </dd>
              </div>
            )}
            {finance.orgNet != null && (
              <div className="flex justify-between gap-2 rounded-lg bg-white/90 px-3 py-2">
                <dt className="text-slate-600">صافي الوكالة</dt>
                <dd className="font-semibold tabular-nums text-emerald-900">
                  {formatMoneyEn(Number(finance.orgNet), "")}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            يُحدَّث الرصيد في المحفظة تلقائياً عند حالة <strong>Confirmed</strong> بعد دفع العميل من الموبايل.
          </p>
        </div>
      )}
      {eventObj ? (
        <div className="org-card-surface rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 p-4 shadow-sm ring-1 ring-emerald-900/[0.05]">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-600/10 text-emerald-800 shadow-sm ring-1 ring-emerald-600/20">
              <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">الرحلة المرتبطة</p>
              <p className="org-heading mt-1 text-[15px] font-semibold leading-snug">{tripTitle}</p>
            </div>
          </div>
          {eventRows.length > 0 ? (
            <dl className="space-y-2 text-sm">
              {eventRows.map(({ key, label, value }) => (
                <div
                  key={key}
                  className="flex flex-wrap justify-between gap-x-3 gap-y-1 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-emerald-900/[0.06]"
                >
                  <dt className="org-text-secondary text-[13px]">{label}</dt>
                  <dd className="min-w-0 max-w-[min(100%,18rem)] text-end text-sm font-medium break-words text-slate-900">
                    {formatDetailValue(key, value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-600">تفاصيل الرحلة موجودة ككائن؛ لا توجد حقول نصية مباشرة للعرض.</p>
          )}
        </div>
      ) : (
        tripTitle !== "—" && (
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/85 bg-gradient-to-l from-slate-50/95 to-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-900/[0.04]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
              <Calendar className="size-4" aria-hidden />
            </span>
            <div>
              <span className="org-text-secondary text-xs font-medium">الرحلة</span>
              <p className="org-heading mt-0.5 font-semibold leading-snug">{tripTitle}</p>
            </div>
          </div>
        )
      )}

      {primitiveRows.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 ring-1 ring-slate-900/[0.03]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">بيانات الحجز</p>
          <dl className="space-y-2.5 text-sm">
            {primitiveRows.map(({ key, label, value }) => (
              <div
                key={key}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-xl border border-transparent bg-slate-50/50 px-3 py-2 transition-colors hover:border-emerald-200/60 hover:bg-emerald-50/25"
              >
                <dt className="org-text-secondary">{label}</dt>
                <dd className="min-w-0 max-w-[min(100%,20rem)] text-end font-medium break-words text-slate-900">
                  {formatDetailValue(key, value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {!eventObj &&
        tripTitle === "—" &&
        primitiveRows.length === 0 &&
        !hasLineItems &&
        (Object.keys(detail || {}).length > 0 ? (
          <pre
            className="max-h-72 overflow-auto rounded-lg border border-slate-200/90 bg-slate-50/95 p-3 text-start text-[11px] leading-relaxed text-slate-800 [direction:ltr] [unicode-bidi:plaintext]"
            dir="ltr"
          >
            {JSON.stringify(detail, null, 2)}
          </pre>
        ) : (
          <p className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-sm text-amber-900/90">
            لا تتوفر في الاستجابة حقول حجز أو ربط واضح بالرحلة.
          </p>
        ))}

      {hasLineItems && (
        <div className="rounded-2xl border border-teal-200/50 bg-gradient-to-b from-teal-50/40 to-white/90 p-4 ring-1 ring-teal-900/[0.04]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-900/80">بنود الحجز</p>
          <ul className="space-y-2 text-sm text-slate-800">
            {nestedItems.map((it, i) => (
              <li
                key={it?.id ?? i}
                className="rounded-xl border border-white/80 bg-white/95 px-3 py-2.5 leading-relaxed shadow-sm ring-1 ring-slate-900/[0.04]"
              >
                {typeof it === "object" && it != null ? (
                  <span className="block whitespace-normal break-words">
                    {[it.ticketTypeName, it.TicketTypeName, it.name, it.Name, it.title, it.Title].find(
                      (x) => x != null && String(x).trim() !== ""
                    ) ?? `بند ${i + 1}`}
                    {it.quantity != null || it.Quantity != null
                      ? ` × ${it.quantity ?? it.Quantity}`
                      : ""}
                    {it.price != null || it.Price != null || it.unitPrice != null
                      ? ` — ${formatMoneyEn(Number(it.price ?? it.Price ?? it.unitPrice ?? 0), "")}`
                      : ""}
                  </span>
                ) : (
                  String(it)
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function Orders() {
  const [searchParams] = useSearchParams()
  const eventFilter = searchParams.get("eventId") ?? searchParams.get("trip") ?? ""
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderDetail, setOrderDetail] = useState(null)
  const [eventId, setEventId] = useState("")
  const [tickets, setTickets] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [listRefreshing, setListRefreshing] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  /** "api" | "list" — عند فشل الجلب نعرض صف القائمة */
  const [detailSource, setDetailSource] = useState("none")
  /** لإعادة طلب GET تفاصيل الطلب يدوياً */
  const [detailRefetchKey, setDetailRefetchKey] = useState(0)
  /** ملخص آخر محاولات الجلب (للتشخيص عند detailSource === "list") */
  const [detailFetchHint, setDetailFetchHint] = useState(null)

  const eventsById = useMemo(() => {
    const m = {}
    for (const e of events) {
      if (e?.id != null) {
        m[e.id] = e
        m[String(e.id)] = e
      }
    }
    return m
  }, [events])

  const visibleOrders = useMemo(() => {
    if (!eventFilter) return orders
    return orders.filter((o) => {
      const eid = eventIdFromOrderPayload(o)
      return eid != null && String(eid) === String(eventFilter)
    })
  }, [orders, eventFilter])

  const filterEventTitle = useMemo(() => {
    if (!eventFilter) return null
    const ev = eventsById[eventFilter] ?? eventsById[String(eventFilter)]
    return ev?.title ?? ev?.name ?? `رحلة #${eventFilter}`
  }, [eventFilter, eventsById])

  const listStats = useMemo(() => {
    let sum = 0
    let withAmt = 0
    for (const o of visibleOrders) {
      const a = organizationAmountFromPayload(o) ?? orderAmountFromPayload(o)
      if (a != null && Number.isFinite(Number(a))) {
        sum += Number(a)
        withAmt += 1
      }
    }
    return {
      count: visibleOrders.length,
      totalAmount: withAmt > 0 ? sum : null,
    }
  }, [visibleOrders])

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setListRefreshing(true)
    try {
      const list = await fetchOrganizationBookings()
      setOrders(list)
    } catch {
      setOrders([])
    } finally {
      if (!silent) setListRefreshing(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetchOrganizationBookings().catch(() => []),
      api.get("/events/organization/my-events").then((r) => r.data).catch(() => null),
    ])
      .then(([ord, ev]) => {
        setOrders(Array.isArray(ord) ? ord : normalizeOrdersListPayload(ord))
        setEvents(Array.isArray(ev) ? ev : normalizeOrdersListPayload(ev))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedOrder) {
      setOrderDetail(null)
      setDetailSource("none")
      return
    }
    const row = orders.find((o) => String(orderRowIdFromPayload(o)) === String(selectedOrder))
    let cancelled = false
    setDetailLoading(true)
    setDetailSource("none")
    setDetailFetchHint(null)

    /** Booking v2: GET /api/bookings/organization/{bookingId} (تراجع تلقائي إلى orders v1) */
    const bookingId = selectedOrder

    ;(async () => {
      let apiPayload = null
      const attemptNotes = []
      try {
        apiPayload = await fetchOrganizationBookingDetail(bookingId)
        if (apiPayload == null) {
          attemptNotes.push(`/bookings/organization/${bookingId} → 200 لكن لا جسماً صالحاً للحجز`)
        }
      } catch (e) {
        const st = e.response?.status
        const hint =
          st === 403
            ? "403 (غالباً بدون مطالبة orgId في JWT أو ممنوع)"
            : st === 404
              ? "404 (مسار غير منشور أو الحجز لا يخص المنظمة)"
              : st != null
                ? String(st)
                : "خطأ شبكة أو الخادم لا يستجيب"
        attemptNotes.push(`/bookings/organization/${bookingId} → ${hint}`)
      }
      if (cancelled) return
      const merged = mergeOrderDetailFromSources(apiPayload, row)
      setOrderDetail(merged)
      setDetailSource(apiPayload ? "api" : merged ? "list" : "none")
      setDetailFetchHint(apiPayload || !merged ? null : attemptNotes.join(" | "))
      setDetailLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [selectedOrder, orders, detailRefetchKey])

  useEffect(() => {
    if (!orderDetail) return
    const eid = eventIdFromOrderPayload(orderDetail)
    if (eid != null) setEventId(String(eid))
  }, [orderDetail])

  /** إذا عرفنا معرّف رحلة ولا يوجد عنوان في القائمة، نجلب الفعالية العامة */
  useEffect(() => {
    const eid = orderDetail ? eventIdFromOrderPayload(orderDetail) : null
    if (eid == null) return
    if (eventsById[eid] || eventsById[String(eid)]) return
    let cancelled = false
    api
      .get(`/events/${eid}`)
      .then(({ data }) => {
        if (cancelled || !data || typeof data !== "object") return
        const id = data.id ?? data.Id
        if (id == null) return
        setEvents((prev) => {
          if (prev.some((x) => String(x?.id) === String(id))) return prev
          return [...prev, data]
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [orderDetail, eventsById])

  const fetchTicketTypes = async (e) => {
    e?.preventDefault()
    if (!eventId) return
    try {
      const { data } = await api.get(`/ticket-types/event/${eventId}`)
      setTickets(Array.isArray(data) ? data : [])
    } catch {
      setTickets([])
    }
  }

  const statusLabelAr = bookingStatusLabelAr
  const statusBadgeClass = bookingStatusBadgeClass

  if (loading) {
    return <DashboardPageSkeleton />
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl pb-10" dir="rtl">
      <div
        className="pointer-events-none absolute -left-32 -top-28 size-[22rem] rounded-full bg-emerald-400/15 blur-3xl md:size-[28rem]"
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-24 top-40 size-56 rounded-full bg-teal-400/10 blur-3xl" aria-hidden />

      <div className="relative space-y-8">
      {eventFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/60 px-4 py-3 text-sm text-sky-950">
          <span>
            عرض حجوزات: <strong>{filterEventTitle}</strong> ({formatCountEn(visibleOrders.length)} حجز)
          </span>
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl" asChild>
            <Link to="/bookings">كل الحجوزات</Link>
          </Button>
        </div>
      )}
      <header className="org-card-surface flex flex-col gap-4 rounded-3xl p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-2.5 py-1 text-emerald-900 ring-1 ring-emerald-600/15">
            <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">لوحة المنظمة</span>
          </div>
          <h1 className="org-heading text-2xl font-bold tracking-tight sm:text-3xl">المبيعات والحجوزات</h1>
          <p className="org-text-secondary mt-2 max-w-xl text-sm leading-relaxed">
            قائمة الحجوزات المرتبطة برحلاتك (Booking v2)؛ اختر صفاً للتفاصيل بما فيها عمولة المنصة ومرجع الدفع.
          </p>
        </div>
        {listStats.count > 0 && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200/85 bg-white/90 px-4 py-2.5 text-sm shadow-sm ring-1 ring-slate-900/[0.04]">
              <Receipt className="size-4 text-emerald-700" aria-hidden />
              <span className="org-stat-value text-xl font-bold">{formatCountEn(listStats.count)}</span>
              <span className="org-text-secondary text-sm">حجز</span>
            </span>
            {listStats.totalAmount != null && (
              <span className="inline-flex flex-col gap-0.5 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 px-4 py-2.5 shadow-sm ring-1 ring-emerald-900/[0.07] sm:min-w-[200px] sm:items-end">
                <span className="org-text-secondary text-[11px] font-medium">مجموع المبالغ (القائمة)</span>
                <span className="org-stat-value text-lg font-bold tabular-nums">
                  {formatMoneyEn(listStats.totalAmount, "")}
                </span>
              </span>
            )}
          </div>
        )}
      </header>

      <MotionSection delay={0.04}>
        <MotionSurface>
          <Card className={`${orgCardClass} overflow-hidden`}>
            <CardHeader className="border-b border-emerald-900/[0.07] bg-gradient-to-l from-emerald-50/40 via-white to-teal-50/20 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15">
                    <ShoppingCart className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="org-heading text-lg font-semibold">قائمة الحجوزات</CardTitle>
                    <CardDescription className="text-[13px] text-slate-600">
                      المبالغ بالدينار. الحالة: بانتظار الدفع · مؤكد · منتهي · ملغى.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 gap-2 rounded-xl border-emerald-800/15 bg-white/80 text-emerald-900 hover:bg-emerald-50/90"
                  disabled={listRefreshing}
                  onClick={() => loadOrders(false)}
                >
                  <RefreshCw className={`size-4 ${listRefreshing ? "animate-spin" : ""}`} aria-hidden />
                  تحديث القائمة
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {visibleOrders.length === 0 ? (
                <div className="px-4 py-16 text-center sm:px-6">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                    <ShoppingCart className="size-8 text-emerald-600/50" strokeWidth={1.25} aria-hidden />
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-800">
                    {eventFilter ? "لا توجد حجوزات لهذه الرحلة" : "لا توجد حجوزات بعد"}
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                    عند اكتمال الحجوزات ستظهر هنا مع ربط الرحلة والمبلغ والحالة.
                  </p>
                </div>
              ) : (
                <div className="max-h-[min(520px,65vh)] w-full overflow-auto rounded-b-2xl">
                  <table className="w-full min-w-[720px] border-collapse text-[13px] leading-snug">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-emerald-900/10 bg-gradient-to-b from-slate-50/98 to-slate-50/90 shadow-[0_1px_0_0_rgb(16_185_129/0.08)] backdrop-blur-sm">
                        <th className="w-24 px-3 py-3.5 text-right text-xs font-semibold text-slate-600 sm:px-4">
                          رقم الحجز
                        </th>
                        <th className="min-w-[240px] max-w-md px-3 py-3.5 text-right text-xs font-semibold text-slate-600 sm:px-4">
                          الرحلة
                        </th>
                        <th className="w-36 px-3 py-3.5 text-end text-xs font-semibold tabular-nums text-slate-600 sm:px-4">
                          صافي الوكالة
                        </th>
                        <th className="w-36 px-3 py-3.5 text-right text-xs font-semibold text-slate-600 sm:px-4">
                          الحالة
                        </th>
                        <th className="w-44 px-3 py-3.5 text-right text-xs font-semibold text-slate-600 sm:px-4">
                          التاريخ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/90">
                      {visibleOrders.map((o, idx) => {
                        const rid = orderRowIdFromPayload(o)
                        const key = rid != null ? String(rid) : `row-${idx}`
                        const eventTitle = eventTitleFromOrderPayload(o, eventsById)
                        const amt = organizationAmountFromPayload(o) ?? orderAmountFromPayload(o)
                        const fee = platformFeeFromPayload(o)
                        const payRef = paymentReferenceFromPayload(o)
                        const st = orderStatusFromPayload(o)
                        const created = orderCreatedFromPayload(o)
                        const selected = selectedOrder != null && String(selectedOrder) === String(rid)

                        return (
                          <tr
                            key={key}
                            role="button"
                            tabIndex={0}
                            onClick={() => rid != null && setSelectedOrder(rid)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                rid != null && setSelectedOrder(rid)
                              }
                            }}
                            className={[
                              "cursor-pointer transition-colors duration-150",
                              idx % 2 === 0 ? "bg-white/95" : "bg-emerald-50/20",
                              selected
                                ? "bg-gradient-to-l from-emerald-50/95 to-teal-50/40 shadow-[inset_3px_0_0_0_rgb(16_185_129)] hover:from-emerald-50 hover:to-teal-50/50"
                                : "hover:bg-emerald-50/40",
                            ].join(" ")}
                          >
                            <td className="px-3 py-3 font-mono text-sm font-semibold tabular-nums text-slate-900 sm:px-4">
                              <span className="block">#{rid ?? "—"}</span>
                              {payRef ? (
                                <span className="mt-0.5 block max-w-[7rem] truncate font-sans text-[10px] font-normal text-slate-500" dir="ltr" title={payRef}>
                                  {payRef}
                                </span>
                              ) : null}
                            </td>
                            <td className="min-w-0 max-w-md px-3 py-3 text-slate-800 sm:px-4">
                              <span className="block whitespace-normal break-words font-medium leading-snug">
                                {eventTitle}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-end font-semibold tabular-nums text-slate-900 sm:px-4">
                              <span className="block">{amt != null ? formatMoneyEn(Number(amt), "") : "—"}</span>
                              {fee != null && (
                                <span className="block text-[10px] font-normal text-amber-800/90">
                                  عمولة: {formatMoneyEn(Number(fee), "")}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 sm:px-4">
                              {st ? (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusBadgeClass(st)}`}
                                >
                                  {statusLabelAr(st)}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600 sm:px-4">
                              {created
                                ? formatDateTimeEn(typeof created === "string" ? created : String(created))
                                : "—"}
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
        </MotionSurface>
      </MotionSection>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8">
        <MotionSection delay={0.06}>
          <MotionSurface>
            <Card className={`${orgCardClassSubtle} flex h-full min-h-[280px] flex-col`}>
              <CardHeader className="space-y-1 border-b border-emerald-900/[0.06] bg-gradient-to-l from-emerald-50/30 to-transparent pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/12">
                    <Receipt className="size-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="org-heading text-base font-semibold">تفاصيل الحجز</CardTitle>
                    <CardDescription className="text-[13px]">
                      {selectedOrder ? (
                        <>
                          الحجز <span className="font-mono font-semibold text-slate-800">#{selectedOrder}</span>
                        </>
                      ) : (
                        "اختر حجزاً من الجدول أعلاه"
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[min(70vh,640px)] flex-1 overflow-y-auto pt-4">
                {!selectedOrder ? (
                  <div className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 px-4 py-10 text-center">
                    <p className="text-sm font-medium text-slate-700">لم يُحدد حجز</p>
                    <p className="mt-1 text-sm text-slate-500">اضغط على صف في الجدول لعرض البيانات الكاملة.</p>
                  </div>
                ) : detailLoading ? (
                  <InlineDetailSkeleton rows={8} />
                ) : orderDetail ? (
                  <>
                    {detailSource === "list" && (
                      <div className="mb-3 flex flex-col gap-2 rounded-lg border border-amber-200/90 bg-amber-50/75 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                          <p className="text-[12px] leading-relaxed text-amber-950/90">
                            <span className="font-semibold">هذا تنبيه وليس عطلاً في الواجهة:</span> لم يُرجع الخادم
                            تفاصيل الحجز عبر مسار المنظمة، لذلك يُعرض فقط ما في <strong>صف الجدول</strong>. السبب
                            الشائع: مسار{" "}
                            <code className="rounded bg-amber-100/90 px-1 text-[11px]">GET /api/bookings/organization/:id</code> غير
                            منشور أو يعيد خطأ، أو التوكن بلا مطالبة <code className="text-[11px]">orgId</code>، أو الحجز لا يخص المنظمة.
                          </p>
                          {detailFetchHint ? (
                            <p
                              className="break-all rounded-md border border-amber-200/80 bg-white/70 px-2 py-1.5 text-[11px] leading-snug text-slate-800 [direction:ltr] [unicode-bidi:plaintext]"
                              dir="ltr"
                            >
                              {detailFetchHint}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 gap-1.5 rounded-lg border-amber-300/80 text-amber-950"
                          onClick={() => setDetailRefetchKey((k) => k + 1)}
                        >
                          <RefreshCw className="size-3.5" aria-hidden />
                          إعادة المحاولة
                        </Button>
                      </div>
                    )}
                    <OrderDetailContent detail={orderDetail} eventsById={eventsById} />
                  </>
                ) : (
                  <p className="text-sm text-slate-500">تعذر تحميل التفاصيل.</p>
                )}
              </CardContent>
            </Card>
          </MotionSurface>
        </MotionSection>

        <MotionSection delay={0.08}>
          <MotionSurface>
            <Card className={`${orgCardClassSubtle} flex h-full min-h-[280px] flex-col`}>
              <CardHeader className="space-y-1 border-b border-emerald-900/[0.06] bg-gradient-to-l from-teal-50/35 to-transparent pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-teal-100/80 text-teal-900 ring-1 ring-teal-200/80">
                    <Ticket className="size-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="org-heading text-base font-semibold">أنواع التذاكر</CardTitle>
                    <CardDescription className="text-[13px]">أسعار أنواع التذاكر لأي رحلة من قائمتك.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4 pt-4">
                <form onSubmit={fetchTicketTypes} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor="orders-event-pick" className="text-slate-700">
                      الرحلة
                    </Label>
                    <select
                      id="orders-event-pick"
                      className="h-11 w-full rounded-xl border border-emerald-900/15 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                    >
                      <option value="">— اختر رحلة —</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title ?? ev.name ?? "بدون عنوان"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    disabled={!eventId}
                    className={`h-11 shrink-0 rounded-xl px-5 ${orgBtnPrimary} ${btnTap}`}
                  >
                    عرض الأنواع
                  </Button>
                </form>

                <div className="min-h-0 flex-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.03]">
                  <table className="w-full min-w-[280px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/90 bg-slate-50/95 text-xs font-semibold text-slate-600">
                        <th className="px-3 py-2.5 text-right">النوع</th>
                        <th className="w-36 px-3 py-2.5 text-end tabular-nums">السعر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tickets.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-3 py-10 text-center text-sm text-slate-500">
                            اختر رحلة ثم اضغط «عرض الأنواع» لعرض الأسعار هنا.
                          </td>
                        </tr>
                      ) : (
                        tickets.map((t, i) => (
                          <tr key={t.id ?? i} className="transition-colors hover:bg-emerald-50/50">
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {t.name ?? t.title ?? `نوع ${i + 1}`}
                            </td>
                            <td className="px-3 py-2.5 text-end font-semibold tabular-nums text-emerald-900">
                              {t.price != null ? formatMoneyEn(Number(t.price), "") : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </MotionSurface>
        </MotionSection>
      </div>
      </div>
    </div>
  )
}
