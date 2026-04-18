/**
 * عميل HTTP الوحيد للمشروع — **axios** عبر هذا المثيل فقط.
 * لا تستخدم `fetch()` لطلبات الـ REST حتى تُطبَّق `baseURL`، و`Authorization`، و`withCredentials`، ومعالجة 401.
 * استورد `api` من هذا الملف أو من وحدات `src/api/*.js` التي تبنِي عليه.
 */
import axios from "axios"
import { getApiBaseUrl } from "../config/apiEndpoint.js"

// نفس الخادم للمنظمة وللسوبر أدمن — انظر `getApiBaseUrl()` و `VITE_API_URL` / `VITE_API_BASE_URL`.
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true"
      localStorage.removeItem("token")
      localStorage.removeItem("orgId")
      localStorage.removeItem("accountId")
      localStorage.removeItem("orgRole")
      localStorage.removeItem("isSuperAdmin")
      window.location.href = isSuperAdmin ? "/admin/login" : "/login"
    }
    return Promise.reject(error)
  }
)

export default api
