import api from "../../../api/api"

/**
 * Admin Dashboard Service
 * Handles all dashboard-related API calls
 */

export const dashboardService = {
  /**
   * Get global summary statistics
   */
  getGlobalSummary: async () => {
    const { data } = await api.get("/super-admin/reports/global-summary")
    return data
  },

  /**
   * Get organization comparison data
   */
  getOrganizationComparison: async () => {
    const { data } = await api.get("/super-admin/reports/organization-comparison")
    // Normalize response structure
    const raw = Array.isArray(data) ? data : data?.items ?? data?.organizations ?? data?.Rows ?? []
    return Array.isArray(raw) ? raw : []
  },

  /**
   * Get all events for dashboard
   */
  getAllEvents: async () => {
    const { data } = await api.get("/events")
    const raw = Array.isArray(data) ? data : data?.items ?? data?.events ?? []
    return Array.isArray(raw) ? raw : []
  },
}
