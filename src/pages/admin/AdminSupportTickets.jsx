import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { MotionSection, StaggerItem, StaggerList } from "../../components/motion"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { TicketsListSkeleton } from "../../components/motion/TicketsSkeleton"
import {
  escalateUnansweredAdminSupportTickets,
  getAdminSupportTicketsAnalytics,
  listAdminSupportTicketsPage,
} from "../../api/supportTickets"
import { adminCardClass } from "../../lib/admin-ui"
import {
  Activity,
  AlertCircle,
  Clock,
  Eye,
  FolderOpen,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Ticket,
} from "lucide-react"
import { formatDateTimeEn, formatCountEn } from "../../utils/formatEn"
import StatusBadge, { normalizeStatus } from "../../components/support/StatusBadge"
import PriorityBadge, { normalizePriority } from "../../components/support/PriorityBadge"

function extractArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") return value.items ?? value.tickets ?? value.data ?? []
  return []
}

function pickFirst(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k]
      if (v !== undefined && v !== null && v !== "") return v
    }
  }
  return undefined
}

function ticketRequesterLabel(ticket) {
  const directName = pickFirst(ticket, [
    "ownerName",
    "OwnerName",
    "requesterName",
    "RequesterName",
    "userName",
    "UserName",
    "customerName",
    "CustomerName",
    "createdByName",
    "CreatedByName",
  ])
  if (directName) return String(directName)

  const userObj = pickFirst(ticket, ["user", "User", "createdBy", "CreatedBy", "customer", "Customer"])
  const userName =
    pickFirst(userObj, ["fullName", "FullName", "name", "Name", "displayName", "DisplayName"]) ||
    [pickFirst(userObj, ["firstName", "FirstName"]), pickFirst(userObj, ["lastName", "LastName"])]
      .filter(Boolean)
      .join(" ")
      .trim()
  if (userName) return String(userName)

  const companyObj = pickFirst(ticket, ["company", "Company", "organization", "Organization"])
  const companyName = pickFirst(companyObj, ["name", "Name", "title", "Title"])
  if (companyName) return String(companyName)

  return "—"
}

const TAB_OPTIONS = [
  { id: "all", label: "الكل" },
  { id: "user", label: "تذاكر المستخدمين" },
  { id: "org", label: "تذاكر المنظمات" },
  { id: "open", label: "مفتوحة" },
  { id: "pending", label: "معلّقة" },
  { id: "resolved", label: "محلولة" },
]

const PRIORITY_OPTIONS = [
  { value: "", label: "كل الأولويات" },
  { value: "Low", label: "منخفضة" },
  { value: "Medium", label: "متوسطة" },
  { value: "High", label: "عالية" },
  { value: "Critical", label: "حرجة" },
]

/** آخر N يوم لتجميع التذاكر حسب تاريخ الإنشاء (عينة من API) */
function buildTicketsPerDaySeries(rows, dayCount = 14) {
  const labels = []
  const byDay = {}
  const now = new Date()
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    labels.push(key)
    byDay[key] = 0
  }
  rows.forEach((t) => {
    const c = pickFirst(t, ["createdAt", "CreatedAt"])
    if (!c) return
    const key = new Date(c).toISOString().slice(0, 10)
    if (Object.prototype.hasOwnProperty.call(byDay, key)) byDay[key] += 1
  })
  return labels.map((k) => ({ date: k, count: byDay[k] }))
}

function conicGradientFourStops(pcts, colors) {
  const [a, b, c, d] = pcts
  const t0 = 0
  const t1 = a
  const t2 = a + b
  const t3 = a + b + c
  const t4 = 100
  return `conic-gradient(
    ${colors[0]} ${t0}% ${t1}%,
    ${colors[1]} ${t1}% ${t2}%,
    ${colors[2]} ${t2}% ${t3}%,
    ${colors[3]} ${t3}% ${t4}%
  )`
}

function ticketCompanyLabel(ticket) {
  const direct = pickFirst(ticket, [
    "organizationName",
    "OrganizationName",
    "companyName",
    "CompanyName",
    "tenantName",
    "TenantName",
  ])
  if (direct) return String(direct)
  const companyObj = pickFirst(ticket, ["company", "Company", "organization", "Organization", "tenant", "Tenant"])
  return pickFirst(companyObj, ["name", "Name", "title", "Title"]) || "—"
}

export default function AdminSupportTickets() {
  const lineChartGradientId = `support-line-${useId().replace(/:/g, "")}`
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [error, setError] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [escalating, setEscalating] = useState(false)

  const [identityType, setIdentityType] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [skip, setSkip] = useState(0)
  const take = 20
  const [totalCount, setTotalCount] = useState(0)
  const [timeSeries, setTimeSeries] = useState([])
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(true)

  const fetchTimeSeries = useCallback(async () => {
    setTimeSeriesLoading(true)
    try {
      const payload = await listAdminSupportTicketsPage({ take: 500, skip: 0 })
      const rows = extractArray(payload)
      setTimeSeries(buildTicketsPerDaySeries(rows, 14))
    } catch {
      setTimeSeries([])
    } finally {
      setTimeSeriesLoading(false)
    }
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ticketsRes, analyticsRes] = await Promise.allSettled([
        listAdminSupportTicketsPage({
          identityType: identityType || undefined,
          status: statusFilter || undefined,
          q: query || undefined,
          skip,
          take,
        }),
        getAdminSupportTicketsAnalytics(),
      ])

      if (ticketsRes.status === "fulfilled") {
        const payload = ticketsRes.value
        const rows = extractArray(payload)
        setTickets(rows)
        setTotalCount(Number(pickFirst(payload, ["totalCount", "TotalCount"])) || rows.length)
      } else {
        throw ticketsRes.reason
      }

      if (analyticsRes.status === "fulfilled") {
        setAnalytics(analyticsRes.value || null)
      } else {
        setAnalytics(null)
      }
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل تذاكر الدعم")
      setTickets([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityType, query, skip, statusFilter])

  useEffect(() => {
    fetchTimeSeries()
  }, [fetchTimeSeries])

  const applySearch = (e) => {
    e.preventDefault()
    setSkip(0)
    setQuery(queryInput.trim())
  }

  const handleEscalate = async () => {
    if (escalating) return
    setEscalating(true)
    setError(null)
    try {
      await escalateUnansweredAdminSupportTickets(24)
      await load()
      await fetchTimeSeries()
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تصعيد التذاكر غير المجاب عليها")
    } finally {
      setEscalating(false)
    }
  }

  const totalTicketsFromAnalytics = Number(pickFirst(analytics, ["totalTickets", "TotalTickets"]))
  const openCountFromAnalytics = Number(pickFirst(analytics, ["openCount", "OpenCount"]))
  const pendingCountFromAnalytics = Number(pickFirst(analytics, ["pendingCount", "PendingCount"]))
  const resolvedCountFromAnalytics = Number(pickFirst(analytics, ["resolvedCount", "ResolvedCount"]))
  const canceledCountFromAnalytics = Number(pickFirst(analytics, ["canceledCount", "CanceledCount"]))
  const userTicketsFromAnalytics = Number(pickFirst(analytics, ["userTickets", "UserTickets"]))
  const orgTicketsFromAnalytics = Number(pickFirst(analytics, ["organizationTickets", "OrganizationTickets"]))
  const unansweredOver24H = Number(
    pickFirst(analytics, ["unansweredOver24HoursCount", "UnansweredOver24HoursCount"])
  )

  const openCount = Number.isFinite(openCountFromAnalytics)
    ? openCountFromAnalytics
    : tickets.filter((t) => normalizeStatus(pickFirst(t, ["ticketStatus", "TicketStatus", "status", "Status"])) === "Open").length
  const pendingCount = Number.isFinite(pendingCountFromAnalytics)
    ? pendingCountFromAnalytics
    : tickets.filter((t) => normalizeStatus(pickFirst(t, ["ticketStatus", "TicketStatus", "status", "Status"])) === "Pending").length
  const resolvedCount = Number.isFinite(resolvedCountFromAnalytics)
    ? resolvedCountFromAnalytics
    : tickets.filter((t) => normalizeStatus(pickFirst(t, ["ticketStatus", "TicketStatus", "status", "Status"])) === "Resolved").length
  const canceledCount = Number.isFinite(canceledCountFromAnalytics)
    ? canceledCountFromAnalytics
    : tickets.filter((t) => {
        const s = normalizeStatus(pickFirst(t, ["ticketStatus", "TicketStatus", "status", "Status"]))
        return s === "Canceled" || s === "Closed"
      }).length
  const recentUpdatedCount = Number.isFinite(unansweredOver24H)
    ? unansweredOver24H
    : tickets.filter((t) => {
    const lastAt = pickFirst(t, ["lastMessageAt", "LastMessageAt", "updatedAt", "UpdatedAt"])
    if (!lastAt) return false
    const ts = new Date(lastAt).getTime()
    return Number.isFinite(ts) && Date.now() - ts <= 24 * 60 * 60 * 1000
  }).length

  const statusRows = [
    { key: "Open", label: "مفتوحة", count: openCount, barClass: "bg-slate-500/85", dotClass: "bg-slate-500" },
    { key: "Pending", label: "معلّقة", count: pendingCount, barClass: "bg-amber-500/85", dotClass: "bg-amber-500" },
    { key: "Resolved", label: "محلولة", count: resolvedCount, barClass: "bg-emerald-600/85", dotClass: "bg-emerald-600" },
    { key: "Canceled", label: "ملغاة", count: canceledCount, barClass: "bg-rose-500/80", dotClass: "bg-rose-500" },
  ]
  const totalStatusCount = statusRows.reduce((sum, row) => sum + row.count, 0)

  const donutGradient = useMemo(() => {
    if (!totalStatusCount) {
      return "conic-gradient(rgb(226 232 240) 0% 100%)"
    }
    const p = statusRows.map((row) => (row.count / totalStatusCount) * 100)
    return conicGradientFourStops(p, [
      "rgb(100 116 139 / 0.92)",
      "rgb(245 158 11 / 0.9)",
      "rgb(5 150 105 / 0.92)",
      "rgb(244 63 94 / 0.88)",
    ])
  }, [totalStatusCount, openCount, pendingCount, resolvedCount, canceledCount])

  const lineChartModel = useMemo(() => {
    const pts = timeSeries || []
    const max = Math.max(1, ...pts.map((p) => p.count))
    return { pts, max }
  }, [timeSeries])

  const userVsOrg = useMemo(() => {
    const u = Number.isFinite(userTicketsFromAnalytics) ? userTicketsFromAnalytics : 0
    const o = Number.isFinite(orgTicketsFromAnalytics) ? orgTicketsFromAnalytics : 0
    const max = Math.max(u, o, 1)
    return { u, o, max }
  }, [userTicketsFromAnalytics, orgTicketsFromAnalytics])
  const canGoPrev = skip > 0
  const canGoNext = skip + take < totalCount
  const filteredTickets = useMemo(() => {
    if (!priorityFilter) return tickets
    return tickets.filter((t) => {
      const p = normalizePriority(pickFirst(t, ["priority", "Priority"]))
      return p === priorityFilter
    })
  }, [tickets, priorityFilter])

  const applyTab = (tab) => {
    setActiveTab(tab)
    setSkip(0)
    if (tab === "all") {
      setIdentityType("")
      setStatusFilter("")
      return
    }
    if (tab === "user") {
      setIdentityType("User")
      setStatusFilter("")
      return
    }
    if (tab === "org") {
      setIdentityType("Organization")
      setStatusFilter("")
      return
    }
    if (tab === "open") {
      setStatusFilter("Open")
      setIdentityType("")
      return
    }
    if (tab === "pending") {
      setStatusFilter("Pending")
      setIdentityType("")
      return
    }
    if (tab === "resolved") {
      setStatusFilter("Resolved")
      setIdentityType("")
    }
  }

  const radioPillClass = (active) =>
    `inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800/35 ${
      active
        ? "border-teal-800/90 bg-teal-800 text-white shadow-sm ring-1 ring-teal-900/10"
        : "border-slate-200/90 bg-white/90 text-slate-600 hover:border-teal-800/25 hover:bg-teal-50/50 hover:text-brand-navy"
    }`

  if (loading) {
    return (
      <div className="space-y-6">
        <TicketsListSkeleton rows={7} />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/90 bg-rose-50/60 px-4 py-3 text-sm text-rose-950" role="status">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-700" aria-hidden />
          <p>{error}</p>
        </div>
      )}

      <MotionSection aria-label="ملخص الدعم">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-900/[0.04]">
          <div>
            <h2 className="text-base font-semibold text-brand-navy">لوحة دعم العملاء</h2>
            <p className="text-xs text-slate-500">متابعة فورية للتذاكر والحالات وتحديثات اليوم.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Ticket className="size-4 text-slate-400" aria-hidden />
              <span className="tabular-nums">
                {formatCountEn(
                  Number.isFinite(totalTicketsFromAnalytics) ? totalTicketsFromAnalytics : totalCount || tickets.length
                )}
              </span>
            </div>
            <Button type="button" variant="outline" onClick={handleEscalate} disabled={escalating} className="rounded-xl">
              {escalating ? "جارٍ التصعيد..." : "تصعيد >24 ساعة"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                load()
                fetchTimeSeries()
              }}
              className="rounded-xl"
            >
              <RefreshCw className="size-4" aria-hidden />
              تحديث
            </Button>
          </div>
        </div>
      </MotionSection>

      <MotionSection delay={0.03} aria-label="مؤشرات الدعم">
        <StaggerList className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StaggerItem>
            <Card className={`${adminCardClass} overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold tabular-nums text-brand-navy">
                      {formatCountEn(
                        Number.isFinite(totalTicketsFromAnalytics) ? totalTicketsFromAnalytics : totalCount || tickets.length
                      )}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">إجمالي التذاكر</p>
                  </div>
                  <span
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-800/15"
                    aria-hidden
                  >
                    <Layers className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className={`${adminCardClass} overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(openCount)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">تذاكر مفتوحة</p>
                  </div>
                  <span
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-800 shadow-sm ring-1 ring-sky-600/15"
                    aria-hidden
                  >
                    <FolderOpen className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className={`${adminCardClass} overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(pendingCount)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">تذاكر معلّقة</p>
                  </div>
                  <span
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800 shadow-sm ring-1 ring-amber-600/20"
                    aria-hidden
                  >
                    <Clock className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className={`${adminCardClass} overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(recentUpdatedCount)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">تحديثات خلال 24 ساعة</p>
                  </div>
                  <span
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-600/15"
                    aria-hidden
                  >
                    <Activity className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerList>
      </MotionSection>

      <MotionSection delay={0.05} aria-label="تحليل الحالات">
        <Card className={adminCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-brand-navy">لوحة التحليلات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-teal-50/30 p-4 shadow-sm ring-1 ring-slate-900/[0.03]">
                <p className="mb-1 text-xs font-semibold text-brand-navy">توزيع الحالات</p>
                <p className="mb-4 text-[11px] text-slate-500">مفتوحة · معلّقة · محلولة · ملغاة</p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative mx-auto size-44 shrink-0">
                    <div className="absolute inset-0 rounded-full shadow-inner ring-1 ring-slate-900/[0.06]" style={{ background: donutGradient }} />
                    <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
                      <span className="text-2xl font-semibold tabular-nums text-slate-900">
                        {formatCountEn(totalStatusCount)}
                      </span>
                      <span className="text-center text-[11px] leading-tight text-slate-500">إجمالي الحالات</span>
                    </div>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-2 text-sm">
                    {statusRows.map((row) => {
                      const pct = totalStatusCount ? Math.round((row.count / totalStatusCount) * 100) : 0
                      return (
                        <li key={row.key} className="flex items-center justify-between gap-3 border-b border-slate-100/90 pb-2 last:border-0 last:pb-0">
                          <span className="flex items-center gap-2 text-slate-700">
                            <span className={`size-2.5 shrink-0 rounded-full ${row.dotClass}`} />
                            {row.label}
                          </span>
                          <span className="tabular-nums font-medium text-slate-900">
                            {formatCountEn(row.count)}{" "}
                            <span className="text-xs font-normal text-slate-500">({pct}%)</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm ring-1 ring-slate-900/[0.03]">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-navy">التذاكر مع الزمن</p>
                    <p className="text-[11px] text-slate-500">آخر 14 يومًا (حسب تاريخ الإنشاء)</p>
                  </div>
                </div>
                {timeSeriesLoading ? (
                  <div className="h-44 animate-pulse rounded-xl bg-slate-100/90" />
                ) : lineChartModel.pts.length === 0 ? (
                  <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 text-sm text-slate-500">
                    لا توجد بيانات كافية للرسم
                  </div>
                ) : (
                  (() => {
                    const pts = lineChartModel.pts
                    const max = lineChartModel.max
                    const w = 360
                    const h = 158
                    const padX = 12
                    const padY = 18
                    const innerW = w - padX * 2
                    const innerH = h - padY * 2
                    const n = pts.length
                    const step = n <= 1 ? 0 : innerW / (n - 1)
                    const gridLines = 4
                    const coords = pts.map((p, i) => {
                      const x = padX + i * step
                      const y = padY + innerH - (p.count / max) * innerH
                      return `${x},${y}`
                    })
                    const linePoints = coords.join(" ")
                    const areaPoints = `${padX},${padY + innerH} ${linePoints} ${padX + (n - 1) * step},${padY + innerH}`
                    return (
                      <div className="overflow-x-auto">
                        <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full min-w-[280px]" role="img" aria-label="رسم التذاكر عبر الزمن">
                          <defs>
                            <linearGradient id={lineChartGradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgb(17 94 89)" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="rgb(17 94 89)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {Array.from({ length: gridLines + 1 }, (_, gi) => {
                            const gy = padY + (innerH / gridLines) * gi
                            return (
                              <line
                                key={`g-${gi}`}
                                x1={padX}
                                y1={gy}
                                x2={padX + innerW}
                                y2={gy}
                                stroke="rgb(148 163 184 / 0.35)"
                                strokeWidth="1"
                                strokeDasharray={gi === gridLines ? "0" : "4 6"}
                              />
                            )
                          })}
                          <polygon fill={`url(#${lineChartGradientId})`} points={areaPoints} />
                          <polyline
                            fill="none"
                            stroke="rgb(17 94 89)"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={linePoints}
                          />
                          {pts.map((p, i) => {
                            const x = padX + i * step
                            const y = padY + innerH - (p.count / max) * innerH
                            return (
                              <circle key={`${p.date}-${i}`} cx={x} cy={y} r="4" fill="white" stroke="rgb(17 94 89)" strokeWidth="2" />
                            )
                          })}
                        </svg>
                        <div className="mt-2 flex flex-wrap justify-between gap-1 text-[10px] text-slate-500">
                          {pts.map((p) => (
                            <span key={p.date} className="tabular-nums">
                              {p.date.slice(8, 10)}/{p.date.slice(5, 7)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white via-teal-50/20 to-sky-50/30 p-4 shadow-sm ring-1 ring-slate-900/[0.03]">
              <p className="mb-1 text-xs font-semibold text-brand-navy">المستخدمون مقابل المنظمات</p>
              <p className="mb-4 text-[11px] text-slate-500">حسب بيانات التحليلات</p>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">تذاكر المستخدمين</span>
                    <span className="tabular-nums font-semibold text-brand-navy">{formatCountEn(userVsOrg.u)}</span>
                  </div>
                  <div className="h-3.5 overflow-hidden rounded-full bg-slate-200/70 ring-1 ring-slate-900/[0.04]">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-teal-800 to-teal-600 shadow-sm transition-all duration-500"
                      style={{ width: `${(userVsOrg.u / userVsOrg.max) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">تذاكر المنظمات</span>
                    <span className="tabular-nums font-semibold text-brand-navy">{formatCountEn(userVsOrg.o)}</span>
                  </div>
                  <div className="h-3.5 overflow-hidden rounded-full bg-slate-200/70 ring-1 ring-slate-900/[0.04]">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-sky-700 to-sky-500 shadow-sm transition-all duration-500"
                      style={{ width: `${(userVsOrg.o / userVsOrg.max) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.06} aria-label="قائمة التذاكر">
        <Card className={adminCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-brand-navy">قائمة التذاكر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 rounded-2xl border border-slate-200/85 bg-gradient-to-br from-slate-50/90 via-white to-teal-50/20 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
                <form onSubmit={applySearch} className="min-w-0 flex-1">
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-brand-navy">
                    <Search className="size-3.5 text-teal-800/80" aria-hidden />
                    بحث
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <Input
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder="عنوان التذكرة، اسم المالك…"
                      className="h-11 rounded-xl border-slate-200/90 bg-white pr-10 shadow-sm"
                      aria-label="بحث في التذاكر"
                    />
                  </div>
                </form>

                <div className="min-w-0 flex-1 lg:max-w-[52%]">
                  <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-brand-navy">
                    <SlidersHorizontal className="size-3.5 text-teal-800/80" aria-hidden />
                    تصفية سريعة
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-sm">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">الحالة / النوع</p>
                      <div className="flex max-h-[7.5rem] flex-wrap content-start gap-1.5 overflow-y-auto sm:max-h-none" role="radiogroup" aria-label="تصفية التذاكر">
                        {TAB_OPTIONS.map((tab) => (
                          <label key={tab.id} className={radioPillClass(activeTab === tab.id)}>
                            <input
                              type="radio"
                              name="support-tab"
                              className="sr-only"
                              checked={activeTab === tab.id}
                              onChange={() => applyTab(tab.id)}
                            />
                            {tab.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-sm">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">الأولوية</p>
                      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="أولوية التذكرة">
                        {PRIORITY_OPTIONS.map((opt) => (
                          <label key={opt.value || "all-priority"} className={radioPillClass(priorityFilter === opt.value)}>
                            <input
                              type="radio"
                              name="support-priority"
                              className="sr-only"
                              checked={priorityFilter === opt.value}
                              onChange={() => {
                                setPriorityFilter(opt.value)
                                setSkip(0)
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400">الفلترة حسب الأولوية تُطبَّق على العناصر المعروضة حالياً.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/50 py-10 text-center text-sm text-slate-500">
                لا توجد تذاكر حالياً.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-50/70 text-slate-600">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">ID</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">الموضوع</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">الشخص</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">نوع الهوية</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">الحالة</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">الأولوية</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">تاريخ الإنشاء</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">آخر تحديث</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => {
                      const id = pickFirst(t, ["id", "ticketId", "Id"])
                      const subj = pickFirst(t, ["subject", "Subject", "title", "Title"]) || "بدون عنوان"
                      const lastAt = pickFirst(t, ["lastMessageAt", "LastMessageAt", "updatedAt", "UpdatedAt"])
                      const status = normalizeStatus(
                        pickFirst(t, ["statusLabel", "StatusLabel", "ticketStatus", "TicketStatus", "status", "Status"])
                      )
                      const priority = normalizePriority(pickFirst(t, ["priority", "Priority"]))
                      const requester = ticketRequesterLabel(t)
                      const createdAt = pickFirst(t, ["createdAt", "CreatedAt"])
                      const identityType = pickFirst(t, ["identityType", "IdentityType"]) || (ticketCompanyLabel(t) !== "—" ? "Organization" : "User")

                      return (
                        <tr
                          key={id || subj}
                          className="cursor-pointer border-t border-slate-200/70 bg-white/90 transition-colors hover:bg-slate-50/60"
                          onClick={() => id && navigate(`/admin/support/${id}`)}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">#{id || "—"}</td>
                          <td className="max-w-[280px] px-4 py-3">
                            <p className="truncate font-medium text-slate-900">{subj}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{requester}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{identityType}</td>
                          <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={status} /></td>
                          <td className="whitespace-nowrap px-4 py-3"><PriorityBadge priority={priority} /></td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{createdAt ? formatDateTimeEn(createdAt) : "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{lastAt ? formatDateTimeEn(lastAt) : "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-lg px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                id && navigate(`/admin/support/${id}`)
                              }}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                عرض {filteredTickets.length} من أصل {formatCountEn(totalCount || tickets.length)} تذكرة
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={!canGoPrev}
                  onClick={() => setSkip((s) => Math.max(0, s - take))}
                >
                  السابق
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={!canGoNext}
                  onClick={() => setSkip((s) => s + take)}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionSection>
    </div>
  )
}

