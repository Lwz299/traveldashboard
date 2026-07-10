/**
 * عنوان REST للتطبيق.
 *
 * الافتراضي `/api` (نفس أصل الواجهة):
 * - تطوير: Vite proxy → https://api.altadumntest.com
 * - Vercel: rewrite في vercel.json → نفس الـ API (يتجنّب CORS)
 *
 * للاتصال المباشر بالـ API (يتطلب CORS من الخادم):
 * - VITE_API_URL=https://api.altadumntest.com/api
 * - أو VITE_API_BASE_URL=https://api.altadumntest.com
 */
export const PRODUCTION_API_HOST = "https://api.altadumntest.com"

export const DEFAULT_API_BASE_URL = "/api"

function ensureApiSuffix(base) {
  const b = base.trim().replace(/\/+$/, "")
  if (b.endsWith("/api")) return b
  return `${b}/api`
}

function isRelativeApiPath(value) {
  return typeof value === "string" && value.trim().startsWith("/")
}

/** عنوان REST الكامل المستخدم من طبقة `src/api/api.js` وجميع وحدات `src/api/*.js` */
export function getApiBaseUrl() {
  const legacy = import.meta.env.VITE_API_URL
  if (typeof legacy === "string" && legacy.trim() !== "") {
    const v = legacy.trim()
    if (isRelativeApiPath(v)) return v.replace(/\/+$/, "") || "/api"
    return ensureApiSuffix(v)
  }

  const baseOnly = import.meta.env.VITE_API_BASE_URL
  if (typeof baseOnly === "string" && baseOnly.trim() !== "") {
    const v = baseOnly.trim()
    if (isRelativeApiPath(v)) return v.replace(/\/+$/, "") || "/api"
    return ensureApiSuffix(v)
  }

  return DEFAULT_API_BASE_URL
}

/** أصل الخادم بدون `/api` — لملفات الرفع والصور (دائماً الـ API الحقيقي) */
export function getApiOrigin() {
  const assetOrigin = import.meta.env.VITE_API_ASSET_ORIGIN
  if (typeof assetOrigin === "string" && assetOrigin.trim() !== "") {
    try {
      const u = new URL(assetOrigin.trim())
      return `${u.protocol}//${u.host}`
    } catch {
      return assetOrigin.trim().replace(/\/+$/, "")
    }
  }

  const baseOnly = import.meta.env.VITE_API_BASE_URL
  if (typeof baseOnly === "string" && baseOnly.trim() !== "" && !isRelativeApiPath(baseOnly)) {
    try {
      const u = new URL(ensureApiSuffix(baseOnly.trim()))
      return `${u.protocol}//${u.host}`
    } catch {
      return baseOnly.trim().replace(/\/api\/?$/i, "").replace(/\/+$/, "")
    }
  }

  return PRODUCTION_API_HOST
}
