import { useEffect, useState, useMemo } from "react"
import api from "../api/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react"
import { formatCountEn, formatDateEn } from "../utils/formatEn"
import { normalizeOrganizationSummary, summarizeOrganizationEvents, withEventsCountFallback } from "../utils/reportPayload"
import {
  StaggerList,
  StaggerItem,
  MotionSection,
  MotionSurface,
  DashboardPageSkeleton,
} from "../components/motion"
import { orgCardClass, orgCardClassSubtle } from "../lib/org-ui"
import OrganizationTrendCharts from "../components/charts/OrganizationTrendCharts"

const iconChips = [
  "bg-emerald-50 text-emerald-800 ring-emerald-100/90",
  "bg-teal-50 text-teal-800 ring-teal-100/90",
  "bg-cyan-50 text-cyan-900 ring-cyan-100/80",
  "bg-lime-50 text-lime-900 ring-lime-100/80",
]

function chooseFallbackValue(primary, fallback) {
  if (fallback == null) return primary
  if (primary == null || primary === 0) return fallback
  return primary
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const stats = useMemo(
    () => [
      {
        title: "إجمالي المبيعات",
        value: summary?.totalSales != null ? formatCountEn(summary.totalSales) : "—",
        icon: DollarSign,
        sub: "على مستوى المنظمة",
      },
      {
        title: "عدد النشاطات",
        value: summary?.totalEvents != null ? formatCountEn(summary.totalEvents) : "—",
        icon: Calendar,
        sub: "رحلات / فعاليات",
      },
      {
        title: "المسافرون",
        value: summary?.totalAttendees != null ? formatCountEn(summary.totalAttendees) : "—",
        icon: Users,
        sub: "إجمالي مسجّل",
      },
      {
        title: "نسبة الحجز",
        value: summary?.bookingRate != null ? `${formatCountEn(summary.bookingRate)}%` : "—",
        icon: TrendingUp,
        sub: "مؤشر أداء",
      },
    ],
    [summary]
  )

  useEffect(() => {
    async function fetchData() {
      try {
        const [sumRes, evRes] = await Promise.allSettled([
          api.get("/reports/organization-summary"),
          api.get("/events/organization/my-events"),
        ])
        const eventsArr =
          evRes.status === "fulfilled" && Array.isArray(evRes.value.data) ? evRes.value.data : []
        setEvents(eventsArr)
        const rawPayload = sumRes.status === "fulfilled" ? sumRes.value.data : null
        const normalized = normalizeOrganizationSummary(rawPayload)
        const eventFallback = summarizeOrganizationEvents(eventsArr)

        const enhancedSummary = {
          ...normalized,
          totalAttendees: chooseFallbackValue(normalized?.totalAttendees, eventFallback.totalTicketsSold),
          bookingRate: chooseFallbackValue(normalized?.bookingRate, eventFallback.bookingRate),
        }

        setSummary(withEventsCountFallback(enhancedSummary, eventsArr.length))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
        setInitialLoading(false)
      }
    }
    fetchData()
  }, [])

  if (initialLoading) {
    return <DashboardPageSkeleton />
  }

  return (
    <div className="space-y-6 xl:space-y-8">
      <MotionSection aria-label="مؤشرات الأداء">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">ملخص الأداء</h2>
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ title, value, icon: Icon, sub }, i) => (
            <StaggerItem key={title}>
              <MotionSurface>
                <Card className={`${orgCardClass} group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2 pt-4">
                    <CardTitle className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
                      {title}
                    </CardTitle>
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors duration-200 group-hover:bg-white/80 ${iconChips[i % iconChips.length]}`}
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <p className="org-stat-value text-2xl md:text-3xl xl:text-4xl font-semibold tracking-tight">
                      {value}
                    </p>
                    <p className="org-text-secondary mt-1.5 text-[11px] font-normal">{sub}</p>
                  </CardContent>
                </Card>
              </MotionSurface>
            </StaggerItem>
          ))}
        </StaggerList>
      </MotionSection>

      <MotionSection delay={0.05} aria-label="اتجاهات ورسوم بيانية">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">اتجاهات الأداء</h2>
        <OrganizationTrendCharts events={events} summary={summary} />
      </MotionSection>

      <MotionSection delay={0.08}>
        <Card className={orgCardClassSubtle}>
          <CardHeader className="pb-2">
            <CardTitle className="org-heading text-lg font-semibold">أحدث الرحلات</CardTitle>
            <CardDescription className="text-[13px] text-slate-500">آخر 5 رحلات مسجّلة في حسابك.</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-emerald-900/15 bg-emerald-50/20 py-10">
                <Calendar className="size-6 text-emerald-400" />
                <p className="text-sm text-slate-600">لا توجد رحلات حتى الآن</p>
                <p className="text-xs text-slate-400">ابدأ بإنشاء أول رحلة ليتم عرضها هنا</p>
              </div>
            ) : (
              <ul className="divide-y divide-emerald-900/10 rounded-xl border border-emerald-900/10 bg-white/60">
                {events.slice(0, 5).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl hover:bg-emerald-50/70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-2 shrink-0 rounded-full bg-emerald-500" />
                      <span className="font-medium text-slate-900">{ev.title || ev.name || "بدون عنوان"}</span>
                    </div>
                    <span className="org-text-secondary text-sm tabular-nums">
                      {ev.startDate ? formatDateEn(ev.startDate) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </MotionSection>
    </div>
  )
}
