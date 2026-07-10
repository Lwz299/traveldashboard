/**
 * عميل HTTP الوحيد للمشروع — **axios** عبر هذا المثيل فقط.
 * لا تستخدم `fetch()` لطلبات الـ REST حتى تُطبَّق `baseURL`، و`Authorization`، و`withCredentials`، ومعالجة 401.
 * استورد `api` من هذا الملف أو من وحدات `src/api/*.js` التي تبنِي عليه.
 */
import axios from "axios"
import { getApiBaseUrl } from "../config/apiEndpoint.js"
import { applyRefreshedTokens, AUTH_DEVICE_ID, clearAuthSession } from "../utils/authSession.js"

// نفس الخادم للمنظمة وللسوبر أدمن — انظر `getApiBaseUrl()` و `VITE_API_URL` / `VITE_API_BASE_URL`.
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

let refreshInFlight = null

function redirectToLogin() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true"
  clearAuthSession()
  window.location.href = isSuperAdmin ? "/admin/login" : "/login"
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (
      status === 401 &&
      original &&
      !original._authRetry &&
      !String(original.url ?? "").includes("/auth/refresh") &&
      !String(original.url ?? "").includes("/organization-accounts/login") &&
      !String(original.url ?? "").includes("/super-admin/login")
    ) {
      const refreshToken = localStorage.getItem("refreshToken")
      if (refreshToken) {
        original._authRetry = true
        try {
          if (!refreshInFlight) {
            refreshInFlight = axios
              .post(
                `${getApiBaseUrl()}/auth/refresh`,
                { refreshToken, deviceId: AUTH_DEVICE_ID },
                {
                  headers: { "Content-Type": "application/json" },
                  withCredentials: true,
                }
              )
              .then((res) => applyRefreshedTokens(res.data))
              .finally(() => {
                refreshInFlight = null
              })
          }
          await refreshInFlight
          const nextToken = localStorage.getItem("token")
          if (nextToken) {
            original.headers.Authorization = `Bearer ${nextToken}`
            return api(original)
          }
        } catch {
          redirectToLogin()
          return Promise.reject(error)
        }
      }
      redirectToLogin()
    }

    return Promise.reject(error)
  }
)

export default api
