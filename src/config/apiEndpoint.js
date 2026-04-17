/**
 * عنوان REST الافتراضي عند عدم ضبط `VITE_API_URL`.
 * يُفضّل أن ينتهي بـ `/api` ليطابق مسارات axios مثل `/events` و`/payouts/...`.
 */
export const DEFAULT_API_BASE_URL =
  "https://trave-gdb0b6ccfecpbahv.israelcentral-01.azurewebsites.net/api"

export function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (typeof fromEnv === "string" && fromEnv.trim() !== "") return fromEnv.trim()
  return DEFAULT_API_BASE_URL
}
