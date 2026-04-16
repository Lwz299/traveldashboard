import api from "../../../api/api"

/**
 * Admin Support Service
 * Handles all support ticket and user communication API calls
 */

export const supportService = {
  /**
   * Fetch all support tickets
   */
  fetchSupportTickets: async () => {
    const { data } = await api.get("/super-admin/support-tickets")
    return Array.isArray(data) ? data : data?.items ?? data?.tickets ?? []
  },

  /**
   * Get support ticket details
   * @param {number|string} ticketId
   */
  getTicketDetail: async (ticketId) => {
    const { data } = await api.get(`/super-admin/support-tickets/${ticketId}`)
    return data
  },

  /**
   * Update ticket status
   * @param {number|string} ticketId
   * @param {string} status
   */
  updateTicketStatus: async (ticketId, status) => {
    const { data } = await api.patch(`/super-admin/support-tickets/${ticketId}`, { status })
    return data
  },

  /**
   * Send ticket response
   * @param {number|string} ticketId
   * @param {string} message
   */
  sendTicketResponse: async (ticketId, message) => {
    const { data } = await api.post(`/super-admin/support-tickets/${ticketId}/respond`, {
      message,
    })
    return data
  },

  /**
   * Close support ticket
   * @param {number|string} ticketId
   * @param {string} resolution
   */
  closeTicket: async (ticketId, resolution) => {
    const { data } = await api.post(`/super-admin/support-tickets/${ticketId}/close`, {
      resolution,
    })
    return data
  },
}
