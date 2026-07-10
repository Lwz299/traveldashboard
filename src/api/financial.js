import api from "./api"

function extractArray(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const raw =
      data.items ??
      data.Items ??
      data.transactions ??
      data.Transactions ??
      data.rows ??
      data.Rows ??
      data.payouts ??
      data.data ??
      data.Data ??
      []
    return Array.isArray(raw) ? raw : []
  }
  return []
}

function pickFirstNum(...vals) {
  for (const v of vals) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickFirstStr(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return null
}

/**
 * يوحّد حقول سطر أرباح التذاكر بعد استجابة الـ API.
 * أولوية اسم النوع كما في الخادم: `ticketTypeName` المسطّح (JSON camelCase)، ثم TicketType على التذكرة، ثم على OrderItem.
 * @param {Record<string, unknown>} raw
 */
function normalizeTicketEarningItem(raw) {
  if (!raw || typeof raw !== "object") return raw
  const oi = raw.orderItem ?? raw.OrderItem ?? raw.order_item
  const ttFromTicket = raw.ticketType ?? raw.TicketType
  const ttFromOrderItem = oi?.ticketType ?? oi?.TicketType

  const ticketTypeName = pickFirstStr(
    raw.ticketTypeName,
    raw.TicketTypeName,
    raw.ticket_type_name,
    ttFromTicket?.name,
    ttFromTicket?.Name,
    ttFromTicket?.title,
    ttFromTicket?.Title,
    ttFromOrderItem?.name,
    ttFromOrderItem?.Name,
    ttFromOrderItem?.title,
    ttFromOrderItem?.Title,
    oi?.ticketTypeName,
    oi?.TicketTypeName,
    oi?.ticket_type_name,
    raw.ticketName,
    raw.TicketName,
    oi?.ticketName,
    oi?.TicketName
  )

  const ticketTypeId = pickFirstNum(
    raw.ticketTypeId,
    raw.TicketTypeId,
    ttFromTicket?.id,
    ttFromTicket?.Id,
    ttFromOrderItem?.id,
    ttFromOrderItem?.Id,
    oi?.ticketTypeId,
    oi?.TicketTypeId
  )

  const eventTitle = pickFirstStr(raw.eventTitle, raw.EventTitle, raw.event_name, raw.Event_Name)
  const eventId = pickFirstNum(raw.eventId, raw.EventId)

  return {
    ...raw,
    ...(ticketTypeName != null ? { ticketTypeName } : {}),
    ...(ticketTypeId != null ? { ticketTypeId } : {}),
    ...(eventTitle != null ? { eventTitle } : {}),
    ...(eventId != null ? { eventId } : {}),
  }
}

function normalizeWalletTypeForFilter(row, filterLower) {
  const raw = String(row?.type ?? row?.Type ?? row?.transactionType ?? row?.TransactionType ?? "").toLowerCase()
  if (!filterLower || !raw) return !filterLower
  if (raw === filterLower) return true
  return raw.includes(filterLower)
}

/**
 * حركات المحفظة من my-wallet (عميلياً: تصفية + skip/take) — احتياط عندما لا يكون مسار wallet-transactions متاحاً بعد.
 * @param {{ skip?: number, take?: number, type?: string }} params
 */
async function fetchWalletTransactionsFromMyWallet(params = {}) {
  const { data } = await api.get("/payouts/my-wallet")
  let list = data?.recentTransactions ?? data?.RecentTransactions ?? []
  if (!Array.isArray(list)) list = []

  const typeRaw = params.type != null && String(params.type).trim() !== "" ? String(params.type).trim().toLowerCase() : null
  if (typeRaw) {
    list = list.filter((row) => normalizeWalletTypeForFilter(row, typeRaw))
  }

  const skip = Math.max(0, Number(params.skip) || 0)
  const takeRaw = Number(params.take)
  const take = Number.isFinite(takeRaw) ? Math.min(200, Math.max(1, takeRaw)) : 50
  const totalCount = list.length
  const items = list.slice(skip, skip + take)

  return {
    items,
    totalCount,
    skip,
    take,
  }
}

function shouldTryMyWalletFallback(error) {
  const status = error?.response?.status
  if (status === 401 || status === 403) return false
  return true
}

/** رسالة عربية واضحة عند فشل جلب الحركات (بعد استنفاد الاحتياط من my-wallet). */
export function formatWalletTransactionsError(error) {
  const d = error?.response?.data
  const status = error?.response?.status
  if (typeof d === "string" && d.trim()) return d.trim()
  if (d && typeof d === "object") {
    const m = d.message ?? d.Message ?? d.title ?? d.Title ?? d.detail ?? d.Detail
    if (m != null && String(m).trim()) return String(m).trim()
  }
  if (!error?.response) {
    return "لا يمكن الوصول للخادم. تحقق من الشبكة أو من صحة عنوان الـ API (مثل VITE_API_URL)."
  }
  if (status === 404) {
    return "المسار غير متوفر على الخادم (404). إن كان الخادم قديماً، حدّثه؛ وإلا راجع إعداد عنوان الـ API."
  }
  return "تعذر تحميل حركات المحفظة. تحقق من الاتصال وحاول مجدداً."
}

/**
 * GET /api/payouts/wallet-transactions — صفحات حركات المحفظة (للواجهات الثقيلة).
 * GET /api/payouts/my-wallet ما زال يعيد الرصيد + كل الحركات في recentTransactions (نفس DTO بما فيه id).
 *
 * إن فشل المسار الجديد (مثلاً 404 على خادم قديم) يُحاول الجلب من my-wallet مع تطبيق skip/take/type على العميل.
 *
 * Query: skip (افتراضي 0), take (افتراضي 50، أقصى 200), type (اختياري: Credit | Debit | Refund، بدون حساسية لحالة الأحرف)
 * @param {{ skip?: number, take?: number, type?: string }} params
 * @returns {Promise<{ items: unknown[], totalCount: number, skip: number, take: number }>}
 */
export async function fetchWalletTransactions(params = {}) {
  const skip = Math.max(0, Number(params.skip) || 0)
  const takeRaw = Number(params.take)
  const take = Number.isFinite(takeRaw) ? Math.min(200, Math.max(1, takeRaw)) : 50
  const query = { skip, take }
  const t = params.type != null && String(params.type).trim() !== "" ? String(params.type).trim() : null
  if (t) query.type = t

  try {
    const { data } = await api.get("/payouts/wallet-transactions", { params: query })
    const items = extractArray(data)
    const totalCount = Number(data?.totalCount ?? data?.TotalCount ?? items.length) || 0
    const skipOut = Number(data?.skip ?? data?.Skip ?? skip) || 0
    const takeOut = Number(data?.take ?? data?.Take ?? take) || take

    return {
      items: Array.isArray(items) ? items : [],
      totalCount,
      skip: skipOut,
      take: takeOut,
    }
  } catch (err) {
    if (!shouldTryMyWalletFallback(err)) throw err
    try {
      return await fetchWalletTransactionsFromMyWallet(params)
    } catch {
      throw err
    }
  }
}

/** @deprecated استخدم fetchWalletTransactions */
export async function fetchOrganizationWalletTransactions() {
  const { items } = await fetchWalletTransactions({ skip: 0, take: 50 })
  return items
}

/** سجل طلبات السحب للمنظمة — GET /payouts/history */
export async function fetchOrganizationPayoutHistory() {
  try {
    const { data } = await api.get("/payouts/history")
    return extractArray(data)
  } catch {
    return []
  }
}

/**
 * GET `/api/payouts/ticket-earnings` — أرباح التذاكر (حساب Organization؛ التوكن يحتوي `orgId`).
 *
 * Query: `skip` (افتراضي 0)، `take` (افتراضي 50، حد أقصى 200 على الخادم). يُستدعى عبر axios (`api.js`) مع `Authorization: Bearer`.
 *
 * الاستجابة: `{ totalCount, skip, take, items }` (camelCase). ربط أعمدة الواجهة:
 * الفعالية ← `eventTitle` | نوع التذكرة ← `ticketTypeName` | الإجمالي ← `grossPerTicket` |
 * النسبة ← `commissionPercent` أو `commissionRate` | عمولة المنصة ← `platformFeePerTicket` | صافي المنظمة ← `organizerNetPerTicket` |
 * طلب/تاريخ ← `orderId` (قيمة bookingId فعلياً في v2), `createdAt`.
 *
 * حقول إضافية: `usedFallbackUnitPrice`, `ticketId`, `orderItemId`, `qrCode`. يدعم التطبيع أسماء PascalCase وتداخلاً (`orderItem` / `ticketType`).
 * يُعرض عمود «نوع التذكرة» من `ticketTypeName`؛ يملأه الخادم غالباً من `Ticket.TicketType` ثم `OrderItem.TicketType` إن لزم.
 *
 * @param {{ skip?: number, take?: number }} params
 * @returns {Promise<{ items: unknown[], totalCount: number, skip: number, take: number }>}
 */
export async function fetchTicketEarnings(params = {}) {
  const skip = Math.max(0, Number(params.skip) || 0)
  const takeRaw = Number(params.take)
  const take = Number.isFinite(takeRaw) ? Math.min(200, Math.max(1, takeRaw)) : 50
  try {
    const { data } = await api.get("/payouts/ticket-earnings", { params: { skip, take } })
    const items = extractArray(data).map((row) => normalizeTicketEarningItem(row))
    const totalCount = Number(data?.totalCount ?? data?.TotalCount ?? items.length) || 0
    const skipOut = Number(data?.skip ?? data?.Skip ?? skip) || 0
    const takeOut = Number(data?.take ?? data?.Take ?? take) || take
    return {
      items: Array.isArray(items) ? items : [],
      totalCount,
      skip: skipOut,
      take: takeOut,
    }
  } catch (err) {
    if (err?.response?.status === 404) {
      return { items: [], totalCount: 0, skip, take }
    }
    throw err
  }
}

/**
 * سجل سحوبات لعرض السوبر أدمن (إن وُجد في الخادم).
 */
export async function fetchAdminPayoutFeed() {
  const paths = ["/super-admin/payouts", "/payouts/all", "/payouts"]
  for (const path of paths) {
    try {
      const { data } = await api.get(path)
      const arr = extractArray(data)
      if (Array.isArray(arr)) return arr
    } catch {
      /* التالي */
    }
  }
  return []
}
