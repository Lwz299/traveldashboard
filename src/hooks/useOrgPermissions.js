import { useCallback, useEffect, useState } from "react"
import api from "../api/api"
import { useAuth } from "../context/AuthContext"
import { hasOrgPermission, normalizeOrgPermissions } from "../utils/orgPermissions"

/**
 * صلاحيات الحساب من GET /organization-accounts/me
 */
export function useOrgPermissions() {
  const { user } = useAuth()
  const [permissionSet, setPermissionSet] = useState(null)
  const [loading, setLoading] = useState(Boolean(user?.token && !user?.isSuperAdmin))

  useEffect(() => {
    if (!user?.token || user.isSuperAdmin) {
      setPermissionSet(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .get("/organization-accounts/me")
      .then(({ data }) => {
        if (!cancelled) setPermissionSet(normalizeOrgPermissions(data))
      })
      .catch(() => {
        if (!cancelled) setPermissionSet(new Set())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.token, user?.isSuperAdmin])

  const can = useCallback(
    (keys) => hasOrgPermission(permissionSet, keys, user?.orgRole),
    [permissionSet, user?.orgRole]
  )

  return { permissionSet, loading, can, orgRole: user?.orgRole ?? null }
}
