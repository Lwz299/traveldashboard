/**
 * تطبيع استجابات قوائم الطلبات وتفاصيل الطلب (مصفوفات ملفوفة، PascalCase، إلخ).
 */

export function normalizeOrdersListPayload(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw !== "object") return []
  if (Array.isArray(raw.items)) return raw.items
  if (Array.isArray(raw.Items)) return raw.Items
  if (Array.isArray(raw.orders)) return raw.orders
  if (Array.isArray(raw.Orders)) return raw.Orders
  if (Array.isArray(raw.bookings)) return raw.bookings
  if (Array.isArray(raw.Bookings)) return raw.Bookings
  if (Array.isArray(raw.data)) return raw.data
  if (Array.isArray(raw.Data)) return raw.Data
  if (Array.isArray(raw.value)) return raw.value
  if (Array.isArray(raw.Value)) return raw.Value
  if (Array.isArray(raw.$values)) return raw.$values
  return []
}

/**
 * استخراج كائن الطلب من جسم الاستجابة (مثلاً { order: {...} } أو { data: {...} }).
 */
export function normalizeOrderDetailPayload(raw) {
  if (raw == null || typeof raw !== "object") return null
  if (Array.isArray(raw)) {
    if (raw.length === 1) return normalizeOrderDetailPayload(raw[0])
    return null
  }
  const inner =
    raw.booking ??
    raw.Booking ??
    raw.order ??
    raw.Order ??
    (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? raw.data : null) ??
    (raw.Data && typeof raw.Data === "object" && !Array.isArray(raw.Data) ? raw.Data : null) ??
    raw.result ??
    raw.Result ??
    raw.value ??
    raw.Value ??
    (raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload) ? raw.payload : null) ??
    (raw.Payload && typeof raw.Payload === "object" && !Array.isArray(raw.Payload) ? raw.Payload : null)
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner
  return raw
}

/** دمج صف القائمة مع تفاصيل الـ API (لا نفقد event من القائمة إذا التفاصيل ناقصة). */
export function mergeOrderDetailFromSources(apiDetail, listRow) {
  const a = apiDetail && typeof apiDetail === "object" ? apiDetail : null
  const b = listRow && typeof listRow === "object" ? listRow : null
  if (!a && !b) return null
  if (!b) return a
  if (!a) return b
  const merged = { ...b, ...a }
  const evA = a.event ?? a.Event ?? a.trip ?? a.Trip
  const evB = b.event ?? b.Event ?? b.trip ?? b.Trip
  if ((!evA || (typeof evA === "object" && Object.keys(evA).length === 0)) && evB && typeof evB === "object") {
    merged.event = merged.event ?? merged.Event ?? merged.trip ?? merged.Trip ?? evB
  }
  if (
    merged.eventId == null &&
    merged.EventId == null &&
    (b.eventId ?? b.EventId) != null
  ) {
    merged.eventId = b.eventId ?? b.EventId
  }
  return merged
}
