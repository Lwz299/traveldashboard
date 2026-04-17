import axios from "axios"
import { getApiBaseUrl } from "../config/apiEndpoint.js"

// نفس الخادم للمنظمة وللسوبر أدمن. يُفضّل أن ينتهي VITE_API_URL بـ `/api` ليطابق المسارات `.../payouts/...`
const api = axios.create({
  baseURL: getApiBaseUrl(),
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
