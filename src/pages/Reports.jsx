import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import api from "../api/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Label } from "../components/ui/label"
import { BarChart3, TrendingUp, DollarSign, Users, AlertCircle, Sparkles, Calendar } from "lucide-react"
import { formatCountEn, formatMoneyEn } from "../utils/formatEn"
import {
  normalizeOrganizationSummary,
  normalizeEventPerformance,
  summarizeOrganizationEvents,
  withEventsCountFallback,
} from "../utils/reportPayload"
import { MotionSection, MotionSurface, StaggerItem, StaggerList, DashboardPageSkeleton } from "../components/motion"
import OrganizationTrendCharts from "../components/charts/OrganizationTrendCharts"

function chooseFallbackValue(primary, fallback) {
  if (fallback == null) return primary
  if (primary == null || primary === 0) return fallback
  return primary
}

const KPI_ACCENTS = [
  {
    key: "sales",
    icon: DollarSign,
    iconWrap: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
    bar: "from-emerald-500/15 to-transparent",
  },
  {
    key: "events",
    icon: Calendar,
    iconWrap: "bg-teal-100 text-teal-800 ring-teal-200/80",
    bar: "from-teal-500/15 to-transparent",
  },
  {
    key: "attendees",
    icon: Users,
    iconWrap: "bg-sky-100 text-sky-800 ring-sky-200/80",
    bar: "from-sky-500/15 to-transparent",
  },
  {
    key: "rate",
    icon: BarChart3,
    iconWrap: "bg-violet-100 text-violet-800 ring-violet-200/80",
    bar: "from-violet-500/15 to-transparent",
  },
]

export default function Reports() {
  const [searchParams] = useSearchParams()
  const eventFromUrl = searchParams.get("eventId") ?? ""
  const [events, setEvents] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventReport, setEventReport] = useState(null)
  const [eventReportLoading, setEventReportLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      api.get("/events/organization/my-events"),
      api.get("/reports/organization-summary"),
    ]).then(([evS, sumS]) => {
      const eventsArr =
        evS.status === "fulfilled" && Array.isArray(evS.value.data) ? evS.value.data : []
      setEvents(eventsArr)
      if (sumS.status === "fulfilled") {
        setSummaryError(false)
        const normalized = normalizeOrganizationSummary(sumS.value.data)
        const eventFallback = summarizeOrganizationEvents(eventsArr)
        setSummary(
          withEventsCountFallback(
            {
              ...normalized,
              totalAttendees: chooseFallbackValue(normalized?.totalAttendees, eventFallback.totalTicketsSold),
              bookingRate: chooseFallbackValue(normalized?.bookingRate, eventFallback.bookingRate),
            },
            eventsArr.length
          )
        )
      } else {
        setSummaryError(true)
        setSummary(withEventsCountFallback(null, eventsArr.length))
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!eventFromUrl || events.length === 0) return
    const exists = events.some((ev) => String(ev.id) === String(eventFromUrl))
    if (exists) setSelectedEvent(String(eventFromUrl))
  }, [eventFromUrl, events])

  useEffect(() => {
    if (!selectedEvent) {
      setEventReport(null)
      setEventReportLoading(false)
      return
    }
    setEventReportLoading(true)
    api
      .get(`/reports/event-performance/${selectedEvent}`)
      .then((r) => setEventReport(normalizeEventPerformance(r.data)))
      .catch(() => setEventReport(null))
      .finally(() => setEventReportLoading(false))
  }, [selectedEvent])

  const selectedEventName =
    events.find((ev) => String(ev.id) === String(selectedEvent))?.title ||
    events.find((ev) => String(ev.id) === String(selectedEvent))?.name ||
    null

  const eventMetricCards = [
    {
      key: "ticketsSold",
      title: "التذاكر المباعة",
      value: eventReport?.ticketsSold != null ? formatCountEn(eventReport.ticketsSold) : "—",
      icon: Users,
      accent: "bg-sky-50 text-sky-800 ring-sky-100",
    },
    {
      key: "revenue",
      title: "الإيرادات",
      value: eventReport?.revenue != null ? formatMoneyEn(eventReport.revenue, "") : "—",
      icon: DollarSign,
      accent: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    },
    {
      key: "bookingRate",
      title: "نسبة الحجز",
      value: eventReport?.bookingRate != null ? `${formatCountEn(eventReport.bookingRate)}%` : "—",
      icon: TrendingUp,
      accent: "bg-violet-50 text-violet-800 ring-violet-100",
    },
  ]

  if (loading) {
    return <DashboardPageSkeleton />
  }

  const kpiValues = [
    summary?.totalSales != null ? formatMoneyEn(summary.totalSales, "") : "—",
    summary?.totalEvents != null ? formatCountEn(summary.totalEvents) : "—",
    summary?.totalAttendees != null ? formatCountEn(summary.totalAttendees) : "—",
    summary?.bookingRate != null ? `${formatCountEn(summary.bookingRate)}%` : "—",
  ]

  const kpiLabels = ["إجمالي المبيعات", "عدد النشاطات", "المسافرون / الحجوزات", "نسبة الحجز"]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-10" dir="rtl">
      <header className="flex flex-col gap-2 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-emerald-800/90">
            <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">تقارير المنظمة</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">التقارير والأداء</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
            ملخص مبيعاتك ونشاطاتك، مع مخططات زمنية وأداء لكل رحلة عند الاختيار.
          </p>
        </div>
      </header>

      {summaryError && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 shadow-sm ring-1 ring-amber-900/5"
          role="status"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" strokeWidth={1.75} aria-hidden />
          <p>
            تعذر تحميل ملخص المبيعات من الخادم. يُعرض عدد الرحلات من قائمتك إن وُجدت؛ أعد المحاولة لاحقاً أو راجع
            الاتصال.
          </p>
        </div>
      )}

      <MotionSection aria-label="ملخص المنظمة">
        <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white/95 shadow-sm ring-1 ring-slate-900/[0.04]">
          <CardHeader className="border-b border-slate-100/90 bg-gradient-to-l from-emerald-50/40 via-white to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BarChart3 className="size-5 text-emerald-800" strokeWidth={1.75} />
              ملخص المنظمة
            </CardTitle>
            <CardDescription className="text-[13px] leading-relaxed">
              أرقام موحّدة لكل نشاطك في المنصة — المبيعات تُعرض بالعملة عند توفرها.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {KPI_ACCENTS.map((item, i) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.key}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03] transition-all duration-200 hover:border-emerald-200/60 hover:shadow-md"
                  >
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${item.bar}`}
                      aria-hidden
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{kpiLabels[i]}</p>
                        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[1.65rem]">
                          {kpiValues[i]}
                        </p>
                      </div>
                      <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${item.iconWrap}`}
                      >
                        <Icon className="size-5" strokeWidth={1.75} />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.04} aria-label="اتجاهات زمنية">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">اتجاهات الأداء</h2>
            <p className="mt-0.5 text-sm text-slate-600">مبيعات وتذاكر شهرية — تفاعل مع الرسم لرؤية التفاصيل.</p>
          </div>
        </div>
        <OrganizationTrendCharts events={events} summary={summary} />
      </MotionSection>

      <MotionSection delay={0.05} aria-label="أداء رحلة">
        <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-sm ring-1 ring-slate-900/[0.04]">
          <CardHeader className="border-b border-slate-100/90 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">أداء رحلة معينة</CardTitle>
            <CardDescription className="text-[13px] leading-relaxed">
              اختر رحلة من قائمة «رحلاتي» لعرض مؤشراتها. يتم التحديث تلقائياً بعد الاختيار.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full max-w-lg space-y-2">
                <Label htmlFor="report-event-select" className="text-slate-700">
                  الرحلة
                </Label>
                <select
                  id="report-event-select"
                  className="h-12 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600/25"
                  value={selectedEvent ?? ""}
                  onChange={(e) => setSelectedEvent(e.target.value || null)}
                >
                  <option value="">— اختر رحلة —</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title || ev.name || "بدون عنوان"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 lg:max-w-md">
                {selectedEventName ? (
                  <>
                    <span className="font-medium text-slate-800">المحددة:</span> {selectedEventName}
                  </>
                ) : (
                  "لم يتم اختيار رحلة بعد."
                )}
              </div>
            </div>

            {eventReportLoading ? (
              <StaggerList className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((idx) => (
                  <StaggerItem key={idx}>
                    <div className="animate-pulse rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                      <div className="h-8 w-24 rounded bg-slate-200/70" />
                      <div className="mt-3 h-4 w-32 rounded bg-slate-200/60" />
                    </div>
                  </StaggerItem>
                ))}
              </StaggerList>
            ) : eventReport ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-950">
                  <span className="font-semibold">نتائج الرحلة:</span>{" "}
                  <span className="text-emerald-900/90">{selectedEventName}</span>
                </div>
                <StaggerList key={String(selectedEvent)} className="grid gap-4 md:grid-cols-3">
                  {eventMetricCards.map((metric) => {
                    const Icon = metric.icon
                    return (
                      <StaggerItem key={metric.key}>
                        <MotionSurface>
                          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-5 shadow-sm ring-1 ring-slate-900/[0.03] transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-2xl font-bold tabular-nums text-slate-900">{metric.value}</p>
                                <p className="mt-1 text-sm font-medium text-slate-600">{metric.title}</p>
                              </div>
                              <span className={`rounded-xl p-2.5 ring-1 ${metric.accent}`}>
                                <Icon className="size-5" strokeWidth={1.8} />
                              </span>
                            </div>
                          </div>
                        </MotionSurface>
                      </StaggerItem>
                    )
                  })}
                </StaggerList>
              </div>
            ) : selectedEvent ? (
              <div className="rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/50 px-5 py-8 text-center text-sm text-slate-600">
                لا توجد بيانات أداء متاحة حالياً لهذه الرحلة.
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/50 px-5 py-8 text-center text-sm text-slate-600">
                اختر رحلة أولاً لعرض مؤشرات الأداء.
              </div>
            )}
          </CardContent>
        </Card>
      </MotionSection>
    </div>
  )
}
