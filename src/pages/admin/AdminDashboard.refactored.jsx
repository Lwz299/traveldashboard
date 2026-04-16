import { Link } from "react-router-dom"
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
} from "lucide-react"
import { useDashboardSummary, useDashboardComparison, useAdminEvents } from "../hooks"
import { StaggerList, StaggerItem, MotionSection, MotionSurface, DashboardPageSkeleton } from "../../../components/motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { formatCountEn, formatMoneyEn } from "../../../utils/formatEn"
import OrganizationCharts from "../../../components/charts/OrganizationCharts"
import AdminTrendCharts from "../../../components/charts/AdminTrendCharts"
import { getFirstDefined } from "../utils"

/**
 * KPI key mappings for flexible API responses
 */
const KPI_KEYS = {
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

/**
 * KPI Card for dashboard summary metrics
 */
function KpiCard({ label, value, subtitle }) {
  return (
    <StaggerItem>
      <MotionSurface>
        <Card className="admin-card-surface rounded-2xl transition-colors duration-200 hover:bg-slate-50/70">
          <CardHeader className="pb-1 pt-4 sm:pt-5">
            <CardTitle className="text-[12px] font-medium uppercase tracking-wide text-slate-400">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 sm:pb-5">
            <p className="admin-stat-value text-4xl font-bold tracking-tight text-brand-navy lg:text-5xl">
              {value}
            </p>
            <p className="mt-1.5 text-[11px] font-normal text-slate-400">{subtitle}</p>
          </CardContent>
        </Card>
      </MotionSurface>
    </StaggerItem>
  )
}

/**
 * Dashboard action card
 */
function ActionCard({ icon: Icon, title, description, href, colorChip }) {
  return (
    <StaggerItem>
      <Link
        to={href}
        className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2"
      >
        <Card className="admin-card-surface h-full rounded-2xl transition-colors duration-200 hover:bg-slate-50/70">
          <CardHeader className="pb-2">
            <div className="flex items-start gap-4">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${colorChip}`}>
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="text-base font-semibold leading-snug text-brand-navy">
                  {title}
                </CardTitle>
                <CardDescription className="text-[13px] leading-relaxed text-slate-500">
                  {description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-sm font-medium text-slate-600 transition-colors duration-200 group-hover:border-sky-200/90 group-hover:bg-sky-50/80 group-hover:text-sky-900">
              فتح القسم
            </div>
          </CardContent>
        </Card>
      </Link>
    </StaggerItem>
  )
}

/**
 * Summary metrics section
 */
function SummarySection({ summary }) {
  const metrics = [
    {
      label: "الفعاليات",
      value: formatCountEn(getFirstDefined(summary, KPI_KEYS.events)),
      sub: "على مستوى المنصة",
    },
    {
      label: "التذاكر المباعة",
      value: formatCountEn(getFirstDefined(summary, KPI_KEYS.tickets)),
      sub: "إجمالي",
    },
    {
      label: "الإيرادات",
      value: formatMoneyEn(getFirstDefined(summary, KPI_KEYS.revenue), ""),
      sub: "تقديري",
    },
    {
      label: "المنظمات",
      value: formatCountEn(getFirstDefined(summary, KPI_KEYS.orgs)),
      sub: "مسجّلة",
    },
  ]

  return (
    <MotionSection delay={0.04} aria-label="ملخص المنصة">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        ملخص المنصة
      </h2>
      <StaggerList className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <KpiCard key={metric.label} {...metric} />
        ))}
      </StaggerList>
    </MotionSection>
  )
}

/**
 * Quick actions section
 */
function QuickActionsSection() {
  const actions = [
    {
      href: "/admin/partners",
      icon: Building2,
      title: "طلبات الشركاء",
      description: "مراجعة واعتماد طلبات انضمام المنظمين",
      colorChip: "bg-amber-50 text-amber-700 ring-amber-100",
    },
    {
      href: "/admin/organizations",
      icon: Users,
      title: "المنظمات",
      description: "قائمة كل المنظمات وتعديل بياناتها",
      colorChip: "bg-sky-50 text-sky-700 ring-sky-100",
    },
    {
      href: "/admin/events",
      icon: Calendar,
      title: "جميع الفعاليات",
      description: "عرض وتعديل وإلغاء أي فعالية",
      colorChip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    {
      href: "/admin/categories",
      icon: FolderTree,
      title: "التصنيفات",
      description: "إدارة تصنيفات الفعاليات",
      colorChip: "bg-violet-50 text-violet-700 ring-violet-100",
    },
    {
      href: "/admin/reports",
      icon: BarChart3,
      title: "التقارير المركزية",
      description: "ملخص المنصة ومقارنة المنظمين",
      colorChip: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    },
    {
      href: "/admin/finance",
      icon: Landmark,
      title: "المالية",
      description: "محفظة المنصة، حركات العمولة، وملخص الشركات",
      colorChip: "bg-indigo-50 text-indigo-800 ring-indigo-100",
    },
    {
      href: "/admin/payouts",
      icon: Wallet,
      title: "طلبات السحب",
      description: "اعتماد طلبات تحويل الأرباح",
      colorChip: "bg-sky-50 text-sky-800 ring-sky-100",
    },
    {
      href: "/admin/notifications",
      icon: Megaphone,
      title: "إشعار جماعي",
      description: "إرسال إشعار لجميع المستخدمين (broadcast-all)",
      colorChip: "bg-rose-50 text-rose-800 ring-rose-100",
    },
  ]

  return (
    <MotionSection delay={0.07} aria-label="الإجراءات السريعة">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        الإجراءات السريعة
      </h2>
      <StaggerList className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {actions.map((action) => (
          <ActionCard key={action.href} {...action} />
        ))}
      </StaggerList>
    </MotionSection>
  )
}

/**
 * Admin Dashboard Page
 * Main super admin dashboard with KPIs, charts, and quick actions
 */
export default function AdminDashboardPage() {
  const { data: summary, loading: summaryLoading } = useDashboardSummary()
  const { data: comparison } = useDashboardComparison()
  const { data: events } = useAdminEvents()

  if (summaryLoading) {
    return <DashboardPageSkeleton />
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {summary && <SummarySection summary={summary} />}

      {comparison && comparison.length > 0 && (
        <MotionSection delay={0.05} aria-label="مقارنة المنظمات">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            مقارنة المنظمات
          </h2>
          <OrganizationCharts rows={comparison} compact />
        </MotionSection>
      )}

      {(comparison?.length > 0 || events?.length > 0 || summary) && (
        <MotionSection delay={0.06} aria-label="اتجاهات ورسوم">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            تحليلات واتجاهات
          </h2>
          <AdminTrendCharts events={events ?? []} summary={summary} />
        </MotionSection>
      )}

      <QuickActionsSection />

      <Card className="rounded-2xl border-dashed border-slate-200/90 bg-slate-50/50 transition-colors duration-200 hover:bg-slate-50/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 sm:gap-4 sm:py-5">
          <p className="text-sm text-slate-500">العودة لتسجيل دخول المنظمة العادية</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            لوحة المنظمة
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
