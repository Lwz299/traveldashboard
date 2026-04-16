import { useMemo, useId } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { TrendingUp, TrendingDown, LineChart as LineChartIcon, Percent } from "lucide-react"
import { formatCountEn, formatMoneyEn } from "../../utils/formatEn"
import { EASE } from "../../lib/motion-variants"
import {
  aggregateEventsByMonth,
  enrichMonthlyWithPlatformTotals,
  computeRevenueMonthOverMonth,
} from "../../utils/adminAnalyticsFromEvents"
import { orgCardClassSubtle } from "../../lib/org-ui"
import ChartBox from "./ChartBox"

const MotionDiv = motion.div

const GRID = "rgba(29, 78, 216, 0.14)"
const AXIS = "#475569"
const REV_STROKE = "#0f766e"
const REV_FILL = "#14b8a6"
const TIX_STROKE = "#1d4ed8"
const TIX_FILL = "#60a5fa"

/** ملخص منظمة طبيعي من normalizeOrganizationSummary */
function orgSummaryToPlatformTotals(summary) {
  if (!summary || typeof summary !== "object") return {}
  const totalRevenue = summary.totalSales ?? summary.TotalSales
  const totalTickets = summary.totalAttendees ?? summary.TotalAttendees
  const tr = Number(totalRevenue)
  const tt = Number(totalTickets)
  return {
    totalRevenue: Number.isFinite(tr) ? tr : undefined,
    totalTickets: Number.isFinite(tt) ? tt : undefined,
  }
}

function RevTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-xl border border-emerald-200/90 bg-white/98 px-3.5 py-2.5 text-sm shadow-xl ring-1 ring-emerald-900/[0.07] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">المبيعات التقديرية</p>
      <p className="mt-1 font-medium text-slate-900">{p.label}</p>
      <p className="mt-1 tabular-nums text-base font-semibold text-emerald-800">{formatMoneyEn(p.revenue, "")}</p>
      {p.events != null && (
        <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-xs text-slate-500">
          {formatCountEn(p.events)} رحلة في هذا الشهر
        </p>
      )}
    </div>
  )
}

function TixTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  const tix = Math.round(Number(p.tickets) || 0)
  return (
    <div className="rounded-xl border border-teal-200/90 bg-white/98 px-3.5 py-2.5 text-sm shadow-xl ring-1 ring-teal-900/[0.07] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-900/85">التذاكر / الحجوزات</p>
      <p className="mt-1 font-medium text-slate-900">{p.label}</p>
      <p className="mt-1 tabular-nums text-base font-semibold text-teal-900">{formatCountEn(tix)}</p>
      {p.events != null && (
        <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-xs text-slate-500">
          {formatCountEn(p.events)} رحلة في هذا الشهر
        </p>
      )}
    </div>
  )
}

const chartMotion = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: EASE, delay },
})

/**
 * مخططات اتجاه للمنظمة — من فعالياتي + ملخص المنظمة (recharts).
 * @param {{ events: unknown[], summary?: object | null }} props
 */
export default function OrganizationTrendCharts({ events, summary }) {
  const reduce = useReducedMotion()
  const gradId = useId().replace(/:/g, "")
  const platform = useMemo(() => orgSummaryToPlatformTotals(summary), [summary])

  const series = useMemo(() => {
    const raw = aggregateEventsByMonth(events ?? [])
    return enrichMonthlyWithPlatformTotals(raw, platform)
  }, [events, platform])

  const mom = useMemo(() => computeRevenueMonthOverMonth(series), [series])
  const hasData = series.length > 0

  const m0 = reduce ? {} : chartMotion(0)
  const m1 = reduce ? {} : chartMotion(0.06)
  const m2 = reduce ? {} : chartMotion(0.12)

  const monthCount = series.length

  return (
    <div className="grid gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3 xl:gap-6 2xl:gap-7">
      <MotionDiv {...m0} className="min-h-0 xl:col-span-1">
        <Card className={`${orgCardClassSubtle} h-full`}>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100/90">
                  <LineChartIcon className="size-5 text-emerald-700" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="org-heading text-base font-semibold">المبيعات عبر الزمن</CardTitle>
                  <CardDescription className="text-[12px] leading-relaxed text-slate-500">
                    تقدير شهري من تواريخ الرحلات
                    {hasData && monthCount > 0 ? (
                      <span className="mt-1 block text-[11px] text-slate-400">· {monthCount} شهراً في الرسم</span>
                    ) : (
                      <span className="text-slate-500"> — مع توزيع من الملخص عند الحاجة.</span>
                    )}
                  </CardDescription>
                </div>
              </div>
              {mom?.pct != null && (
                <div
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold tabular-nums ring-1 ${
                    mom.direction === "up"
                      ? "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
                      : "bg-red-50 text-red-700 ring-red-100"
                  }`}
                >
                  {mom.direction === "up" ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {mom.direction === "up" ? "+" : ""}
                  {mom.pct}%
                  <span className="font-normal text-slate-500">شهر</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!hasData ? (
              <p className="py-10 text-center text-sm text-slate-500">لا توجد فعاليات بتواريخ لعرض المنحنى.</p>
            ) : (
              <ChartBox dir="ltr" className="h-[min(320px,min(46vw,400px))] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 12, right: 10, left: 4, bottom: 8 }}>
                    <defs>
                      <linearGradient id={`orgRevGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={REV_FILL} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={REV_FILL} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: AXIS, fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: GRID }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: GRID }}
                      tickFormatter={(v) => formatCountEn(v)}
                      width={48}
                    />
                    <Tooltip content={<RevTooltip />} cursor={{ stroke: REV_STROKE, strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={REV_STROKE}
                      strokeWidth={3}
                      fill={`url(#orgRevGrad-${gradId})`}
                      isAnimationActive={!reduce}
                      animationDuration={680}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartBox>
            )}
          </CardContent>
        </Card>
      </MotionDiv>

      <MotionDiv {...m1} className="min-h-0 xl:col-span-1">
        <Card className={`${orgCardClassSubtle} h-full`}>
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100/90">
                <TrendingUp className="size-5 text-teal-800" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="org-heading text-base font-semibold">اتجاه النشاط</CardTitle>
                <CardDescription className="text-[12px] leading-relaxed text-slate-500">
                  نفس الفترات (تقدير شهري من بيانات الفعاليات والملخص).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!hasData ? (
              <p className="py-10 text-center text-sm text-slate-500">لا توجد فعاليات بتواريخ لعرض المنحنى.</p>
            ) : (
              <ChartBox dir="ltr" className="h-[min(320px,min(46vw,400px))] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 12, right: 10, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: AXIS, fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: GRID }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: GRID }}
                      tickFormatter={(v) => formatCountEn(v)}
                      width={48}
                    />
                    <Tooltip content={<TixTooltip />} cursor={{ stroke: TIX_STROKE, strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Line
                      type="monotone"
                      dataKey="tickets"
                      stroke={TIX_STROKE}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: TIX_FILL, strokeWidth: 0 }}
                      activeDot={{ r: 6, stroke: TIX_STROKE, strokeWidth: 2 }}
                      isAnimationActive={!reduce}
                      animationDuration={680}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            )}
          </CardContent>
        </Card>
      </MotionDiv>

      <MotionDiv {...m2} className="min-h-0 lg:col-span-2 xl:col-span-1">
        <Card
          className={`${orgCardClassSubtle} flex h-full min-h-[300px] flex-col bg-gradient-to-b from-white via-white to-cyan-50/20`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 ring-1 ring-cyan-100/80">
                <Percent className="size-5 text-cyan-800" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="org-heading text-base font-semibold">نمو المبيعات</CardTitle>
                <CardDescription className="text-[12px] text-slate-500">
                  آخر شهر مقارنة بالسابق (حسب التقدير الشهري).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center pt-0">
            {!hasData || !mom ? (
              <p className="py-6 text-center text-sm text-slate-500">
                يُحتاج شهرين على الأقل من البيانات الزمنية لحساب النسبة.
              </p>
            ) : mom.pct == null ? (
              <p className="py-6 text-center text-sm text-slate-500">لا يمكن مقارنة الشهر السابق (قيمة صفر).</p>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                <div
                  className={`flex items-center gap-2 text-5xl font-bold tabular-nums tracking-tight sm:text-6xl ${
                    mom.direction === "up" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {mom.direction === "up" ? (
                    <TrendingUp className="size-10 sm:size-12" strokeWidth={2} />
                  ) : (
                    <TrendingDown className="size-10 sm:size-12" strokeWidth={2} />
                  )}
                  <span>
                    {mom.direction === "up" ? "+" : ""}
                    {mom.pct}%
                  </span>
                </div>
                <p className="max-w-xs text-[13px] leading-relaxed text-slate-500">
                  <span className="font-medium text-slate-700">{mom.lastLabel}</span>
                  {" ← "}
                  <span className="text-slate-400">{mom.prevLabel}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionDiv>
    </div>
  )
}
