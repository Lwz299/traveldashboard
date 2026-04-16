import { createContext, useContext, useState, useEffect } from "react"
import api from "../api/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const orgId = localStorage.getItem("orgId")
    const accountId = localStorage.getItem("accountId")
    const orgRole = localStorage.getItem("orgRole")
    const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true"
    if (token && (orgId || isSuperAdmin)) {
      setUser({
        token,
        orgId: orgId || null,
        accountId: accountId || orgId || null,
        orgRole: orgRole || null,
        isSuperAdmin,
      })
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post("/organization-accounts/login", { email, password })
    const token = data.token ?? data.accessToken ?? data.jwt
    const orgId = data.organizationId ?? data.orgId ?? data.organization_id
    const accountId = data.applicationUserId ?? data.accountId ?? data.id ?? data.userId ?? orgId
    const orgRole = data.orgRole ?? null
    if (token) localStorage.setItem("token", token)
    if (orgId) localStorage.setItem("orgId", orgId)
    if (accountId) localStorage.setItem("accountId", accountId)
    if (orgRole) localStorage.setItem("orgRole", orgRole)
    localStorage.removeItem("isSuperAdmin")
    setUser({ token, orgId, accountId, orgRole, isSuperAdmin: false, ...data })
    return data
  }

  const adminLogin = async (email, password) => {
    const { data } = await api.post("/super-admin/login", { email, password })
    const token = data.token ?? data.accessToken ?? data.jwt
    const accountId = data.applicationUserId ?? data.accountId ?? data.id ?? data.userId
    if (token) localStorage.setItem("token", token)
    if (accountId) localStorage.setItem("accountId", accountId)
    localStorage.setItem("isSuperAdmin", "true")
    localStorage.removeItem("orgId")
    localStorage.removeItem("orgRole")
    setUser({ token, accountId, isSuperAdmin: true, ...data })
    return data
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("orgId")
    localStorage.removeItem("accountId")
    localStorage.removeItem("orgRole")
    localStorage.removeItem("isSuperAdmin")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
