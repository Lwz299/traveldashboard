import api from "../../../api/api"

/**
 * Admin Finance Service
 * Handles all financial and payment-related API calls
 */

export const financeService = {
  /**
   * Get platform financial summary
   */
  getFinancialSummary: async () => {
    const { data } = await api.get("/super-admin/reports/financial-summary")
    return data
  },

  /**
   * Get financial activity/transactions
   * @param {object} filters
   */
  getFinancialActivity: async (filters = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/super-admin/finance/activity?${params}`)
    return data
  },

  /**
   * Get payout requests
   */
  getPayoutRequests: async () => {
    const { data } = await api.get("/super-admin/payouts/requests")
    return Array.isArray(data) ? data : data?.items ?? data?.payouts ?? []
  },

  /**
   * Approve payout request
   * @param {number|string} payoutId
   */
  approvePayoutRequest: async (payoutId) => {
    const { data } = await api.post(`/super-admin/payouts/${payoutId}/approve`, {})
    return data
  },

  /**
   * Reject payout request
   * @param {number|string} payoutId
   * @param {object} reason
   */
  rejectPayoutRequest: async (payoutId, reason) => {
    const { data } = await api.post(`/super-admin/payouts/${payoutId}/reject`, reason)
    return data
  },

  /**
   * Get wallet balance
   */
  getWalletBalance: async () => {
    const { data } = await api.get("/super-admin/wallet/balance")
    return data
  },
}
