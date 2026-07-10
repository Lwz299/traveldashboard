import api from "./api"
import { AUTH_DEVICE_ID } from "../utils/authSession"

/** POST /api/auth/refresh */
export async function refreshAuthTokens(refreshToken) {
  const { data } = await api.post("/auth/refresh", {
    refreshToken,
    deviceId: AUTH_DEVICE_ID,
  })
  return data
}

/** POST /api/auth/logout */
export async function logoutAuth(refreshToken) {
  if (!refreshToken) return
  await api.post("/auth/logout", { refreshToken })
}

/** POST /api/auth/logout-all */
export async function logoutAllAuth() {
  await api.post("/auth/logout-all")
}
