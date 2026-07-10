/**
 * عنوان REST الافتراضي عند عدم ضبط المتغيرات.
 * يجب أن ينتهي المسار النهائي بـ `/api` حتى تكون طلبات axios مثل `/events` → `.../api/events`.
 *
 * البيئة:
 * - `VITE_API_URL` — عنوان كامل ينتهي بـ `/api` (سلوك قديم، ما زال مدعوماً).
 * - `VITE_API_BASE_URL` — host فقط **بدون** `/api` في النهاية؛ يُضاف `/api` تلقائياً.
 */
export const PRODUCTION_API_HOST = "https://api.altadumntest.com"

export const DEFAULT_API_BASE_URL = `${PRODUCTION_API_HOST}/api`

function ensureApiSuffix(base) {
  const b = base.trim().replace(/\/+$/, "")
  if (b.endsWith("/api")) return b
  return `${b}/api`
}

/** عنوان REST الكامل المستخدم من طبقة `src/api/api.js` وجميع وحدات `src/api/*.js` */
export function getApiBaseUrl() {
  const legacy = import.meta.env.VITE_API_URL
  if (typeof legacy === "string" && legacy.trim() !== "") return ensureApiSuffix(legacy.trim())

  const baseOnly = import.meta.env.VITE_API_BASE_URL
  if (typeof baseOnly === "string" && baseOnly.trim() !== "") {
    return ensureApiSuffix(baseOnly)
  }

  return DEFAULT_API_BASE_URL
}

/** أصل الخادم بدون `/api` — لملفات الرفع والصور */
export function getApiOrigin() {
  const base = getApiBaseUrl()
  try {
    const u = new URL(base)
    return `${u.protocol}//${u.host}`
  } catch {
    return base.replace(/\/api\/?$/i, "").replace(/\/+$/, "")
  }
}
