import { createContext, useContext, useState, useEffect, useCallback } from "react"
import api from "../api/api"
import { logoutAllAuth, logoutAuth } from "../api/auth"
import {
  clearAuthSession,
  persistAdminSession,
  persistOrgSession,
  readStoredSession,
} from "../utils/authSession"

const AuthContext = createContext(null)

async function enrichOrgRole(session) {
  if (session.orgRole || session.isSuperAdmin) return session
  try {
    const { data: me } = await api.get("/organization-accounts/me")
    const role = me?.orgRole ?? me?.role
    if (role) {
      localStorage.setItem("orgRole", role)
      return { ...session, orgRole: role }
    }
  } catch {
    /* ignore */
  }
  return session
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = readStoredSession()
    if (stored) setUser(stored)
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post("/organization-accounts/login", { email, password })
    let session = persistOrgSession(data)
    session = await enrichOrgRole(session)
    setUser(session)
    return session
  }

  const adminLogin = async (email, password) => {
    const { data } = await api.post("/super-admin/login", { email, password })
    const session = persistAdminSession(data)
    setUser(session)
    return session
  }

  const loginFromRegisterResponse = async (data) => {
    let session = persistOrgSession(data)
    session = await enrichOrgRole(session)
    setUser(session)
    return session
  }

  const logout = useCallback(async (options = {}) => {
    const refreshToken = localStorage.getItem("refreshToken")
    const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true"
    try {
      if (options.all && localStorage.getItem("token")) {
        await logoutAllAuth()
      } else if (refreshToken) {
        await logoutAuth(refreshToken)
      }
    } catch {
      /* تجاهل — الجلسة تُمسح محلياً */
    }
    clearAuthSession()
    setUser(null)
    if (options.redirect !== false) {
      window.location.href = isSuperAdmin ? "/admin/login" : "/login"
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, login, adminLogin, loginFromRegisterResponse, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
