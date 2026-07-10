import api from "./api"
import { firstDefinedNonEmpty as pick } from "../utils/firstDefined"

/** GET /api/super-admin/me */
export async function fetchSuperAdminMe() {
  const { data } = await api.get("/super-admin/me")
  return data
}

/** PUT /api/super-admin/me */
export async function updateSuperAdminMe(payload) {
  const { data } = await api.put("/super-admin/me", payload)
  return data
}

/** POST /api/super-admin/me/change-password */
export async function changeSuperAdminPassword(payload) {
  const { data } = await api.post("/super-admin/me/change-password", payload)
  return data
}

/** POST /api/super-admin/me/avatar — multipart field `file` */
export async function uploadSuperAdminAvatar(file) {
  const fd = new FormData()
  fd.append("file", file)
  const { data } = await api.post("/super-admin/me/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function deleteSuperAdminAvatar() {
  const { data } = await api.delete("/super-admin/me/avatar")
  return data
}

function unwrapOrganizationsList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []
  return (
    data.items ??
    data.Items ??
    data.organizations ??
    data.Organizations ??
    data.data ??
    data.Data ??
    []
  )
}

/**
 * GET /api/super-admin/organizations — مع تراجع إلى GET /organizations
 */
export async function fetchSuperAdminOrganizations() {
  try {
    const { data } = await api.get("/super-admin/organizations")
    return unwrapOrganizationsList(data)
  } catch (err) {
    if (err?.response?.status !== 404 && err?.response?.status !== 405) throw err
    const { data } = await api.get("/organizations")
    return unwrapOrganizationsList(data)
  }
}

/** PUT /api/organizations/{id} */
export async function updateOrganization(orgId, payload) {
  const { data } = await api.put(`/organizations/${orgId}`, payload)
  return data
}

export function normalizeSuperAdminProfile(raw) {
  if (!raw || typeof raw !== "object") return null
  return {
    id: pick(raw, ["applicationUserId", "ApplicationUserId", "id", "Id"]),
    email: pick(raw, ["email", "Email"], ""),
    displayName: pick(raw, ["displayName", "DisplayName", "name", "Name"], ""),
    avatarUrl: pick(raw, ["avatarUrl", "AvatarUrl", "profileImageUrl", "ProfileImageUrl"], ""),
  }
}
