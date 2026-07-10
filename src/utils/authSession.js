/** معرّف الجهاز لطلبات refresh — يطابق مواصفة الداشبورد */
export const AUTH_DEVICE_ID = "dashboard-web"

export function persistOrgSession(data) {
  const token = data?.token ?? data?.accessToken ?? data?.jwt
  const refreshToken = data?.refreshToken ?? data?.RefreshToken
  const orgId = data?.organizationId ?? data?.orgId ?? data?.organization_id
  const accountId =
    data?.applicationUserId ?? data?.accountId ?? data?.id ?? data?.userId ?? orgId
  const orgRole = data?.orgRole ?? data?.role ?? null

  if (token) localStorage.setItem("token", token)
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
  if (orgId != null && orgId !== "") localStorage.setItem("orgId", String(orgId))
  if (accountId != null && accountId !== "") localStorage.setItem("accountId", String(accountId))
  if (orgRole) localStorage.setItem("orgRole", orgRole)
  localStorage.removeItem("isSuperAdmin")

  return {
    token,
    refreshToken,
    orgId: orgId != null ? String(orgId) : null,
    accountId: accountId != null ? String(accountId) : null,
    orgRole,
    isSuperAdmin: false,
    ...data,
  }
}

export function persistAdminSession(data) {
  const token = data?.token ?? data?.accessToken ?? data?.jwt
  const refreshToken = data?.refreshToken ?? data?.RefreshToken
  const accountId = data?.applicationUserId ?? data?.accountId ?? data?.id ?? data?.userId

  if (token) localStorage.setItem("token", token)
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
  if (accountId != null && accountId !== "") localStorage.setItem("accountId", String(accountId))
  localStorage.setItem("isSuperAdmin", "true")
  localStorage.removeItem("orgId")
  localStorage.removeItem("orgRole")

  return {
    token,
    refreshToken,
    accountId: accountId != null ? String(accountId) : null,
    isSuperAdmin: true,
    ...data,
  }
}

export function readStoredSession() {
  const token = localStorage.getItem("token")
  const orgId = localStorage.getItem("orgId")
  const accountId = localStorage.getItem("accountId")
  const orgRole = localStorage.getItem("orgRole")
  const refreshToken = localStorage.getItem("refreshToken")
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true"
  if (!token || (!orgId && !isSuperAdmin)) return null
  return {
    token,
    refreshToken,
    orgId: orgId || null,
    accountId: accountId || orgId || null,
    orgRole: orgRole || null,
    isSuperAdmin,
  }
}

export function clearAuthSession() {
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("orgId")
  localStorage.removeItem("accountId")
  localStorage.removeItem("orgRole")
  localStorage.removeItem("isSuperAdmin")
}

export function applyRefreshedTokens(data) {
  const token = data?.token ?? data?.accessToken ?? data?.jwt
  const refreshToken = data?.refreshToken ?? data?.RefreshToken
  if (token) localStorage.setItem("token", token)
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
  return { token, refreshToken }
}
