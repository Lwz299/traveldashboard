import api from "./api"

const VALID_PRIORITIES = new Set(["Low", "Medium", "High", "Critical"])

function sanitizePriority(priority) {
  const v = String(priority ?? "").trim()
  return VALID_PRIORITIES.has(v) ? v : "Medium"
}

// دعم المستخدم/المنظمة
export async function createSupportTicket({ subject, body, priority }) {
  const payload = { subject, body, priority: sanitizePriority(priority) }
  const res = await api.post("/support/tickets", payload)
  return res.data ?? res
}

export async function listSupportTickets() {
  const res = await api.get("/support/tickets")
  return res.data ?? res
}

export async function getSupportTicket(id) {
  const res = await api.get(`/support/tickets/${id}`)
  return res.data ?? res
}

// دعم SuperAdmin
export async function listAdminSupportTickets() {
  const res = await api.get("/support/admin/tickets")
  return res.data ?? res
}

export async function listAdminSupportTicketsPage(params = {}) {
  const {
    identityType,
    status,
    q,
    skip = 0,
    take = 20,
  } = params

  const query = {
    skip,
    take,
  }
  if (identityType) query.identityType = identityType
  if (status) query.status = status
  if (q) query.q = q

  const res = await api.get("/support/admin/tickets", { params: query })
  return res.data ?? res
}

export async function getAdminSupportTicket(id) {
  const res = await api.get(`/support/admin/tickets/${id}`)
  return res.data ?? res
}

export async function postAdminSupportMessage({ id, body }) {
  const res = await api.post(`/support/admin/tickets/${id}/messages`, { body })
  return res.data ?? res
}

export async function closeAdminSupportTicket(id) {
  const res = await api.patch(`/support/admin/tickets/${id}/close`, {})
  return res.data ?? res
}

export async function updateAdminSupportTicketStatus({ id, status }) {
  const res = await api.patch(`/support/admin/tickets/${id}/status`, { status })
  return res.data ?? res
}

export async function getAdminSupportTicketsAnalytics() {
  const res = await api.get("/support/admin/tickets/analytics")
  return res.data ?? res
}

export async function escalateUnansweredAdminSupportTickets(hours = 24) {
  const res = await api.post("/support/admin/tickets/escalate-unanswered", null, {
    params: { hours },
  })
  return res.data ?? res
}

