import api from "../../../api/api"
import { uploadEventImages } from "../../../api/eventImages"

/**
 * Admin Events Service
 * Handles all event management API calls
 */

export const eventService = {
  /**
   * Fetch all events
   */
  fetchEvents: async () => {
    const { data } = await api.get("/events")
    return Array.isArray(data) ? data : data?.items ?? data?.events ?? []
  },

  /**
   * Get event performance/booking data
   * @param {number|string} eventId
   */
  getEventPerformance: async (eventId) => {
    const { data } = await api.get(`/reports/event-performance/${eventId}`)
    return data
  },

  /**
   * Update event details
   * @param {number|string} eventId
   * @param {object} eventData
   */
  updateEvent: async (eventId, eventData) => {
    const { data } = await api.put(`/events/${eventId}`, eventData)
    return data
  },

  /**
   * Delete an event
   * @param {number|string} eventId
   */
  deleteEvent: async (eventId) => {
    const { data } = await api.delete(`/events/${eventId}`)
    return data
  },

  /**
   * Upload event images
   * @param {number|string} eventId
   * @param {FormData} formData
   */
  uploadImages: async (eventId, formData) => {
    return uploadEventImages(eventId, formData)
  },

  /**
   * Cancel event
   * @param {number|string} eventId
   */
  cancelEvent: async (eventId) => {
    const { data } = await api.post(`/events/${eventId}/cancel`, {})
    return data
  },
}
