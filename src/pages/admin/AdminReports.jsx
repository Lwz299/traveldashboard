import { useState, useEffect, useMemo, Fragment } from "react"
import { Link } from "react-router-dom"
import api from "../../api/api"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  Ticket,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { formatCountEn, formatDateEn, formatMoneyEn } from "../../utils/formatEn"
import { firstDefined } from "../../utils/firstDefined"
import AdminKpiValue from "../../components/admin/AdminKpiValue"
import OrganizationCharts from "../../components/charts/OrganizationCharts"
import AdminTrendCharts from "../../components/charts/AdminTrendCharts"
import { MotionSection, MotionSurface, StaggerItem, StaggerList } from "../../components/motion"
import { adminPageError, adminTextMuted } from "../../lib/admin-ui"
import { AdminCardsSkeleton, AdminTableSkeleton } from "../../components/motion/AdminSkeletons"
import MotionTableRow from "../../components/motion/MotionTableRow"

function orgRowKey(row, idx) {
  return (
    row.organizationId ??
    row.OrganizationId ??
    row.id ??
    row.Id ??
    `idx-${idx}`
  )
}

function orgDisplayName(row) {
  return row.organizationName ?? row.OrganizationName ?? row.name ?? row.Name ?? "—"
}

export default function AdminReports() {
  const [summary, setSummary] = useState(null)
  const [comparison, setComparison] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [expandedKey, setExpandedKey] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const [sumSettled, compSettled, evSettled] = await Promise.allSettled([
          api.get("/super-admin/reports/global-summary"),
          api.get("/super-admin/reports/organization-comparison"),
          api.get("/events"),
        ])

        if (sumSettled.status === "fulfilled") {
          const data = sumSettled.value.data
          setSummary(data && typeof data === "object" ? data : null)
        } else {
          setSummary(null)
        }

        if (compSettled.status === "fulfilled") {
          const data = compSettled.value.data
          const raw = Array.isArray(data)
            ? data
            : data?.items ?? data?.organizations ?? data?.Rows ?? []
          setComparison(Array.isArray(raw) ? raw : [])
        } else {
          setComparison([])
        }

        if (evSettled.status === "fulfilled") {
          const data = evSettled.value.data
          const raw = Array.isArray(data) ? data : data?.items ?? data?.events ?? []
          setAllEvents(Array.isArray(raw) ? raw : [])
        } else {
          setAllEvents([])
        }

        const failed = [sumSettled, compSettled, evSettled].filter((s) => s.status === "rejected")
        if (failed.length === 3) {
          const err = sumSettled.status === "rejected" ? sumSettled.reason : compSettled.reason
          setError(
            err?.response?.data?.message ??
              "تعذر تحميل البيانات"
          )
        } else {
          setError("")
        }
      } catch (err) {
        setError(err.response?.data?.message ?? "تعذر تحميل البيانات")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const eventsByOrg = useMemo(() => {
    const map = new Map()
    for (const ev of allEvents) {
      const oid = ev.organizationId ?? ev.OrganizationId ?? ev.organizationID
      const oname = (ev.organizationName ?? ev.OrganizationName ?? "").trim()
      const key =
        oid != null
          ? `id:${oid}`
          : `name:${oname || "unknown"}`
      if (!map.has(key)) {
        map.set(key, {
          organizationId: oid,
          organizationName: oname,
          trips: [],
        })
      }
      map.get(key).trips.push(ev)
    }
    return map
  }, [allEvents])

  const tripsForOrgRow = (row) => {
    const oid = row.organizationId ?? row.OrganizationId
    const oname = orgDisplayName(row)
    if (oid != null) {
      const g = eventsByOrg.get(`id:${oid}`)
      if (g?.trips?.length) return g.trips
    }
    if (oname && oname !== "—") {
      for (const [, g] of eventsByOrg) {
        if (g.organizationName && g.organizationName === oname) return g.trips
      }
      const g2 = eventsByOrg.get(`name:${oname}`)
      if (g2?.trips?.length) return g2.trips
    }
    return []
  }

  const sortedRows = useMemo(() => {
    return [...comparison].sort((a, b) =>
      orgDisplayName(a).localeCompare(orgDisplayName(b), "ar")
    )
  }, [comparison])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedRows
    return sortedRows.filter((row) => {
      const name = orgDisplayName(row).toLowerCase()
      const id = String(row.organizationId ?? row.OrganizationId ?? "")
      return name.includes(q) || id.includes(q)
    })
  }, [sortedRows, query])

  const totalEvents = firstDefined(summary, ["totalEvents", "TotalEvents", "eventsCount", "EventsCount"])
  const totalTickets = firstDefined(summary, [
    "totalTickets",
    "TotalTickets",
    "ticketsSold",
    "TicketsSold",
    "totalTicketsSold",
    "TotalTicketsSold",
    "soldTickets",
    "SoldTickets",
  ])
  const totalRevenue = firstDefined(summary, ["totalRevenue", "TotalRevenue", "grossRevenue", "GrossRevenue"])
  const totalOrganizations = firstDefined(summary, ["totalOrganizations", "TotalOrganizations", "organizationsCount", "OrganizationsCount"])
  const revenuePerOrg =
    Number(totalOrganizations) > 0 ? Number(totalRevenue || 0) / Number(totalOrganizations) : 0
  const eventsPerOrg = comparison.length > 0 ? allEvents.length / comparison.length : 0

  const summaryCards = summary ? (
    <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      {[
        {
          label: "الفعاليات الكلية",
          value: formatCountEn(totalEvents),
          icon: Calendar,
          sub: "كل المنظمات",
          tone: "bg-cyan-50 text-cyan-800 ring-cyan-100",
        },
        {
          label: "التذاكر المباعة",
          value: formatCountEn(totalTickets),
          icon: Ticket,
          sub: "على مستوى المنصة",
          tone: "bg-sky-50 text-sky-800 ring-sky-100",
        },
        {
          label: "الإيرادات",
          value: formatMoneyEn(totalRevenue),
          icon: Wallet,
          sub: "إجمالي تقديري",
          tone: "bg-emerald-50 text-emerald-800 ring-emerald-100",
        },
        {
          label: "المنظمات",
          value: formatCountEn(totalOrganizations),
          icon: Building2,
          sub: "مسجّلة في المنصة",
          tone: "bg-indigo-50 text-indigo-800 ring-indigo-100",
        },
        {
          label: "منظمات بالمقارنة",
          value: formatCountEn(comparison.length),
          icon: Layers,
          sub: "في تقرير المقارنة",
          tone: "bg-violet-50 text-violet-800 ring-violet-100",
        },
        {
          label: "فعاليات بالقائمة",
          value: formatCountEn(allEvents.length),
          icon: BarChart3,
          sub: "البيانات المحمّلة",
          tone: "bg-teal-50 text-teal-800 ring-teal-100",
        },
        {
          label: "متوسط الإيراد/منظمة",
          value: formatMoneyEn(revenuePerOrg),
          icon: TrendingUp,
          sub: "تقريبي",
          tone: "bg-amber-50 text-amber-800 ring-amber-100",
        },
        {
          label: "متوسط الفعاليات/منظمة",
          value: formatCountEn(Math.round(eventsPerOrg)),
          icon: Activity,
          sub: "من القوائم الحالية",
          tone: "bg-rose-50 text-rose-800 ring-rose-100",
        },
      ].map(({ label, value, icon: Icon, sub, tone }) => (
        <StaggerItem key={label}>
          <MotionSurface>
            <Card className="admin-glass h-full min-h-[146px] border border-white/50 bg-white/60 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:bg-white/80 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-5">
                <CardTitle className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="block truncate">{label}</span>
                </CardTitle>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 shadow-sm ${tone}`}>
                  <Icon className="size-4.5" strokeWidth={1.75} />
                </div>
              </CardHeader>
              <CardContent className="pb-5">
                <AdminKpiValue value={value} size="comfortable" />
                <p className="mt-1 text-[11px] font-medium text-slate-500">{sub}</p>
              </CardContent>
            </Card>
          </MotionSurface>
        </StaggerItem>
      ))}
    </StaggerList>
  ) : null

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7 px-3 py-4 md:px-5 md:py-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-brand-navy md:text-2xl">التقارير المركزية والتحليلات</h1>
          <p className="mt-1 text-sm text-slate-500">نظرة عميقة على مسار المنصة وأداء المنظمات</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200/90 bg-white/80 shadow-sm backdrop-blur-md hover:bg-white" asChild>
            <Link to="/admin/organizations">إدارة المنظمات</Link>
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200/90 bg-white/80 shadow-sm backdrop-blur-md hover:bg-white" asChild>
            <Link to="/admin/events">استعراض الفعاليات</Link>
          </Button>
        </div>
      </div>

      {error && <div className={adminPageError}>{error}</div>}

      {loading ? (
        <div className="space-y-5">
          <AdminCardsSkeleton count={4} gridClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" />
          <AdminTableSkeleton rows={6} />
        </div>
      ) : (
        <>
          <MotionSection className="space-y-4" delay={0.04} aria-label="ملخص المنصة">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">المؤشرات الحيوية</h2>
            {summaryCards ?? (
              <Card className="admin-glass border-white/50 bg-white/60">
                <CardContent className={`py-10 text-center ${adminTextMuted}`}>لا يتوفر ملخص مركزي حالياً</CardContent>
              </Card>
            )}
          </MotionSection>

          <MotionSection className="space-y-4" delay={0.07} aria-label="تحليلات الأداء الزمني">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">تحليلات الأداء الزمني</h2>
            <div className="min-w-0">
              <AdminTrendCharts events={allEvents} summary={summary} />
            </div>
          </MotionSection>

          {comparison.length > 0 && (
            <MotionSection className="space-y-4" delay={0.09} aria-label="تحليلات التوزيع والمقارنة">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">تحليلات التوزيع والمقارنة</h2>
              <OrganizationCharts rows={comparison} />
            </MotionSection>
          )}

          <MotionSection className="space-y-4" delay={0.1} aria-label="مراقبة المنظمات">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-brand-navy sm:text-lg">مراقبة المنظمات التفاعلية</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  لوحة زجاجية لعرض كل بيانات المنظمات — اضغط على الصف لاستعراض الفعاليات المنشورة.
                </p>
              </div>
              <div className="relative w-full shrink-0 lg:max-w-sm">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="بحث سريع باسم المنظمة..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 rounded-xl border border-white/60 bg-white/70 pr-9 shadow-sm backdrop-blur-md transition-all focus:bg-white"
                />
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <Card className="admin-glass border-white/50 bg-white/60">
                <CardContent className={`py-12 text-center text-sm ${adminTextMuted}`}>
                  {comparison.length === 0
                    ? "جارِ انتظار البيانات من الخادم..."
                    : "لا توجد منظمات مطابقة لشروط البحث."}
                </CardContent>
              </Card>
            ) : (
              <div className="admin-glass flex max-h-[min(74vh,920px)] min-h-[430px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/40 shadow-sm ring-1 ring-slate-900/[0.04] backdrop-blur-md">
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[840px] text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-white/50 bg-white/70 text-right text-slate-600 shadow-sm backdrop-blur-xl">
                        <th className="w-10 py-3.5 px-3" />
                        <th className="py-3.5 px-4 font-semibold text-slate-700">المنظمة</th>
                        <th className="py-3.5 px-4 font-semibold text-slate-700">المعرّف</th>
                        <th className="py-3.5 px-4 font-semibold text-slate-700">الرحلات المنشورة</th>
                        <th className="py-3.5 px-4 font-semibold text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            <Ticket className="size-4 text-sky-600" />
                            إجمالي التذاكر
                          </span>
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-slate-700">الإيرادات المحققة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, idx) => {
                        const key = String(orgRowKey(row, idx))
                        const trips = tripsForOrgRow(row)
                        const tripCountFromApi = firstDefined(row, [
                          "eventsCount",
                          "EventsCount",
                          "totalEvents",
                          "TotalEvents",
                        ])
                        const tripCountLive = trips.length
                        const expanded = expandedKey === key
                        const eventsDisplay =
                          tripCountFromApi != null
                            ? formatCountEn(tripCountFromApi)
                            : tripCountLive > 0
                              ? formatCountEn(tripCountLive)
                              : "—"
                        return (
                          <Fragment key={key}>
                            <MotionTableRow
                              className="cursor-pointer border-b transition-colors duration-200 ease-out last:border-0 hover:bg-slate-50/90"
                              delay={idx * 0.02}
                              onClick={() => setExpandedKey(expanded ? null : key)}
                            >
                              <td className="py-3 px-2 text-center text-slate-400">
                                {expanded ? (
                                  <ChevronUp className="size-4 inline text-sky-600" />
                                ) : (
                                  <ChevronDown className="size-4 inline text-slate-400" />
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-800">
                                {orgDisplayName(row)}
                              </td>
                              <td className="py-3.5 px-4 tabular-nums text-slate-500">
                                {row.organizationId ?? row.OrganizationId ?? "—"}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="tabular-nums font-semibold text-slate-700">{eventsDisplay}</span>
                                {tripCountLive > 0 &&
                                  tripCountFromApi != null &&
                                  Number(tripCountFromApi) !== tripCountLive && (
                                    <span className="ms-2 text-[11px] text-sky-600/80 bg-sky-50 px-2 py-0.5 rounded-full">
                                      مُحمّل: {tripCountLive}
                                    </span>
                                  )}
                              </td>
                              <td className="py-3.5 px-4 tabular-nums font-semibold text-slate-700">
                                {formatCountEn(
                                  firstDefined(row, [
                                    "ticketsSold",
                                    "TicketsSold",
                                    "totalTickets",
                                    "TotalTickets",
                                  ])
                                )}
                              </td>
                              <td className="py-3.5 px-4 tabular-nums font-semibold text-brand-sky">
                                {formatMoneyEn(
                                  firstDefined(row, [
                                    "revenue",
                                    "Revenue",
                                    "totalRevenue",
                                    "TotalRevenue",
                                  ])
                                )}
                              </td>
                            </MotionTableRow>
                            {expanded && (
                              <MotionTableRow className="bg-sky-50/30 backdrop-blur-sm" delay={0.02}>
                                <td colSpan={6} className="p-0">
                                  <div className="border-t border-white/50 px-6 py-4 text-right">
                                    <p className="mb-3 text-xs font-semibold text-sky-800 uppercase tracking-wider">
                                      تفاصيل الفعاليات المرتبطة ({trips.length})
                                    </p>
                                    {trips.length === 0 ? (
                                      <p className="py-2 text-sm text-slate-500 italic">
                                        يتم الاعتماد على قائمة "الفعاليات العامة" لتحليل هذا السجل؛ يبدو أنها خالية من رحلات هذه المنظمة أو المعرف غير متطابق بصورة تامة.
                                      </p>
                                    ) : (
                                      <ul className="max-h-52 divide-y divide-white/40 overflow-y-auto rounded-2xl border border-white/60 bg-white/70 shadow-sm sm:max-h-64">
                                        {trips.map((ev) => (
                                          <li
                                            key={ev.id}
                                            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm transition-colors hover:bg-white/90"
                                          >
                                            <span className="font-medium text-slate-800">
                                              {ev.title ?? ev.name ?? `#${ev.id}`}
                                            </span>
                                            <span className="text-xs text-slate-500 bg-slate-100/50 px-2.5 py-1 rounded-lg">
                                              {ev.status ?? "—"}
                                              {ev.startDate
                                                ? ` · ${formatDateEn(ev.startDate)}`
                                                : ""}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </td>
                              </MotionTableRow>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </MotionSection>

          <Card className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/40">
            <CardContent className="py-3 text-center sm:text-start">
              <p className="text-[12px] leading-relaxed text-slate-500">
                أرقام التذاكر والإيرادات لكل منظمة من بيانات المقارنة؛ تفاصيل الرحلات من قائمة الفعاليات العامة عند تطابق المعرف.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
