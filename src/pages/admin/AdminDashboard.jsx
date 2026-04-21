import { useState, useEffect, useMemo } from "react"
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
import OrganizationCharts from "../../components/charts/OrganizationCharts"
import { useAdminChartData } from "../../components/charts/useAdminChartData"
import { AdminRevenueChart, AdminTicketsChart, AdminGrowthChart } from "../../components/charts/AdminTrendCharts"
import { StaggerList, StaggerItem, MotionSection, MotionSurface, DashboardPageSkeleton } from "../../components/motion"
import StatBox from "../../components/dashboard/StatBox"
import DashboardCard from "../../components/dashboard/DashboardCard"
import DataTable from "../../components/dashboard/DataTable"
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

  const quickOverviewStats = useMemo(
    () => [
      {
        to: "/admin/organizations",
        label: "المستخدمون (End Users)",
        value: quickStats.endUsers != null ? formatCountEn(quickStats.endUsers) : "—",
        icon: Users,
        tone: "bg-sky-50 text-sky-800 ring-sky-100",
        hint: "من ملخص التقرير إن توفر",
      },
      {
        to: "/admin/partners",
        label: "طلبات الانضمام كشريك",
        value: quickStats.partnerApplications != null ? formatCountEn(quickStats.partnerApplications) : "—",
        icon: Building2,
        tone: "bg-violet-50 text-violet-800 ring-violet-100",
        hint: "طلبات بانتظار المراجعة",
      },
      {
        to: "/admin/payouts",
        label: "طلبات السحب المعلّقة",
        value: quickStats.pendingPayouts != null ? formatCountEn(quickStats.pendingPayouts) : "—",
        icon: Wallet,
        tone: "bg-amber-50 text-amber-800 ring-amber-100",
        hint: "قائمة المعلّقة",
      },
      {
        to: "/admin/notifications",
        label: "إجمالي الإشعارات (Delivered)",
        value: quickStats.deliveredNotifications != null ? formatCountEn(quickStats.deliveredNotifications) : "—",
        icon: Megaphone,
        tone: "bg-rose-50 text-rose-800 ring-rose-100",
        hint: "سجل التسليم",
      },
    ],
    [quickStats]
  )

  const mainStats = useMemo(
    () => [
      {
        label: "إجمالي الإيرادات",
        value: formatMoneyEn(revenueValue, ""),
        hint: "تقديري شهري",
        icon: Wallet,
        tone: "bg-emerald-50 text-emerald-800 ring-emerald-100",
      },
      {
        label: "إجمالي الفعاليات",
        value: formatCountEn(eventsValue),
        hint: "على مستوى المنصة",
        icon: Calendar,
        tone: "bg-cyan-50 text-cyan-800 ring-cyan-100",
      },
      {
        label: "التذاكر المباعة",
        value: formatCountEn(ticketsValue),
        hint: "إجمالي",
        icon: Ticket,
        tone: "bg-sky-50 text-sky-800 ring-sky-100",
      },
      {
        label: "المنظمات",
        value: formatCountEn(orgsValue),
        hint: "مسجّلة",
        icon: Building2,
        tone: "bg-indigo-50 text-indigo-800 ring-indigo-100",
      },
      {
        label: "متوسط الإيراد/منظمة",
        value: formatMoneyEn(Math.round(avgRevenuePerOrg), ""),
        hint: "تقديري",
        icon: Landmark,
        tone: "bg-violet-50 text-violet-800 ring-violet-100",
      },
      {
        label: "متوسط التذاكر/فعالية",
        value: formatCountEn(Math.round(avgTicketsPerEvent)),
        hint: "تقريبي",
        icon: Activity,
        tone: "bg-amber-50 text-amber-800 ring-amber-100",
      },
      {
        label: "النمو الشهري",
        value: growthText,
        hint: "آخر مقارنة",
        icon: TrendingUp,
        tone: "bg-rose-50 text-rose-800 ring-rose-100",
      },
      {
        label: "عدد أشهر التحليل",
        value: formatCountEn(series.length),
        hint: "في الرسم الزمني",
        icon: LineChart,
        tone: "bg-teal-50 text-teal-800 ring-teal-100",
      },
    ],
    [revenueValue, eventsValue, ticketsValue, orgsValue, avgRevenuePerOrg, avgTicketsPerEvent, growthText, series.length]
  )

  const comparisonColumns = useMemo(
    () => [
      { key: "name", header: "المنظمة", render: (row) => row.orgName ?? row.organizationName ?? row.name ?? "—" },
      {
        key: "revenue",
        header: "الإيرادات",
        render: (row) => formatMoneyEn(firstDefined(row, ["revenue", "totalRevenue", "grossRevenue"]) ?? 0, ""),
      },
      {
        key: "events",
        header: "الفعاليات",
        render: (row) => formatCountEn(firstDefined(row, ["eventsCount", "totalEvents", "events"]) ?? 0),
      },
      {
        key: "tickets",
        header: "التذاكر",
        render: (row) => formatCountEn(firstDefined(row, ["ticketsSold", "totalTickets", "tickets"]) ?? 0),
      },
    ],
    []
  )

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
    <div className="mx-auto w-full max-w-[1600px] space-y-6 sm:space-y-7 lg:space-y-8" dir="rtl">
      <MotionSection delay={0.02} aria-label="ملخص سريع للأقسام">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">ملخص سريع</h2>
          <p className="text-xs text-slate-500">أرقام سريعة</p>
        </div>
        <StaggerList className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickOverviewStats.map(({ to, label, value, icon, tone, hint }) => (
            <StaggerItem key={to}>
              <MotionSurface>
                <Link
                  to={to}
                  className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2"
                >
                  <StatBox label={label} value={value} icon={icon} tone={tone} hint={hint} className="bg-white/80" />
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
            {mainStats.map(({ label, value, hint, icon, tone }) => (
              <StaggerItem key={label}>
                <MotionSurface>
                  <StatBox label={label} value={value} hint={hint} icon={icon} tone={tone} className="bg-white/80" />
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
          <div className="mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">تحليلات التوزيع والمقارنة</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <OrganizationCharts rows={comparison} />
            </div>
            <div className="xl:col-span-5">
              <DashboardCard
                title="مقارنة المنظمات"
                description="جدول مختصر لأهم مؤشرات الأداء"
                icon={BarChart3}
                iconTone="bg-sky-50 text-sky-800 ring-sky-100"
              >
                <DataTable
                  columns={comparisonColumns}
                  rows={comparison.slice(0, 8)}
                  rowKey={(row, idx) => row.id ?? row.organizationId ?? idx}
                  emptyText="لا توجد بيانات مقارنة متاحة."
                  minWidth="min-w-[560px]"
                />
              </DashboardCard>
            </div>
          </div>
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
                <Card className="admin-glass flex h-full min-h-[112px] flex-col rounded-2xl border border-white/60 bg-white/70 shadow-sm ring-1 ring-slate-900/[0.03] transition-all duration-300 hover:bg-white hover:shadow-md">
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
