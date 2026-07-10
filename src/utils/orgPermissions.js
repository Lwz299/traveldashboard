/**
 * صلاحيات حساب المنظمة من GET /organization-accounts/me
 * يدعم أعلام bitmask رقمية (مثال: 31 = All)، مصفوفة أسماء، كائن flags، أو حقول canManage*.
 */

export const ORG_PERM_FLAGS = {
  CanManageTrips: 1,
  CanManageEvents: 2,
  CanManageOrders: 4,
  CanInviteUsers: 8,
  CanManageFinance: 16,
}

export const ORG_PERM_LABELS_AR = {
  CanManageTrips: "إدارة الرحلات",
  CanManageEvents: "إدارة الفعاليات",
  CanManageOrders: "إدارة الحجوزات",
  CanManageFinance: "إدارة المالية",
  CanInviteUsers: "دعوة الفريق",
  CanManageVideos: "إدارة الفيديو",
}

const PERM_ALIASES = {
  CanManageEvents: ["CanManageEvents", "canManageEvents", "can_manage_events"],
  CanManageTrips: ["CanManageTrips", "canManageTrips", "can_manage_trips"],
  CanManageOrders: ["CanManageOrders", "canManageOrders", "can_manage_orders"],
  CanManageFinance: ["CanManageFinance", "canManageFinance", "can_manage_finance"],
  CanInviteUsers: ["CanInviteUsers", "canInviteUsers", "can_invite_users"],
  CanManageVideos: ["CanManageVideos", "canManageVideos", "can_manage_videos"],
}

function expandNumericPermissions(num, set) {
  const n = Number(num)
  if (!Number.isFinite(n) || n <= 0) return
  for (const [name, bit] of Object.entries(ORG_PERM_FLAGS)) {
    if ((n & bit) === bit) set.add(name)
  }
}

function collectPermissionSet(mePayload) {
  const set = new Set()
  if (!mePayload || typeof mePayload !== "object") return set

  const raw =
    mePayload.permissions ??
    mePayload.Permissions ??
    mePayload.accountPermissions ??
    mePayload.AccountPermissions

  if (typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw)))) {
    expandNumericPermissions(raw, set)
  } else if (Array.isArray(raw)) {
    for (const p of raw) {
      if (p != null && String(p).trim() !== "") set.add(String(p).trim())
    }
  } else if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (v === true || v === "true" || v === 1) set.add(k)
    }
  }

  for (const [canonical, keys] of Object.entries(PERM_ALIASES)) {
    for (const k of keys) {
      if (mePayload[k] === true) set.add(canonical)
    }
  }

  return set
}

export function normalizeOrgPermissions(mePayload) {
  return collectPermissionSet(mePayload)
}

/** عرض الصلاحيات في الواجهة */
export function formatOrgPermissionsLabels(permissionSet) {
  if (!permissionSet || permissionSet.size === 0) return []
  return [...permissionSet]
    .map((key) => ORG_PERM_LABELS_AR[key] ?? key)
    .sort((a, b) => a.localeCompare(b, "ar"))
}

/**
 * @param {Set<string>|null|undefined} permissionSet
 * @param {string|string[]} keys — أي مفتاح يكفي
 * @param {string|null|undefined} orgRole
 */
export function hasOrgPermission(permissionSet, keys, orgRole) {
  if (orgRole === "OrgAdmin") return true
  const list = Array.isArray(keys) ? keys : [keys]
  if (!permissionSet || permissionSet.size === 0) {
    // قبل تحميل الصلاحيات أو غيابها: اسمح بالوصول (الخادم يحمي الـ API)
    return true
  }
  return list.some((k) => permissionSet.has(k))
}
