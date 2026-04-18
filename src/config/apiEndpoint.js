/**
 * عنوان REST الافتراضي عند عدم ضبط المتغيرات.
 * يجب أن ينتهي المسار النهائي بـ `/api` حتى تكون طلبات axios مثل `/events` → `.../api/events`.
 *
 * البيئة (حسب الدليل):
 * - `VITE_API_URL` — عنوان كامل ينتهي بـ `/api` (سلوك قديم، ما زال مدعوماً).
 * - `VITE_API_BASE_URL` — host فقط **بدون** `/api` في النهاية؛ يُضاف `/api` تلقائياً.
 */
export const DEFAULT_API_BASE_URL =
  "https://trave-gdb0b6ccfecpbahv.israelcentral-01.azurewebsites.net/api"

function ensureApiSuffix(base) {
  const b = base.trim().replace(/\/+$/, "")
  if (b.endsWith("/api")) return b
  return `${b}/api`
}

export function getApiBaseUrl() {
  const legacy = import.meta.env.VITE_API_URL
  if (typeof legacy === "string" && legacy.trim() !== "") return legacy.trim()

  const baseOnly = import.meta.env.VITE_API_BASE_URL
  if (typeof baseOnly === "string" && baseOnly.trim() !== "") {
    return ensureApiSuffix(baseOnly)
  }

  return DEFAULT_API_BASE_URL
}
