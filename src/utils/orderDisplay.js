/**
 * استخراج حقول الطلب من استجابات API (camelCase / PascalCase / كائن event متداخل).
 */

export function eventIdFromOrderPayload(o) {
  if (!o || typeof o !== "object") return null
  const nested = o.event ?? o.Event ?? o.trip ?? o.Trip
  if (nested && typeof nested === "object") {
    const nid = nested.id ?? nested.Id
    if (nid != null) return nid
  }
  return (
    o.eventId ??
    o.EventId ??
    o.tripEventId ??
    o.TripEventId ??
    o.event_id ??
    o.Event_ID ??
    null
  )
}

/** عنوان الرحلة للعرض في الجدول أو التفاصيل */
export function eventTitleFromOrderPayload(o, eventsById = {}) {
  const nested = o?.event ?? o?.Event ?? o?.trip ?? o?.Trip
  if (nested && typeof nested === "object") {
    const t = nested.title ?? nested.Title ?? nested.name ?? nested.Name
    if (t != null && String(t).trim() !== "") return String(t).trim()
  }
  const flat =
    o?.eventTitle ??
    o?.EventTitle ??
    o?.eventName ??
    o?.EventName ??
    o?.tripTitle ??
    o?.TripTitle ??
    o?.tripName ??
    o?.TripName
  if (flat != null && String(flat).trim() !== "") return String(flat).trim()

  const eid = eventIdFromOrderPayload(o)
  const ev = eid != null ? eventsById[eid] : null
  if (ev) {
    const t = ev.title ?? ev.name ?? ev.Title ?? ev.Name
    if (t != null && String(t).trim() !== "") return String(t).trim()
  }
  if (eid != null) return `رحلة #${eid}`
  return "—"
}

export function orderAmountFromPayload(o) {
  if (!o || typeof o !== "object") return null
  const v =
    o.totalAmount ??
    o.TotalAmount ??
    o.totalPrice ??
    o.TotalPrice ??
    o.amount ??
    o.Amount ??
    o.grandTotal ??
    o.GrandTotal ??
    o.subTotal ??
    o.SubTotal ??
    o.price ??
    o.Price
  if (v == null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : v
}

export function orderRowIdFromPayload(o) {
  return o?.id ?? o?.Id ?? o?.orderId ?? o?.OrderId ?? o?.orderNumber ?? o?.OrderNumber
}

export function orderStatusFromPayload(o) {
  const s = o?.status ?? o?.Status ?? o?.orderStatus ?? o?.OrderStatus ?? o?.paymentStatus ?? o?.PaymentStatus
  return s != null && String(s).trim() !== "" ? String(s) : null
}

export function orderCreatedFromPayload(o) {
  return (
    o?.createdAt ??
    o?.CreatedAt ??
    o?.orderDate ??
    o?.OrderDate ??
    o?.placedAt ??
    o?.PlacedAt
  )
}

/** كائن الرحلة من تفاصيل الطلب */
export function eventObjectFromDetail(d) {
  if (!d || typeof d !== "object") return null
  const ev = d.event ?? d.Event ?? d.trip ?? d.Trip
  if (ev && typeof ev === "object") return ev
  return null
}

const EVENT_DETAIL_LABELS = {
  id: "معرّف الرحلة",
  Id: "معرّف الرحلة",
  title: "العنوان",
  Title: "العنوان",
  name: "الاسم",
  Name: "الاسم",
  description: "الوصف",
  Description: "الوصف",
  startDate: "بداية الرحلة",
  StartDate: "بداية الرحلة",
  endDate: "نهاية الرحلة",
  EndDate: "نهاية الرحلة",
  location: "الموقع",
  Location: "الموقع",
  locationName: "اسم الموقع",
  LocationName: "اسم الموقع",
  status: "حالة النشر",
  Status: "حالة النشر",
}

const ORDER_PRIMITIVE_LABELS = {
  id: "رقم الطلب",
  Id: "رقم الطلب",
  orderId: "رقم الطلب",
  OrderId: "رقم الطلب",
  totalAmount: "المبلغ الإجمالي",
  TotalAmount: "المبلغ الإجمالي",
  totalPrice: "السعر الإجمالي",
  TotalPrice: "السعر الإجمالي",
  amount: "المبلغ",
  Amount: "المبلغ",
  status: "حالة الطلب",
  Status: "حالة الطلب",
  createdAt: "تاريخ الإنشاء",
  CreatedAt: "تاريخ الإنشاء",
  eventId: "معرّف الرحلة",
  EventId: "معرّف الرحلة",
  userId: "المستخدم",
  UserId: "المستخدم",
  applicationUserId: "معرّف الحساب",
  ApplicationUserId: "معرّف الحساب",
}

/** حقول بسيطة للعرض (تجاهل event لأنه يُعرض منفصلاً) */
export function orderDetailPrimitiveEntries(detail) {
  if (!detail || typeof detail !== "object") return []
  const skip = new Set([
    "event",
    "Event",
    "trip",
    "Trip",
    "items",
    "Items",
    "tickets",
    "Tickets",
    "lines",
    "Lines",
  ])
  const out = []
  for (const [k, v] of Object.entries(detail)) {
    if (skip.has(k)) continue
    if (v != null && typeof v !== "object") {
      out.push({ key: k, label: ORDER_PRIMITIVE_LABELS[k] ?? k, value: v })
      continue
    }
    if (
      v != null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).length > 0 &&
      Object.keys(v).length <= 24
    ) {
      const primitiveChild = Object.entries(v).filter(
        ([, v2]) => v2 != null && typeof v2 !== "object"
      )
      if (primitiveChild.length > 0) {
        for (const [k2, v2] of primitiveChild) {
          const composite = `${k}.${k2}`
          out.push({
            key: composite,
            label: ORDER_PRIMITIVE_LABELS[k2] ?? `${k}.${k2}`,
            value: v2,
          })
        }
      }
    }
  }
  return out
}

export function eventDetailEntries(eventObj) {
  if (!eventObj || typeof eventObj !== "object") return []
  const out = []
  for (const [k, v] of Object.entries(eventObj)) {
    if (v != null && typeof v !== "object" && typeof v !== "undefined") {
      out.push({ key: k, label: EVENT_DETAIL_LABELS[k] ?? k, value: v })
    }
  }
  return out
}
