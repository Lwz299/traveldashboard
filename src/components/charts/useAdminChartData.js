import { useMemo } from "react"
import { firstDefined } from "../../utils/firstDefined"
import {
  aggregateEventsByMonth,
  enrichMonthlyWithPlatformTotals,
  computeRevenueMonthOverMonth,
} from "../../utils/adminAnalyticsFromEvents"

function summaryTotals(summary) {
  if (!summary || typeof summary !== "object") return {}
  const totalRevenue = firstDefined(summary, [
    "totalRevenue",
    "TotalRevenue",
    "grossRevenue",
    "GrossRevenue",
  ])
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
  const tr = Number(totalRevenue)
  const tt = Number(totalTickets)
  return {
    totalRevenue: Number.isFinite(tr) ? tr : undefined,
    totalTickets: Number.isFinite(tt) ? tt : undefined,
  }
}

export function useAdminChartData(events, summary) {
  const platform = useMemo(() => summaryTotals(summary), [summary])
  const series = useMemo(() => {
    const raw = aggregateEventsByMonth(events ?? [])
    return enrichMonthlyWithPlatformTotals(raw, platform)
  }, [events, platform])
  const mom = useMemo(() => computeRevenueMonthOverMonth(series), [series])
  return { series, mom, hasData: series.length > 0 }
}
