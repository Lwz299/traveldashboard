import { getApiOrigin } from "../config/apiEndpoint.js"

/** يبني URL كاملاً لملفات الخادم: fileUrl من وثائق المنظمة غالباً نسبي (/uploads/...) ويُخدم من نفس host الـ API وليس من مسار /api. */
export function resolveApiAssetUrl(input) {
  if (input == null) return ""
  const raw = String(input).trim()
  if (!raw) return ""
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return raw

  const origin = getApiOrigin()
  if (!origin) return raw
  if (raw.startsWith("/")) return `${origin}${raw}`
  return `${origin}/${raw}`
}
