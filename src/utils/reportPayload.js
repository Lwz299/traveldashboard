/**
 * تطبيع استجابات تقارير المنظمة — يدعم camelCase و PascalCase وحقول بديلة شائعة.
 */

function firstDefined(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k]
      if (v !== undefined && v !== null && v !== "") return v
    }
  }
  return undefined
}

function toFiniteNumber(v) {
  if (v === undefined || v === null || v === "") return null
  let n = Number(v)
  if (!Number.isFinite(n) && typeof v === "string") {
    const cleaned = v.trim().replace(/,/g, "").replace(/%$/, "")
    n = Number(cleaned)
  }
  return Number.isFinite(n) ? n : null
}

function mergeSummarySources(raw) {
  if (raw == null || typeof raw !== "object") return {}
  const parts = [raw, raw.data, raw.summary, raw.result].filter(
    (x) => x && typeof x === "object" && !Array.isArray(x)
  )
  return Object.assign({}, ...parts)
}

const ORG_SUMMARY_KEYS = {
  totalSales: [
    "totalSales",
    "TotalSales",
    "total_sales",
    "totalRevenue",
    "TotalRevenue",
    "grossRevenue",
    "GrossRevenue",
    "salesTotal",
    "SalesTotal",
  ],
  totalEvents: [
    "totalEvents",
    "TotalEvents",
    "total_events",
    "eventsCount",
    "EventsCount",
    "eventCount",
    "EventCount",
  ],
  totalAttendees: [
    "totalAttendees",
    "TotalAttendees",
    "total_attendees",
    "attendeeCount",
    "AttendeeCount",
    "totalAttendeeCount",
    "TotalAttendeeCount",
    "travelersCount",
    "totalTicketsSold",
    "TotalTicketsSold",
    "totalBookings",
    "TotalBookings",
  ],
  bookingRate: ["bookingRate", "BookingRate", "booking_rate", "occupancyRate", "OccupancyRate"],
}

/**
 * @returns {{ totalSales: number|null, totalEvents: number|null, totalAttendees: number|null, bookingRate: number|null } | null}
 */
export function normalizeOrganizationSummary(raw) {
  const merged = mergeSummarySources(raw)
  if (Object.keys(merged).length === 0) return null
  const out = {}
  for (const [field, keys] of Object.entries(ORG_SUMMARY_KEYS)) {
    out[field] = toFiniteNumber(firstDefined(merged, keys))
  }
  return out
}

const EVENT_PERF_KEYS = {
  ticketsSold: [
    "ticketsSold",
    "TicketsSold",
    "soldTickets",
    "SoldTickets",
    "totalTicketsSold",
    "TotalTicketsSold",
  ],
  revenue: ["revenue", "Revenue", "totalRevenue", "TotalRevenue", "grossRevenue", "GrossRevenue"],
  bookingRate: ["bookingRate", "BookingRate", "booking_rate"],
}

export function normalizeEventPerformance(raw) {
  const merged = mergeSummarySources(raw)
  if (Object.keys(merged).length === 0) return null
  const out = {}
  for (const [field, keys] of Object.entries(EVENT_PERF_KEYS)) {
    out[field] = toFiniteNumber(firstDefined(merged, keys))
  }
  return out
}

export function summarizeOrganizationEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { totalTicketsSold: null, totalCapacity: null, bookingRate: null }
  }

  let totalTicketsSold = 0
  let totalCapacity = 0
  let capacityCount = 0

  for (const event of events) {
    const tickets = toFiniteNumber(firstDefined(event, [
      "ticketsSold",
      "TicketsSold",
      "totalBookings",
      "TotalBookings",
      "totalTicketsSold",
      "TotalTicketsSold",
      "soldTickets",
      "SoldTickets",
      "bookingsCount",
      "BookingsCount",
      "attendeeCount",
      "AttendeeCount",
      "totalAttendees",
      "TotalAttendees",
    ]))
    if (tickets != null) totalTicketsSold += tickets

    const capacity = toFiniteNumber(firstDefined(event, ["capacity", "Capacity", "maxCapacity", "MaxCapacity"]))
    if (capacity != null && capacity > 0) {
      totalCapacity += capacity
      capacityCount += 1
    }
  }

  const bookingRate = totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 1000) / 10 : null
  return { totalTicketsSold, totalCapacity: capacityCount > 0 ? totalCapacity : null, bookingRate }
}

/**
 * يكمّل عدد النشاطات من قائمة «فعالياتي» إذا لم يُرجع الملخص هذا الحقل.
 * عند فشل الملخص يبقى كائناً يعرض على الأقل عدد الرحلات المحمّل من القائمة.
 */
export function withEventsCountFallback(normalized, eventsLength) {
  const n = Number(eventsLength)
  const len = Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
  const base =
    normalized && typeof normalized === "object"
      ? { ...normalized }
      : {
          totalSales: null,
          totalEvents: null,
          totalAttendees: null,
          bookingRate: null,
        }
  if (base.totalEvents == null && len != null) {
    base.totalEvents = len
  }
  return base
}
