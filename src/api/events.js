import api from "./api"

/** PATCH /api/events/{id}/status */
export async function patchEventStatus(eventId, status) {
  const { data } = await api.patch(`/events/${eventId}/status`, { status })
  return data
}

/**
 * PATCH /api/events/{id}/suspend-sales
 * @param {boolean} suspend
 */
export async function patchEventSuspendSales(eventId, suspend) {
  const { data } = await api.patch(`/events/${eventId}/suspend-sales`, { suspend: Boolean(suspend) })
  return data
}
