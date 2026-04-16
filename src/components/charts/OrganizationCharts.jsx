import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { formatMoneyEn, formatCountEn } from "../../utils/formatEn"
import { EASE } from "../../lib/motion-variants"
import ChartBox from "./ChartBox"
import { firstDefined } from "../../utils/firstDefined"
import {
  CHART_GRID as GRID,
  CHART_AXIS as AXIS,
  CHART_BAR as BAR,
  CHART_BAR_HOVER as BAR_HOVER,
  CHART_BAR_SOFT as BAR_SOFT,
  CHART_PIE_COLORS as PIE_COLORS,
} from "./chartPalette"

const MotionDiv = motion.div

function orgDisplayName(row) {
  return row.organizationName ?? row.OrganizationName ?? row.name ?? row.Name ?? "—"
}

function truncateName(s, max) {
  if (!s || s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 1))}…`
}

function rowRevenue(row) {
  const v = firstDefined(row, ["revenue", "Revenue", "totalRevenue", "TotalRevenue"])
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function rowTickets(row) {
  const v = firstDefined(row, ["ticketsSold", "TicketsSold", "totalTickets", "TotalTickets"])
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function buildBarByRevenue(rows, limit) {
  return [...rows]
    .map((row) => ({
      name: truncateName(orgDisplayName(row), 26),
      fullName: orgDisplayName(row),
      revenue: rowRevenue(row),
    }))
    .filter((d) => d.fullName !== "—" || d.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

function buildBarByTickets(rows, limit) {
  return [...rows]
    .map((row) => ({
      name: truncateName(orgDisplayName(row), 26),
      fullName: orgDisplayName(row),
      tickets: rowTickets(row),
    }))
    .filter((d) => d.tickets > 0 || d.fullName !== "—")
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, limit)
}

function buildPieShare(rows, topN, mode) {
  const valueFn = mode === "tickets" ? rowTickets : rowRevenue
  const enriched = [...rows].map((row) => ({
    name: truncateName(orgDisplayName(row), 18),
    fullName: orgDisplayName(row),
    value: valueFn(row),
  }))
  const sorted = enriched.sort((a, b) => b.value - a.value)
  const top = sorted.slice(0, topN)
  const rest = sorted.slice(topN)
  const other = rest.reduce((s, r) => s + r.value, 0)
  const data = top.map((d, i) => ({
    ...d,
    name: d.name || "—",
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))
  if (other > 0) {
    data.push({
      name: "أخرى",
      fullName: "باقي المنظمات",
      value: other,
      fill: PIE_COLORS[PIE_COLORS.length - 1],
    })
  }
  return data.filter((d) => d.value > 0)
}

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-slate-900/[0.06]">
      <p className="font-medium text-slate-900">{p.fullName ?? p.name}</p>
      <p className="mt-0.5 tabular-nums text-slate-600">{formatMoneyEn(p.revenue)}</p>
    </div>
  )
}

function TicketsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-slate-900/[0.06]">
      <p className="font-medium text-slate-900">{p.fullName ?? p.name}</p>
      <p className="mt-0.5 tabular-nums text-slate-600">{formatCountEn(p.tickets)} تذكرة</p>
    </div>
  )
}

function PieTooltip({ active, payload, mode }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const row = p.payload
  if (!row) return null
  const total = p.payload?.total ?? 0
  const pct = total > 0 ? Math.round((Number(p.value) / total) * 1000) / 10 : 0
  const val =
    mode === "tickets" ? (
      <span className="tabular-nums text-slate-600">
        {formatCountEn(Math.round(Number(p.value)))} تذكرة · {pct}%
      </span>
    ) : (
      <span className="tabular-nums text-slate-600">
        {formatMoneyEn(p.value)} · {pct}%
      </span>
    )
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-slate-900/[0.06]">
      <p className="font-medium text-slate-900">{row.fullName ?? row.name}</p>
      <p className="mt-0.5">{val}</p>
      <p className="mt-1 text-[11px] text-slate-400">من إجمالي بيانات المقارنة</p>
    </div>
  )
}

const cardEnter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: EASE },
}

/**
 * مخططات مقارنة المنظمات — تصميم هادئ يتوافق مع واجهة الإدارة.
/**
 * مخططات مقارنة المنظمات — تصميم هادئ يتوافق مع واجهة الإدارة.
 * @param {{ rows: unknown[], compact?: boolean, layout?: string }} props
 */
export default function OrganizationCharts({ rows, compact = false, layout = "default" }) {
  const reduce = useReducedMotion()
  const [pieMode, setPieMode] = useState("revenue")
  const [barHover, setBarHover] = useState(null)
  const [pieActive, setPieActive] = useState(null)

  const isCompactLayout = compact || layout === "dashboard-top"
  const limit = isCompactLayout ? 5 : 8
  const pieTop = isCompactLayout ? 4 : 5
  const chartH = isCompactLayout ? 240 : 300

  const byRevenue = useMemo(() => buildBarByRevenue(rows ?? [], limit), [rows, limit])
  const byTickets = useMemo(() => buildBarByTickets(rows ?? [], limit), [rows, limit])
  const pieRaw = useMemo(() => buildPieShare(rows ?? [], pieTop, pieMode), [rows, pieTop, pieMode])

  const totalRevenueAll = useMemo(() => (rows ?? []).reduce((s, r) => s + rowRevenue(r), 0), [rows])
  const totalTicketsAll = useMemo(() => (rows ?? []).reduce((s, r) => s + rowTickets(r), 0), [rows])

  const pieData = useMemo(() => {
    const totalBase = pieMode === "tickets" ? totalTicketsAll : totalRevenueAll
    const total = totalBase > 0 ? totalBase : pieRaw.reduce((s, d) => s + d.value, 0)
    return pieRaw.map((d) => ({
      ...d,
      total,
      pctOfTotal: total > 0 ? (Number(d.value) / total) * 100 : 0,
    }))
  }, [pieRaw, pieMode, totalRevenueAll, totalTicketsAll])

  const topSharePct = pieData.length > 0 ? Math.round(pieData[0].pctOfTotal * 10) / 10 : 0

  const hasRows = Array.isArray(rows) && rows.length > 0
  if (!hasRows) {
    return (
      <Card className="rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">الرسوم البيانية</CardTitle>
          <CardDescription>لا توجد بيانات منظمات لعرضها.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const showPie = pieData.length > 0
  const cardMotionProps = reduce ? {} : cardEnter

  const barCard = (title, description, data, dataKey, fill, tooltip, emptyMsg) => (
    <MotionDiv {...cardMotionProps} className="min-h-0 min-w-0">
      <Card className="h-full rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-300 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
          <CardDescription className="text-[13px] text-slate-500">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {data.length === 0 || (dataKey === "tickets" && data.every((d) => d.tickets === 0)) ? (
            <p className="py-8 text-center text-sm text-slate-500">{emptyMsg}</p>
          ) : (
            <ChartBox dir="ltr" className="w-full" style={{ height: chartH }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 8, right: 12, left: compact ? 4 : 8, bottom: 8 }}
                  barCategoryGap={compact ? 10 : 12}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: AXIS, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                    tickFormatter={(v) => formatCountEn(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={compact ? 84 : 128}
                    tick={{ fill: AXIS, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                  />
                  <Tooltip
                    content={tooltip}
                    cursor={{ fill: "hsl(204 94% 96% / 0.9)" }}
                    animationDuration={200}
                  />
                  <Bar
                    dataKey={dataKey}
                    radius={[0, 8, 8, 0]}
                    maxBarSize={compact ? 22 : 26}
                    isAnimationActive={!reduce}
                    animationDuration={520}
                    animationEasing="ease-out"
                    onMouseEnter={(_, i) => setBarHover(i)}
                    onMouseLeave={() => setBarHover(null)}
                  >
                    {data.map((_, i) => (
                      <Cell
                        key={i}
                        fill={barHover === i ? BAR_HOVER : fill}
                        style={{
                          transition: "fill 0.2s ease",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </CardContent>
      </Card>
    </MotionDiv>
  )

  const pieBlock = (
    <MotionDiv {...cardMotionProps} className="flex min-h-0 min-w-0 flex-col">
      <Card className="flex h-full flex-col rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-300 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">توزيع حسب المنظمة</CardTitle>
              <CardDescription className="text-[13px] text-slate-500">
                نسب من إجمالي بيانات المقارنة — مرر المؤشر فوق القطاعات أو القائمة.
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200/80 bg-slate-50/90 p-0.5">
              <Button
                type="button"
                variant={pieMode === "revenue" ? "default" : "ghost"}
                size="sm"
                className="h-8 rounded-lg px-3 text-xs transition-transform duration-200 active:scale-[0.97]"
                onClick={() => setPieMode("revenue")}
              >
                إيرادات
              </Button>
              <Button
                type="button"
                variant={pieMode === "tickets" ? "default" : "ghost"}
                size="sm"
                className="h-8 rounded-lg px-3 text-xs transition-transform duration-200 active:scale-[0.97]"
                onClick={() => setPieMode("tickets")}
              >
                تذاكر
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col pt-0">
          {!showPie ? (
            <p className="py-8 text-center text-sm text-slate-500">لا توجد بيانات للعرض.</p>
          ) : (
            <div
              dir="ltr"
              className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
            >
              <div className="relative mx-auto flex w-full max-w-[min(300px,90vw)] shrink-0 items-center justify-center lg:mx-0 lg:w-[min(42%,300px)]">
              <ChartBox className="aspect-square w-full max-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={96}
                        paddingAngle={2}
                        stroke="hsl(210 20% 98%)"
                        strokeWidth={2}
                        isAnimationActive={!reduce}
                        animationDuration={560}
                        animationEasing="ease-out"
                        onMouseEnter={(_, i) => setPieActive(i)}
                        onMouseLeave={() => setPieActive(null)}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={entry.fill}
                            opacity={pieActive === null || pieActive === index ? 1 : 0.45}
                            style={{ transition: "opacity 0.2s ease", cursor: "pointer" }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip mode={pieMode} />} />
                    </PieChart>
                  </ResponsiveContainer>
              </ChartBox>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    أكبر حصة
                  </p>
                  <p className="text-3xl font-bold tabular-nums text-brand-navy sm:text-4xl">{topSharePct}%</p>
                  <p className="mt-0.5 line-clamp-2 max-w-[9rem] text-[11px] leading-tight text-slate-500">
                    {pieData[0]?.fullName ?? pieData[0]?.name ?? "—"}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {pieMode === "revenue" ? "من الإيرادات" : "من التذاكر"}
                  </p>
                </div>
              </div>
              <ul className="grid max-h-[220px] flex-1 grid-cols-1 gap-x-4 gap-y-2 overflow-y-auto text-[12px] text-slate-600 sm:grid-cols-2 lg:max-h-none lg:content-start">
                {pieData.map((d, idx) => (
                  <li
                    key={d.name}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-lg px-1 py-0.5 transition-colors duration-200 hover:bg-slate-50"
                    onMouseEnter={() => setPieActive(idx)}
                    onMouseLeave={() => setPieActive(null)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.fill }} aria-hidden />
                      <span className="truncate" title={d.fullName ?? d.name}>
                        {d.fullName ?? d.name}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[11px] font-semibold text-slate-700">
                      {Math.round(d.pctOfTotal * 10) / 10}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </MotionDiv>
  )

  if (layout === "dashboard-top") {
    return (
      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch h-[min(100%,320px)]">
        <div className="lg:col-span-5 h-full">
          {pieBlock}
        </div>
        <div className="lg:col-span-7 h-full">
          {barCard(
            `أعلى المنظمات — الإيرادات`,
            `أعلى ${limit} حسب الإيرادات المعلنة.`,
            byRevenue,
            "revenue",
            BAR,
            <RevenueTooltip />,
            "لا توجد إيرادات للعرض."
          )}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="grid gap-4">
        {barCard(
          `أعلى المنظمات — الإيرادات`,
          `أعلى ${limit} حسب الإيرادات المعلنة.`,
          byRevenue,
          "revenue",
          BAR,
          <RevenueTooltip />,
          "لا توجد إيرادات للعرض."
        )}
        {pieBlock}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-5">
        <div className="lg:col-span-7">
          {barCard(
            "أعلى المنظمات — الإيرادات",
            `ترتيب حسب الإيرادات المعلنة في المقارنة (أعلى ${limit}).`,
            byRevenue,
            "revenue",
            BAR,
            <RevenueTooltip />,
            "لا توجد إيرادات للعرض."
          )}
        </div>
        <div className="lg:col-span-5">
          {barCard(
            "أعلى المنظمات — التذاكر",
            "ترتيب حسب عدد التذاكر في بيانات المقارنة.",
            byTickets,
            "tickets",
            BAR_SOFT,
            <TicketsTooltip />,
            "لا توجد تذاكر للعرض."
          )}
        </div>
      </div>
      {pieBlock}
    </div>
  )
}
