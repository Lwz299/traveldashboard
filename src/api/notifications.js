import api from "./api"

/** إشعارات المستخدم الحالي (in-app من DB) */
export async function getMyNotifications() {
  const res = await api.get("/notifications/my")
  return res.data ?? res
}

/** GET /notifications/unread-count — أي مستخدم مسجّل */
export async function getNotificationsUnreadCount() {
  const res = await api.get("/notifications/unread-count")
  return res.data ?? res
}

export async function markNotificationRead(notificationId) {
  const sid = encodeURIComponent(String(notificationId))
  const res = await api.put(`/notifications/${sid}/read`)
  return res.data ?? res
}

export async function markAllNotificationsRead() {
  const res = await api.put("/notifications/read-all")
  return res.data ?? res
}

/**
 * بث لجميع المستخدمين النشطين + تسجيل في سجل البثوات (SuperAdmin).
 * POST /super-admin/notifications/broadcast-all
 * @param {object} payload — title, body (مطلوبان)، source?, externalReferenceId?, metadataJson?
 */
export async function postSuperAdminBroadcastAll(payload) {
  const res = await api.post("/super-admin/notifications/broadcast-all", payload)
  return res.data ?? res
}

/**
 * سجل البثوات الجماعية (مراجعة / تدقيق).
 * GET /super-admin/notifications/broadcasts?q=&skip=&take=
 * @param {{ q?: string, skip?: number, take?: number }} params — take افتراضي 50، حد أقصى 200
 */
export async function getSuperAdminBroadcasts(params = {}) {
  const { q, skip = 0, take = 50 } = params
  const query = { skip, take: Math.min(Number(take) || 50, 200) }
  if (q != null && String(q).trim() !== "") query.q = String(q).trim()
  const res = await api.get("/super-admin/notifications/broadcasts", { params: query })
  return res.data ?? res
}

/**
 * سجل التسليم التفصيلي — كل إشعار وصل لمستخدم (UserNotifications).
 * GET /super-admin/notifications/delivered
 * @param {{ type?: string, q?: string, userId?: string, skip?: number, take?: number }} params — take حتى 200
 */
export async function getSuperAdminNotificationsDelivered(params = {}) {
  const { type, q, userId, skip = 0, take = 50 } = params
  const query = {
    skip: Number(skip) || 0,
    take: Math.min(Math.max(1, Number(take) || 50), 200),
  }
  if (type != null && String(type).trim() !== "") query.type = String(type).trim()
  if (q != null && String(q).trim() !== "") query.q = String(q).trim()
  if (userId != null && String(userId).trim() !== "") query.userId = String(userId).trim()
  const res = await api.get("/super-admin/notifications/delivered", { params: query })
  return res.data ?? res
}

/** @deprecated استخدم getSuperAdminBroadcasts */
export async function getSuperAdminBroadcastHistory() {
  return getSuperAdminBroadcasts({ skip: 0, take: 50 })
}

// --- مسارات /notifications (Organization, Admin, SuperAdmin) ---

/**
 * إشعار in-app لمشتري فعالية معيّنة.
 * POST /notifications/in-app/event/{eventId}
 */
export async function postInAppEventNotification(eventId, { title, body }) {
  const eid = encodeURIComponent(String(eventId))
  const res = await api.post(`/notifications/in-app/event/${eid}`, { title, body })
  return res.data ?? res
}

/**
 * إشعار لعملاء المنظمة (من اشترى من أي فعالية لها).
 * POST /notifications/in-app/organization
 * SuperAdmin: يلزم organizationId في الجسم.
 */
export async function postInAppOrganizationNotification({ title, body, organizationId }) {
  const payload = { title, body }
  if (organizationId != null && organizationId !== "") payload.organizationId = organizationId
  const res = await api.post("/notifications/in-app/organization", payload)
  return res.data ?? res
}

/**
 * Push تجريبي (حالياً Log فقط على الخادم).
 * POST /notifications/push/{userId} — Body: { title, message }
 */
export async function postPushNotification(userId, { title, message }) {
  const uid = encodeURIComponent(String(userId))
  const res = await api.post(`/notifications/push/${uid}`, { title, message })
  return res.data ?? res
}

/**
 * تكامل AI للبث العام (بدون JWT — يعتمد على X-AI-Broadcast-Key)
 * POST /integrations/ai/notifications/broadcast
 */
export async function postAiBroadcastNotification({ title, body, externalReferenceId, metadataJson }, apiKey) {
  const payload = { title, body }
  if (externalReferenceId != null && String(externalReferenceId).trim() !== "") {
    payload.externalReferenceId = String(externalReferenceId).trim()
  }
  if (metadataJson != null && String(metadataJson).trim() !== "") {
    payload.metadataJson = String(metadataJson).trim()
  }
  const headers = {}
  if (apiKey != null && String(apiKey).trim() !== "") {
    headers["X-AI-Broadcast-Key"] = String(apiKey).trim()
  }
  const res = await api.post("/integrations/ai/notifications/broadcast", payload, { headers })
  return res.data ?? res
}
