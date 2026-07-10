import api from "./api"
import { firstDefinedNonEmpty as pick } from "../utils/firstDefined"

function extractAccounts(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []
  return data.items ?? data.Items ?? data.accounts ?? data.Accounts ?? data.data ?? data.Data ?? []
}

export function normalizeOrgAccount(row) {
  if (!row || typeof row !== "object") return null
  return {
    ...row,
    id: pick(row, ["id", "Id", "applicationUserId", "ApplicationUserId"]),
    email: pick(row, ["email", "Email"], ""),
    displayName: pick(row, ["displayName", "DisplayName", "name", "Name"], ""),
    orgRole: pick(row, ["orgRole", "OrgRole", "role", "Role"], ""),
    isActive: pick(row, ["isActive", "IsActive"], true),
    permissions: pick(row, ["permissions", "Permissions"]),
  }
}

/** GET /api/super-admin/organizations/{orgId}/accounts */
export async function fetchOrgAccounts(orgId) {
  const { data } = await api.get(`/super-admin/organizations/${orgId}/accounts`)
  return extractAccounts(data).map(normalizeOrgAccount).filter(Boolean)
}

/** GET /api/super-admin/organization-accounts/{id} */
export async function fetchOrgAccount(accountId) {
  const { data } = await api.get(`/super-admin/organization-accounts/${accountId}`)
  return normalizeOrgAccount(data?.account ?? data?.Account ?? data) ?? data
}

/** PUT /api/super-admin/organization-accounts/{id} */
export async function updateOrgAccount(accountId, payload) {
  const { data } = await api.put(`/super-admin/organization-accounts/${accountId}`, payload)
  return data
}

/** PATCH /api/super-admin/organization-accounts/{id}/permissions */
export async function patchOrgAccountPermissions(accountId, permissions) {
  const { data } = await api.patch(`/super-admin/organization-accounts/${accountId}/permissions`, {
    permissions,
  })
  return data
}

/** PATCH /api/super-admin/organization-accounts/{id}/status */
export async function patchOrgAccountStatus(accountId, isActive) {
  const { data } = await api.patch(`/super-admin/organization-accounts/${accountId}/status`, {
    isActive: Boolean(isActive),
  })
  return data
}

/** POST /api/super-admin/organization-accounts/{id}/send-reset */
export async function sendOrgAccountPasswordReset(accountId) {
  const { data } = await api.post(`/super-admin/organization-accounts/${accountId}/send-reset`)
  return data
}

/** POST /api/super-admin/organization-accounts/{id}/force-password */
export async function forceOrgAccountPassword(accountId, newPassword) {
  const { data } = await api.post(`/super-admin/organization-accounts/${accountId}/force-password`, {
    newPassword,
  })
  return data
}

/** POST /api/super-admin/organizations/{orgId}/accounts */
export async function createOrgAccount(orgId, payload) {
  const { data } = await api.post(`/super-admin/organizations/${orgId}/accounts`, payload)
  return data
}

/** DELETE /api/super-admin/organization-accounts/{id} */
export async function deleteOrgAccount(accountId) {
  const { data } = await api.delete(`/super-admin/organization-accounts/${accountId}`)
  return data
}
