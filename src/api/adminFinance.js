import api from "./api"

function extractArray(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const raw =
      data.items ??
      data.Items ??
      data.transactions ??
      data.Transactions ??
      data.rows ??
      data.Rows ??
      data.data ??
      data.Data ??
      []
    return Array.isArray(raw) ? raw : []
  }
  return []
}

/** GET /api/super-admin/platform-wallet */
export async function fetchPlatformWallet() {
  const { data } = await api.get("/super-admin/platform-wallet")
  return data ?? null
}

/**
 * GET /api/super-admin/platform-wallet/transactions
 * @param {{ skip?: number, take?: number }} params
 */
export async function fetchPlatformWalletTransactions(params = {}) {
  const skip = Math.max(0, Number(params.skip) || 0)
  const takeRaw = Number(params.take)
  const take = Number.isFinite(takeRaw) ? Math.min(200, Math.max(1, takeRaw)) : 25
  const { data } = await api.get("/super-admin/platform-wallet/transactions", { params: { skip, take } })
  const items = extractArray(data)
  const totalCount = Number(data?.totalCount ?? data?.TotalCount ?? items.length) || 0
  const skipOut = Number(data?.skip ?? data?.Skip ?? skip) || 0
  const takeOut = Number(data?.take ?? data?.Take ?? take) || take
  return {
    items: Array.isArray(items) ? items : [],
    totalCount,
    skip: skipOut,
    take: takeOut,
  }
}

/** GET /api/super-admin/organizations/financial-overview */
export async function fetchOrganizationsFinancialOverview() {
  const { data } = await api.get("/super-admin/organizations/financial-overview")
  return extractArray(data)
}

/** PUT /api/super-admin/organizations/{id}/commission-rate — Body: { commissionRate } (0–1) */
export async function putOrganizationCommissionRate(organizationId, commissionRate) {
  await api.put(`/super-admin/organizations/${organizationId}/commission-rate`, { commissionRate })
}

/**
 * GET /api/super-admin/payouts — سجل سحوبات المنصة (سوبر أدمن).
 * Query: skip (0)، take (50، حد 200)، status (اختياري: Pending | Approved … غير حساس لحالة الأحرف).
 * الاستجابة: totalCount, skip, take, items — كل عنصر: id, organizationId, organizationName, amount, status,
 * transactionReference, requestedAt, processedAt.
 */
export async function fetchSuperAdminPayouts(params = {}) {
  const skip = Math.max(0, Number(params.skip) || 0)
  const takeRaw = Number(params.take)
  const take = Number.isFinite(takeRaw) ? Math.min(200, Math.max(1, takeRaw)) : 50
  const query = { skip, take }
  const st = params.status != null && String(params.status).trim() !== "" ? String(params.status).trim() : null
  if (st) query.status = st
  const { data } = await api.get("/super-admin/payouts", { params: query })
  const items = extractArray(data)
  const totalCount = Number(data?.totalCount ?? data?.TotalCount ?? items.length) || 0
  const skipOut = Number(data?.skip ?? data?.Skip ?? skip) || 0
  const takeOut = Number(data?.take ?? data?.Take ?? take) || take
  return {
    items: Array.isArray(items) ? items : [],
    totalCount,
    skip: skipOut,
    take: takeOut,
  }
}
