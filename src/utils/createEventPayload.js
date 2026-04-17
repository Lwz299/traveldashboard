/**
 * @typedef {Object} CreateEventPayload
 * @property {string} title
 * @property {string} [description]
 * @property {string|null} [startDate]
 * @property {string|null} [endDate]
 * @property {string} [location]
 * @property {string} [locationName]
 * @property {number} [categoryId]
 * @property {number} [capacity]
 * @property {number} [price]
 * @property {string} [bookingDeadline]
 * @property {number} [organizationId] — مطلوب عند دور SuperAdmin في POST /events؛ يُستبعد عند Organization (يُحدَّد من JWT).
 */

/**
 * يستخرج معرف الفعالية من رد إنشاء الفعالية.
 * @param {object} data
 * @returns {string|number|null}
 */
export function eventIdFromCreateResponse(data) {
  if (!data || typeof data !== "object") return null
  return data.id ?? data.Id ?? data.eventId ?? data.EventId ?? null
}
