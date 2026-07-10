import api from "./api"
import { firstDefinedNonEmpty as pick } from "../utils/firstDefined"

/** يفك غلاف { success, data: { items, total } } */
function unwrapEnvelope(data) {
  if (!data || typeof data !== "object") return null
  const inner = data.data ?? data.Data
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) return inner
  return data
}

function extractCustomersPage(data) {
  const payload = unwrapEnvelope(data)
  if (!payload) return { items: [], total: 0 }
  if (Array.isArray(payload)) return { items: payload, total: payload.length }
  const items = payload.items ?? payload.Items ?? payload.customers ?? payload.Customers ?? []
  const total =
    payload.total ??
    payload.Total ??
    payload.totalCount ??
    payload.TotalCount ??
    (Array.isArray(items) ? items.length : 0)
  return {
    items: Array.isArray(items) ? items : [],
    total: Number(total) || 0,
  }
}

export function normalizeAdminCustomer(row) {
  if (!row || typeof row !== "object") return null
  const id = pick(row, [
    "applicationUserId",
    "ApplicationUserId",
    "id",
    "Id",
    "userId",
    "UserId",
  ])
  return {
    ...row,
    id,
    applicationUserId: id,
    email: pick(row, ["email", "Email"], "") || null,
    phone: pick(row, ["phone", "Phone", "phoneNumber", "PhoneNumber"], ""),
    fullName: pick(row, ["displayName", "DisplayName", "fullName", "FullName", "name", "Name"], ""),
    displayName: pick(row, ["displayName", "DisplayName", "fullName", "FullName", "name", "Name"], ""),
    isActive: pick(row, ["isActive", "IsActive"], true),
    postsCount: pick(row, ["postsCount", "PostsCount"]),
    tripsBooked: pick(row, ["tripsBooked", "TripsBooked", "bookingsCount", "BookingsCount"]),
    lastLoginAt: pick(row, ["lastLoginAt", "LastLoginAt"]),
    createdAt: pick(row, ["createdAt", "CreatedAt"]),
  }
}

/**
 * GET /api/admin/customers
 * @param {{ search?: string, isActive?: boolean|string, page?: number, pageSize?: number }} params
 */
export async function fetchAdminCustomers(params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20))
  const query = { page, pageSize }
  if (params.search != null && String(params.search).trim() !== "") {
    query.search = String(params.search).trim()
  }
  if (params.isActive != null && params.isActive !== "") {
    query.isActive = params.isActive
  }
  const { data } = await api.get("/admin/customers", { params: query })
  const { items: rawItems, total } = extractCustomersPage(data)
  const items = rawItems.map(normalizeAdminCustomer).filter(Boolean)
  return { items, totalCount: total, page, pageSize }
}

export async function fetchAdminCustomer(customerId) {
  const { data } = await api.get(`/admin/customers/${customerId}`)
  const payload = unwrapEnvelope(data) ?? data
  const row = payload?.customer ?? payload?.Customer ?? payload
  return normalizeAdminCustomer(row) ?? row
}

export async function patchCustomerStatus(customerId, payload) {
  const { data } = await api.patch(`/admin/customers/${customerId}/status`, payload)
  return data
}

export async function revokeCustomerSessions(customerId) {
  const { data } = await api.post(`/admin/customers/${customerId}/revoke-sessions`)
  return data
}
