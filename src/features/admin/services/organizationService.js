import api from "../../../api/api"

/**
 * Admin Organizations Service
 * Handles all organization management API calls
 */

export const organizationService = {
  /**
   * Fetch all organizations
   */
  fetchOrganizations: async () => {
    const { data } = await api.get("/organizations")
    return Array.isArray(data) ? data : data?.items ?? data?.organizations ?? []
  },

  /**
   * Update organization details
   * @param {number|string} orgId
   * @param {object} orgData
   */
  updateOrganization: async (orgId, orgData) => {
    const { data } = await api.put(`/organizations/${orgId}`, {
      name: orgData.name || undefined,
      description: orgData.description || undefined,
      email: orgData.email || undefined,
      phone: orgData.phone || undefined,
      organizationName: orgData.name || undefined,
      organizationDescription: orgData.description || undefined,
      organizationEmail: orgData.email || undefined,
      organizationPhone: orgData.phone || undefined,
    })
    return data
  },

  /**
   * Get organization accounts
   * @param {number|string} orgId
   */
  getOrganizationAccounts: async (orgId) => {
    const { data } = await api.get(`/organizations/${orgId}/accounts`)
    return data
  },

  /**
   * Verify/approve organization
   * @param {number|string} orgId
   */
  approveOrganization: async (orgId) => {
    const { data } = await api.post(`/organizations/${orgId}/approve`, {})
    return data
  },

  /**
   * Reject organization
   * @param {number|string} orgId
   * @param {object} reason
   */
  rejectOrganization: async (orgId, reason) => {
    const { data } = await api.post(`/organizations/${orgId}/reject`, reason)
    return data
  },
}
