/**
 * Admin utility functions
 * Helpers for common admin operations
 */

/**
 * Get page title from pathname
 */
export function getPageTitle(pathname, routeTitles = {}) {
  if (pathname === "/admin" || pathname === "/admin/") return "لوحة التحكم"

  // Check for detail pages
  if (/^\/admin\/events\/.+/.test(pathname)) {
    return "تفاصيل الفعالية"
  }
  if (/^\/admin\/support\/.+/.test(pathname)) {
    return "تفاصيل التذكرة"
  }

  // Check route titles
  for (const [path, title] of Object.entries(routeTitles)) {
    if (path !== "/admin" && pathname.startsWith(path)) return title
  }

  return "الإدارة"
}

/**
 * Normalize API response data
 */
export function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data
  if (data?.items) return Array.isArray(data.items) ? data.items : []
  if (data?.data) return Array.isArray(data.data) ? data.data : []
  if (data?.Rows) return Array.isArray(data.Rows) ? data.Rows : []
  if (data?.organizations) return Array.isArray(data.organizations) ? data.organizations : []
  if (data?.events) return Array.isArray(data.events) ? data.events : []
  if (data?.tickets) return Array.isArray(data.tickets) ? data.tickets : []
  if (data?.payouts) return Array.isArray(data.payouts) ? data.payouts : []
  return []
}

/**
 * Handle first defined property (for flexible API responses)
 */
export function getFirstDefined(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      if (value !== undefined && value !== null) return value
    }
  }
  return undefined
}

/**
 * Build query string from filters object
 */
export function buildQueryString(filters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== "") {
      params.append(key, value)
    }
  }
  return params.toString()
}

/**
 * Safe property accessor for flexible response objects
 */
export const safeGet = {
  name: (obj) => obj?.name ?? obj?.organizationName ?? obj?.title ?? obj?.userName ?? "—",
  email: (obj) => obj?.email ?? obj?.organizationEmail ?? "—",
  phone: (obj) => obj?.phone ?? obj?.organizationPhone ?? "—",
  status: (obj) => obj?.status ?? obj?.verificationStatus ?? obj?.state ?? "unknown",
  description: (obj) => obj?.description ?? obj?.organizationDescription ?? "—",
}

/**
 * Format table row data for display
 */
export function formatTableRow(item, schema) {
  const row = {}
  for (const [key, accessor] of Object.entries(schema)) {
    row[key] = typeof accessor === "function" ? accessor(item) : item[accessor]
  }
  return row
}
