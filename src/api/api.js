import axios from "axios"

// نفس الخادم للمنظمة وللسوبر أدمن. يُفضّل أن ينتهي VITE_API_URL بـ `/api` (مثل http://localhost:5096/api) ليطابق المسارات `.../api/payouts/...`
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://api.altadumntest.com/api",
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
