/** Build monthly analytics from global events + optional platform totals (proportional split when per-event $/tickets missing). */

import { firstDefined } from "./firstDefined"

const EVENT_DATE_KEYS = ["startDate", "StartDate", "createdAt", "CreatedAt", "created", "Created"]
const TICKET_KEYS = [
  "ticketsSold",
  "TicketsSold",
  "soldTickets",
  "SoldTickets",
  "totalTicketsSold",
  "TotalTicketsSold",
  "totalTickets",
  "TotalTickets",
]
const REVENUE_KEYS = [
  "revenue",
  "Revenue",
  "totalRevenue",
  "TotalRevenue",
  "grossRevenue",
  "GrossRevenue",
]

function parseMonth(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return {
    key: `${y}-${String(m).padStart(2, "0")}`,
    date: d,
  }
}

function monthLabelAr(d) {
  try {
    return d.toLocaleDateString("ar-SA", { month: "short", year: "numeric" })
  } catch {
    return `${d.getFullYear()}/${d.getMonth() + 1}`
  }
}

/**
 * @param {unknown[]} events
 * @returns {{ monthKey: string, label: string, events: number, ticketsRaw: number, revenueRaw: number }[]}
 */
export function aggregateEventsByMonth(events) {
  if (!Array.isArray(events) || events.length === 0) return []

  const map = new Map()

  for (const ev of events) {
    let raw = null
    for (const k of EVENT_DATE_KEYS) {
      const v = ev?.[k]
      if (v != null && String(v).trim() !== "") {
        raw = v
        break
      }
    }
    if (raw == null) continue

    const parsed = parseMonth(raw)
    if (!parsed) continue

    const t = Number(firstDefined(ev, TICKET_KEYS))
    const r = Number(firstDefined(ev, REVENUE_KEYS))
    const ticketsRaw = Number.isFinite(t) ? t : 0
    const revenueRaw = Number.isFinite(r) ? r : 0

    const cur = map.get(parsed.key) ?? {
      monthKey: parsed.key,
      label: monthLabelAr(parsed.date),
      events: 0,
      ticketsRaw: 0,
      revenueRaw: 0,
    }
    cur.events += 1
    cur.ticketsRaw += ticketsRaw
    cur.revenueRaw += revenueRaw
    cur.label = monthLabelAr(parsed.date)
    map.set(parsed.key, cur)
  }

  return [...map.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

/**
 * If monthly raw sums are zero but platform totals exist, spread totals by share of events per month.
 * @param {ReturnType<typeof aggregateEventsByMonth>} buckets
 * @param {{ totalRevenue?: number, totalTickets?: number }} platform
 */
export function enrichMonthlyWithPlatformTotals(buckets, platform) {
  const revTotal = platform?.totalRevenue
  const tixTotal = platform?.totalTickets
  const totalEvents = buckets.reduce((s, b) => s + b.events, 0)

  const sumRevRaw = buckets.reduce((s, b) => s + b.revenueRaw, 0)
  const sumTixRaw = buckets.reduce((s, b) => s + b.ticketsRaw, 0)

  return buckets.map((b) => {
    let revenue = b.revenueRaw
    let tickets = b.ticketsRaw

    if (sumRevRaw <= 0 && totalEvents > 0 && revTotal != null && Number.isFinite(Number(revTotal))) {
      revenue = (Number(revTotal) * b.events) / totalEvents
    }

    if (sumTixRaw <= 0 && totalEvents > 0 && tixTotal != null && Number.isFinite(Number(tixTotal))) {
      tickets = (Number(tixTotal) * b.events) / totalEvents
    }

    return {
      monthKey: b.monthKey,
      label: b.label,
      events: b.events,
      revenue,
      tickets,
    }
  })
}

/**
 * مقارنة آخر شهر بالسابق للإيرادات (للعرض في KPI).
 * @param {{ revenue: number }[]} series
 */
export function computeRevenueMonthOverMonth(series) {
  if (!Array.isArray(series) || series.length < 2) return null
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  const a = Number(last.revenue) || 0
  const b = Number(prev.revenue) || 0
  if (b === 0 && a === 0) return null
  if (b === 0) {
    return {
      pct: null,
      direction: "up",
      lastLabel: last.label,
      prevLabel: prev.label,
    }
  }
  const raw = ((a - b) / b) * 100
  const pct = Math.round(raw * 10) / 10
  return {
    pct,
    direction: raw >= 0 ? "up" : "down",
    lastLabel: last.label,
    prevLabel: prev.label,
  }
}
