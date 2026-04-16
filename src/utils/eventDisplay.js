/** Shared event row helpers — org + admin listings */
import { resolveApiAssetUrl } from "./apiAssetUrl"

export function firstDefined(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k]
      if (v !== undefined && v !== null) return v
    }
  }
  return undefined
}

export function eventLocation(ev) {
  const v = firstDefined(ev, ["locationName", "location", "Location", "venue", "Venue"])
  return v != null && String(v).trim() !== "" ? String(v).trim() : null
}

export function eventPrice(ev) {
  const v = firstDefined(ev, ["price", "Price", "minPrice", "MinPrice", "startingPrice", "lowestPrice"])
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function bookingCountFromNestedStats(ev) {
  if (!ev || typeof ev !== "object") return null
  const stats = ev.statistics ?? ev.Statistics ?? ev.stats ?? ev.Stats ?? ev.metrics ?? ev.Metrics
  if (!stats || typeof stats !== "object") return null
  const keys = [
    "totalBookings",
    "TotalBookings",
    "ticketsSold",
    "TicketsSold",
    "bookingsCount",
    "BookingsCount",
    "totalTicketsSold",
    "TotalTicketsSold",
    "soldTickets",
    "SoldTickets",
    "attendeeCount",
    "AttendeeCount",
    "totalAttendees",
    "TotalAttendees",
  ]
  for (const k of keys) {
    const v = stats[k]
    if (v !== undefined && v !== null && Number.isFinite(Number(v))) return Number(v)
  }
  return null
}

export function eventBookingsCount(ev) {
  const v = firstDefined(ev, [
    "ticketsSold",
    "TicketsSold",
    "totalBookings",
    "totalTicketsSold",
    "TotalTicketsSold",
    "bookingsCount",
    "BookingsCount",
    "soldTickets",
    "SoldTickets",
    "bookings",
    "Bookings",
    "attendeeCount",
    "AttendeeCount",
    "totalAttendees",
    "TotalAttendees",
    "numberOfBookings",
    "NumberOfBookings",
    "ordersCount",
    "OrdersCount",
    "purchaseCount",
    "PurchaseCount",
    "registeredTickets",
    "RegisteredTickets",
  ])
  if (v !== undefined && v !== null && Number.isFinite(Number(v))) return Number(v)
  return bookingCountFromNestedStats(ev)
}

/** مجموع التذاكر المباعة من صفوف أنواع التذاكر إذا وُجدت حقول sold لكل نوع */
export function eventBookingsFromTicketTypes(types) {
  if (!Array.isArray(types) || types.length === 0) return null
  let sum = 0
  let any = false
  for (const t of types) {
    const v = firstDefined(t, [
      "soldCount",
      "SoldCount",
      "ticketsSold",
      "TicketsSold",
      "bookedCount",
      "BookedCount",
      "quantitySold",
      "QuantitySold",
      "numberOfSales",
      "salesCount",
    ])
    if (v !== undefined && v !== null && Number.isFinite(Number(v))) {
      sum += Number(v)
      any = true
    }
  }
  return any ? sum : null
}

/** حضور / تسجيل دخول إن وُجد في الـ DTO */
export function eventAttendanceCount(ev) {
  if (!ev || typeof ev !== "object") return null
  const v = firstDefined(ev, [
    "checkedInCount",
    "CheckedInCount",
    "checkInCount",
    "CheckInCount",
    "attendanceCount",
    "AttendanceCount",
    "checkedIn",
    "CheckedIn",
  ])
  if (v !== undefined && v !== null && Number.isFinite(Number(v))) return Number(v)
  const stats = ev.statistics ?? ev.Statistics ?? ev.stats ?? ev.Stats
  if (stats && typeof stats === "object") {
    const sv = firstDefined(stats, ["checkedInCount", "CheckedInCount", "attendanceCount", "AttendanceCount"])
    if (sv != null && Number.isFinite(Number(sv))) return Number(sv)
  }
  return null
}

/** اسم الشركة / المنظمة — مسطّح أو من كائن organization */
export function eventOrganizationName(ev) {
  if (!ev || typeof ev !== "object") return null
  const nested = ev.organization ?? ev.Organization
  if (nested && typeof nested === "object") {
    const n = nested.name ?? nested.Name ?? nested.title ?? nested.Title
    if (n != null && String(n).trim() !== "") return String(n).trim()
  }
  const flat = firstDefined(ev, ["organizationName", "OrganizationName", "orgName", "OrgName"])
  return flat != null && String(flat).trim() !== "" ? String(flat).trim() : null
}

export function eventCapacity(ev) {
  const v = firstDefined(ev, ["capacity", "Capacity", "maxCapacity", "MaxCapacity"])
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function eventStartDate(ev) {
  const raw = ev.startDate ?? ev.StartDate
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Published = green, Draft = red, Cancelled = neutral */
export function statusBadgeClass(status) {
  const s = (status || "Draft").toString()
  if (s === "Published")
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/90"
  if (s === "Draft") return "bg-red-50 text-red-800 ring-1 ring-red-200/90"
  if (s === "Cancelled") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200/90"
  return "bg-sky-50 text-sky-900 ring-1 ring-sky-100/90"
}

export function statusLabelAr(status) {
  const s = (status || "Draft").toString()
  if (s === "Published") return "منشور"
  if (s === "Draft") return "مسودة"
  if (s === "Cancelled") return "ملغى"
  return s
}

/** صورة الغلاف أو أول صورة من معرض الفعالية */
export function eventPrimaryImageUrl(ev) {
  const images = firstDefined(ev, ["images", "Images"])
  if (Array.isArray(images) && images.length > 0) {
    const cover = images.find((x) => Boolean(firstDefined(x, ["isCover", "IsCover"])))
    const first = cover ?? images[0]
    const u = firstDefined(first, ["url", "Url", "imageUrl", "ImageUrl"])
    if (u) return resolveApiAssetUrl(String(u))
  }
  const raw = firstDefined(ev, ["imageUrl", "ImageUrl"])
  return raw ? resolveApiAssetUrl(String(raw)) : null
}

export function eventImagesArray(ev) {
  const images = firstDefined(ev, ["images", "Images"])
  return Array.isArray(images) ? images : []
}

export const eventFiltersInitial = {
  search: "",
  status: "all",
  dateFrom: "",
  dateTo: "",
}
