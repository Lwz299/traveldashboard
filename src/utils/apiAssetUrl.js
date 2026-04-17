import { getApiBaseUrl } from "../config/apiEndpoint.js"

/** يبني URL كاملاً لملفات الخادم: fileUrl من وثائق المنظمة غالباً نسبي (/uploads/... أو /uploads/partner-documents/...) ويُخدم من نفس host الـ API وليس من مسار /api. */
function apiOriginFromBase(base) {
  if (!base || typeof base !== "string") return ""
  const trimmed = base.trim()
  if (!trimmed) return ""
  try {
    const u = new URL(trimmed)
    return `${u.protocol}//${u.host}`
  } catch {
    return trimmed.replace(/\/api\/?$/i, "").replace(/\/+$/, "")
  }
}

export function resolveApiAssetUrl(input) {
  if (input == null) return ""
  const raw = String(input).trim()
  if (!raw) return ""
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return raw

  const origin = apiOriginFromBase(getApiBaseUrl())
  if (!origin) return raw
  if (raw.startsWith("/")) return `${origin}${raw}`
  return `${origin}/${raw}`
}

