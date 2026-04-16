import { useId } from "react"
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
import ChartBox from "./ChartBox"
import { useAdminChartData } from "./useAdminChartData"
import {
  CHART_GRID as GRID,
  CHART_AXIS as AXIS,
  CHART_REV_STROKE as REV_STROKE,
  CHART_REV_FILL as REV_FILL,
  CHART_TIX_STROKE as TIX_STROKE,
  CHART_TIX_FILL as TIX_FILL,
} from "./chartPalette"

const MotionDiv = motion.div

function RevTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-slate-900/[0.06]">
      <p className="font-medium text-slate-900">{p.label}</p>
      <p className="mt-0.5 tabular-nums text-slate-600">{formatMoneyEn(p.revenue)}</p>
      {p.events != null && (
        <p className="mt-1 text-xs text-slate-400">{formatCountEn(p.events)} فعالية في الشهر</p>
      )}
    </div>
  )
}

function TixTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-slate-900/[0.06]">
      <p className="font-medium text-slate-900">{p.label}</p>
      <p className="mt-0.5 tabular-nums text-slate-600">{formatCountEn(Math.round(p.tickets))} تذكرة</p>
      {p.events != null && (
        <p className="mt-1 text-xs text-slate-400">{formatCountEn(p.events)} فعالية في الشهر</p>
      )}
    </div>
  )
}

const chartMotion = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: EASE, delay },
})

export function AdminRevenueChart({ series, hasData, reduce = false, gradId = "rev1" }) {
  const m = reduce ? {} : chartMotion(0)
  return (
    <MotionDiv {...m} className="min-h-0 h-full">
      <Card className="admin-card-surface h-full rounded-2xl border-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
                <LineChartIcon className="size-5 text-sky-700" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-semibold text-brand-navy">الإيرادات عبر الزمن</CardTitle>
                <CardDescription className="text-[12px] leading-relaxed text-slate-500">
                  تقدير شهري من تواريخ الفعاليات (مع توزيع تناسبي عند الحاجة).
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 h-[min(280px,min(42vw,360px))] min-h-[220px]">
          {!hasData ? (
            <p className="py-10 text-center text-sm text-slate-500">لا توجد فعاليات بتواريخ لعرض منحنى زمني.</p>
          ) : (
            <ChartBox dir="ltr" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`revGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={REV_FILL} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={REV_FILL} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={(v) => formatCountEn(v)} width={44} />
                  <Tooltip content={<RevTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke={REV_STROKE} strokeWidth={2.5} fill={`url(#revGrad-${gradId})`} isAnimationActive={!reduce} animationDuration={680} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </CardContent>
      </Card>
    </MotionDiv>
  )
}

export function AdminTicketsChart({ series, hasData, reduce = false }) {
  const m = reduce ? {} : chartMotion(0)
  return (
    <MotionDiv {...m} className="min-h-0 h-full">
      <Card className="admin-card-surface h-full rounded-2xl border-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
              <TrendingUp className="size-5 text-sky-700" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold text-brand-navy">اتجاه التذاكر</CardTitle>
              <CardDescription className="text-[12px] leading-relaxed text-slate-500">
                نفس الفترات الزمنية (تقدير شهري).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 h-[min(280px,min(42vw,360px))] min-h-[220px]">
          {!hasData ? (
            <p className="py-10 text-center text-sm text-slate-500">لا توجد فعاليات بتواريخ لعرض منحنى زمني.</p>
          ) : (
            <ChartBox dir="ltr" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={(v) => formatCountEn(v)} width={44} />
                  <Tooltip content={<TixTooltip />} />
                  <Line type="monotone" dataKey="tickets" stroke={TIX_STROKE} strokeWidth={2.5} dot={{ r: 4, fill: TIX_FILL, strokeWidth: 0 }} activeDot={{ r: 6, stroke: TIX_STROKE, strokeWidth: 2 }} isAnimationActive={!reduce} animationDuration={680} animationEasing="ease-out" />
                </LineChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </CardContent>
      </Card>
    </MotionDiv>
  )
}

export function AdminGrowthChart({ mom, hasData, reduce = false }) {
  const m = reduce ? {} : chartMotion(0)
  return (
    <MotionDiv {...m} className="min-h-0 h-full">
      <Card className="admin-card-surface flex h-full min-h-[220px] flex-col rounded-2xl border-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-100">
              <Percent className="size-5 text-violet-700" strokeWidth={1.75} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-brand-navy">نمو الإيرادات</CardTitle>
              <CardDescription className="text-[12px] text-slate-500">
                آخر شهر مقارنة بالشهر الذي قبله (حسب التقدير).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-center pt-0">
          {!hasData || !mom ? (
            <p className="py-6 text-center text-sm text-slate-500">
              يُحتاج شهرين على الأقل من البيانات لحساب النسبة.
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
  )
}

/**
 * @param {{ events: unknown[], summary?: object | null }} props
 */
export default function AdminTrendCharts({ events, summary }) {
  const reduce = useReducedMotion()
  const gradId = useId().replace(/:/g, "")
  const { series, mom, hasData } = useAdminChartData(events, summary)

  return (
    <div className="grid gap-3 md:gap-4 xl:grid-cols-3 xl:gap-5 h-full">
      <div className="xl:col-span-1 h-full"><AdminRevenueChart series={series} hasData={hasData} reduce={reduce} gradId={gradId} /></div>
      <div className="xl:col-span-1 h-full"><AdminTicketsChart series={series} hasData={hasData} reduce={reduce} /></div>
      <div className="xl:col-span-1 h-full"><AdminGrowthChart mom={mom} hasData={hasData} reduce={reduce} /></div>
    </div>
  )
}
