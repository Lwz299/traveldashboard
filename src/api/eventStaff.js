import api from "./api"

function extractArray(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") return data.items ?? data.staff ?? []
  return []
}

/** GET /api/events/{eventId}/staff */
export async function getEventStaff(eventId) {
  const { data } = await api.get(`/events/${eventId}/staff`)
  return extractArray(data)
}

/**
 * POST /api/events/{eventId}/staff
 * @param {{ applicationUserId: number, jobTitle?: string, responsibilities?: string }} payload
 */
export async function addEventStaff(eventId, payload) {
  const { data } = await api.post(`/events/${eventId}/staff`, payload)
  return data
}

/** DELETE /api/events/{eventId}/staff/{staffMemberId} */
export async function removeEventStaff(eventId, staffMemberId) {
  await api.delete(`/events/${eventId}/staff/${staffMemberId}`)
}

/**
 * PATCH /api/events/{eventId}/agenda/{agendaItemId}
 * @param {Record<string, unknown>} body — مثل { clearResponsible: true } أو { responsibleStaffMemberId: n }
 */
export async function patchAgendaItem(eventId, agendaItemId, body) {
  const { data } = await api.patch(`/events/${eventId}/agenda/${agendaItemId}`, body)
  return data
}
