import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "../../api/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import {
  Building2,
  Wallet,
  Calendar,
  BarChart3,
  FolderTree,
  ArrowLeft,
  Users,
  Megaphone,
  Landmark,
  Ticket,
  Activity,
  TrendingUp,
  LineChart,
} from "lucide-react"
import { formatCountEn, formatMoneyEn } from "../../utils/formatEn"
import { firstDefined } from "../../utils/firstDefined"
import AdminKpiValue from "../../components/admin/AdminKpiValue"
import OrganizationCharts from "../../components/charts/OrganizationCharts"
import { useAdminChartData } from "../../components/charts/useAdminChartData"
import { AdminRevenueChart, AdminTicketsChart, AdminGrowthChart } from "../../components/charts/AdminTrendCharts"
import { StaggerList, StaggerItem, MotionSection, MotionSurface, DashboardPageSkeleton } from "../../components/motion"
import { getSuperAdminNotificationsDelivered } from "../../api/notifications"

const kpiKeys = {
  events: ["totalEvents", "TotalEvents", "eventsCount", "EventsCount"],
  tickets: [
    "totalTickets",
    "TotalTickets",
    "ticketsSold",
    "TicketsSold",
    "totalTicketsSold",
    "TotalTicketsSold",
    "soldTickets",
    "SoldTickets",
  ],
  revenue: ["totalRevenue", "TotalRevenue", "grossRevenue", "GrossRevenue"],
  orgs: ["totalOrganizations", "TotalOrganizations", "organizationsCount", "OrganizationsCount"],
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [comparison, setComparison] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [quickStats, setQuickStats] = useState({
    pendingPayouts: null,
    deliveredNotifications: null,
    endUsers: null,
    partnerApplications: null,
  })

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      api.get("/super-admin/reports/global-summary"),
      api.get("/super-admin/reports/organization-comparison"),
      api.get("/events"),
    ])
      .then(([sumS, compS, evS]) => {
        if (sumS.status === "fulfilled") setSummary(sumS.value.data)
        else setSummary(null)
        if (compS.status === "fulfilled") {
          const data = compS.value.data
          const raw = Array.isArray(data)
            ? data
            : data?.items ?? data?.organizations ?? data?.Rows ?? []
          setComparison(Array.isArray(raw) ? raw : [])
        } else setComparison([])
        if (evS.status === "fulfilled") {
          const data = evS.value.data
          const raw = Array.isArray(data) ? data : data?.items ?? data?.events ?? []
          setAllEvents(Array.isArray(raw) ? raw : [])
        } else setAllEvents([])
      })
      .finally(() => setLoading(false))
  }, [])

  const { series, mom, hasData } = useAdminChartData(allEvents, summary)
  const revenueValue = firstDefined(summary, kpiKeys.revenue)
  const eventsValue = firstDefined(summary, kpiKeys.events)
  const ticketsValue = firstDefined(summary, kpiKeys.tickets)
  const orgsValue = firstDefined(summary, kpiKeys.orgs)
  const avgRevenuePerOrg = Number(orgsValue) > 0 ? Number(revenueValue || 0) / Number(orgsValue) : 0
  const avgTicketsPerEvent = Number(eventsValue) > 0 ? Number(ticketsValue || 0) / Number(eventsValue) : 0
  const growthText = mom?.pct != null ? `${mom.direction === "up" ? "+" : ""}${mom.pct}%` : "—"

  useEffect(() => {
    let alive = true

    const extractTotalCount = (data) => {
      if (!data || typeof data !== "object") return null
      const items = data.items ?? data.Items
      const total = data.totalCount ?? data.TotalCount
      if (total != null && Number.isFinite(Number(total))) return Number(total)
      if (Array.isArray(items)) return items.length
      if (Array.isArray(data)) return data.length
      return null
    }

    const loadQuick = async () => {
      const endUsersValue =
        firstDefined(summary, ["totalUsers", "TotalUsers", "usersCount", "UsersCount", "endUsers", "EndUsers"]) ?? null

      try {
        const [pendingRes, deliveredRes, partnersRes] = await Promise.allSettled([
          api.get("/payouts/pending"),
          getSuperAdminNotificationsDelivered({ skip: 0, take: 1 }),
          api.get("/partner-applications/pending"),
        ])

        const pendingCount =
          pendingRes.status === "fulfilled"
            ? Array.isArray(pendingRes.value?.data)
              ? pendingRes.value.data.length
              : (pendingRes.value?.data?.items ?? pendingRes.value?.data?.payouts ?? []).length
            : null

        const deliveredTotal =
          deliveredRes.status === "fulfilled" ? extractTotalCount(deliveredRes.value) : null

        const partnerCount =
          partnersRes.status === "fulfilled"
            ? Array.isArray(partnersRes.value?.data)
              ? partnersRes.value.data.length
              : (partnersRes.value?.data?.items ?? partnersRes.value?.data?.applications ?? []).length
            : null

        if (!alive) return
        setQuickStats({
          pendingPayouts: pendingCount,
          deliveredNotifications: deliveredTotal,
          endUsers: endUsersValue,
          partnerApplications: partnerCount,
        })
      } catch {
        if (!alive) return
        setQuickStats((s) => ({ ...s, endUsers: endUsersValue }))
      }
    }

    loadQuick()
    return () => {
      alive = false
    }
  }, [summary])

  const cards = [
    {
      to: "/admin/partners",
      icon: Building2,
      title: "طلبات الشركاء",
      desc: "مراجعة واعتماد طلبات انضمام المنظمين",
      chip: "bg-amber-50 text-amber-700 ring-amber-100",
    },
    {
      to: "/admin/organizations",
      icon: Users,
      title: "المنظمات",
      desc: "قائمة كل المنظمات وتعديل بياناتها",
      chip: "bg-sky-50 text-sky-700 ring-sky-100",
    },
    {
      to: "/admin/events",
      icon: Calendar,
      title: "جميع الفعاليات",
      desc: "عرض وتعديل وإلغاء أي فعالية",
      chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    {
      to: "/admin/categories",
      icon: FolderTree,
      title: "التصنيفات",
      desc: "إدارة تصنيفات الفعاليات",
      chip: "bg-violet-50 text-violet-700 ring-violet-100",
    },
    {
      to: "/admin/reports",
      icon: BarChart3,
      title: "التقارير المركزية",
      desc: "ملخص المنصة ومقارنة المنظمين",
      chip: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    },
    {
      to: "/admin/finance",
      icon: Landmark,
      title: "المالية",
      desc: "محفظة المنصة، حركات العمولة",
      chip: "bg-indigo-50 text-indigo-800 ring-indigo-100",
    },
    {
      to: "/admin/payouts",
      icon: Wallet,
      title: "طلبات السحب",
      desc: "اعتماد طلبات تحويل الأرباح",
      chip: "bg-sky-50 text-sky-800 ring-sky-100",
    },
    {
      to: "/admin/notifications",
      icon: Megaphone,
      title: "إشعار جماعي",
      desc: "إرسال إشعار للجميع (broadcast)",
      chip: "bg-rose-50 text-rose-800 ring-rose-100",
    },
  ]

  if (loading) {
    return <DashboardPageSkeleton />
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 px-3 py-4 md:px-5 md:py-6" dir="rtl">
      <MotionSection delay={0.02} aria-label="ملخص سريع للأقسام">
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">ملخص سريع</h2>
          <p className="text-[11px] text-slate-500">أرقام سريعة</p>
        </div>
        <StaggerList className="grid items-stretch gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              to: "/admin/organizations",
              label: "المستخدمون (End Users)",
              value: quickStats.endUsers != null ? formatCountEn(quickStats.endUsers) : "—",
              Icon: Users,
              tone: "bg-sky-50 text-sky-800 ring-sky-100",
              hint: "من ملخص التقرير إن توفر",
            },
            {
              to: "/admin/partners",
              label: "طلبات الانضمام كشريك",
              value:
                quickStats.partnerApplications != null ? formatCountEn(quickStats.partnerApplications) : "—",
              Icon: Building2,
              tone: "bg-violet-50 text-violet-800 ring-violet-100",
              hint: "طلبات بانتظار المراجعة",
            },
            {
              to: "/admin/payouts",
              label: "طلبات السحب المعلّقة",
              value: quickStats.pendingPayouts != null ? formatCountEn(quickStats.pendingPayouts) : "—",
              Icon: Wallet,
              tone: "bg-amber-50 text-amber-800 ring-amber-100",
              hint: "قائمة المعلّقة",
            },
            {
              to: "/admin/notifications",
              label: "إجمالي الإشعارات (Delivered)",
              value:
                quickStats.deliveredNotifications != null ? formatCountEn(quickStats.deliveredNotifications) : "—",
              Icon: Megaphone,
              tone: "bg-rose-50 text-rose-800 ring-rose-100",
              hint: "سجل التسليم",
            },
          ].map(({ to, label, value, Icon, tone, hint }) => (
            <StaggerItem key={to}>
              <MotionSurface>
                <Link
                  to={to}
                  className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2"
                >
                  <Card className="admin-glass h-full min-h-[96px] border border-white/50 bg-white/60 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:bg-white/85 hover:shadow-md">
                    <CardHeader className="p-3 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <span className="block truncate">{label}</span>
                        </CardTitle>
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ${tone}`}>
                          <Icon className="size-4" strokeWidth={1.9} />
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-1">
                      <AdminKpiValue value={value} size="compact" as="div" />
                      <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-500">{hint}</p>
                    </CardContent>
                  </Card>
                </Link>
              </MotionSurface>
            </StaggerItem>
          ))}
        </StaggerList>
      </MotionSection>

      {/* Top Summary KPIs */}
      {summary && (
        <MotionSection delay={0.03} aria-label="ملخص المنصة">
          <StaggerList className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "إجمالي الإيرادات",
                value: formatMoneyEn(revenueValue, ""),
                sub: "تقديري شهري",
                Icon: Wallet,
                tone: "bg-emerald-50 text-emerald-800 ring-emerald-100",
              },
              {
                label: "إجمالي الفعاليات",
                value: formatCountEn(eventsValue),
                sub: "على مستوى المنصة",
                Icon: Calendar,
                tone: "bg-cyan-50 text-cyan-800 ring-cyan-100",
              },
              {
                label: "التذاكر المباعة",
                value: formatCountEn(ticketsValue),
                sub: "إجمالي",
                Icon: Ticket,
                tone: "bg-sky-50 text-sky-800 ring-sky-100",
              },
              {
                label: "المنظمات",
                value: formatCountEn(orgsValue),
                sub: "مسجّلة",
                Icon: Building2,
                tone: "bg-indigo-50 text-indigo-800 ring-indigo-100",
              },
              {
                label: "متوسط الإيراد/منظمة",
                value: formatMoneyEn(Math.round(avgRevenuePerOrg), ""),
                sub: "تقديري",
                Icon: Landmark,
                tone: "bg-violet-50 text-violet-800 ring-violet-100",
              },
              {
                label: "متوسط التذاكر/فعالية",
                value: formatCountEn(Math.round(avgTicketsPerEvent)),
                sub: "تقريبي",
                Icon: Activity,
                tone: "bg-amber-50 text-amber-800 ring-amber-100",
              },
              {
                label: "النمو الشهري",
                value: growthText,
                sub: "آخر مقارنة",
                Icon: TrendingUp,
                tone: "bg-rose-50 text-rose-800 ring-rose-100",
              },
              {
                label: "عدد أشهر التحليل",
                value: formatCountEn(series.length),
                sub: "في الرسم الزمني",
                Icon: LineChart,
                tone: "bg-teal-50 text-teal-800 ring-teal-100",
              },
            ].map(({ label, value, sub, Icon, tone }) => (
              <StaggerItem key={label}>
                <MotionSurface>
                  <Card className="admin-glass h-full min-h-[118px] border border-white/50 bg-white/60 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:bg-white/80 hover:shadow-md">
                    <CardHeader className="p-3 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {label}
                        </CardTitle>
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ${tone}`}>
                          <Icon className="size-4" strokeWidth={1.9} />
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-1">
                      <div className="flex items-end justify-between gap-3">
                        <AdminKpiValue value={value} size="compact" className="min-w-0 flex-1" />
                        <p className="mb-0.5 text-[11px] font-medium text-slate-500">{sub}</p>
                      </div>
                    </CardContent>
                  </Card>
                </MotionSurface>
              </StaggerItem>
            ))}
          </StaggerList>
        </MotionSection>
      )}

      {/* Primary Analytics: Main trend + supporting insights */}
      {hasData && (
        <MotionSection delay={0.05} aria-label="التحليلات الرئيسية">
          <div className="grid items-stretch gap-4 xl:grid-cols-12 xl:gap-5">
            <div className="min-w-0 xl:col-span-8">
              <AdminRevenueChart series={series} hasData={hasData} gradId="revMain" />
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
              <div className="h-full">
                <AdminGrowthChart mom={mom} hasData={hasData} />
              </div>
              <div className="h-full">
                <AdminTicketsChart series={series} hasData={hasData} />
              </div>
            </div>
          </div>
        </MotionSection>
      )}

      {/* Secondary Analytics: Distribution + comparison */}
      {comparison.length > 0 && (
        <MotionSection delay={0.06} aria-label="تحليلات التوزيع والمقارنة">
          <div className="mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">تحليلات التوزيع والمقارنة</h2>
          </div>
          <OrganizationCharts rows={comparison} />
        </MotionSection>
      )}

      {/* Quick Actions: compact and visually secondary */}
      <MotionSection delay={0.07} aria-label="الإجراءات السريعة">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">إجراءات وإعدادات</h2>
        <StaggerList className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {cards.map(({ to, icon: Icon, title, desc, chip }) => (
            <StaggerItem key={to}>
              <Link
                to={to}
                className="group block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2"
              >
                <Card className="admin-glass flex h-full min-h-[112px] flex-col rounded-2xl border border-white/60 bg-white/50 shadow-sm ring-1 ring-slate-900/[0.03] transition-all duration-300 hover:bg-white/90 hover:shadow-md">
                  <CardContent className="flex flex-1 items-center p-4">
                    <div className="flex w-full items-center gap-3">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 shadow-sm ${chip}`}>
                        <Icon className="size-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-[13px] font-semibold text-slate-800 transition-colors group-hover:text-sky-700">
                          {title}
                        </CardTitle>
                        <CardDescription className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                          {desc}
                        </CardDescription>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </MotionSection>

      <Card className="rounded-2xl border-dashed border-slate-200/80 bg-slate-50/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-xs text-slate-500">لإدارة فعاليات منظمتك اليومية يمكنك العودة لمساحة عمل المنظمة.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft className="size-4" />
            مساحة المنظمة
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
