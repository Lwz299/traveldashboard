import api from "./api"

/**
 * إدارة مستخدمي المنظمة
 * @see الوظيفة | Method | Endpoint | الصلاحية
 * دعوة مستخدم | POST | /organization-accounts/invite | OrgAdmin فقط
 * عرض قائمة المستخدمين | GET | /organization-accounts/organization/users | OrgAdmin + OrgStaff
 * إزالة مستخدم | DELETE | /organization-accounts/users/{applicationUserId} | OrgAdmin فقط
 */

/** GET /api/organization-accounts/organization/users - عرض قائمة المستخدمين (OrgAdmin + OrgStaff) */
export async function getOrganizationUsers() {
  const { data } = await api.get("/organization-accounts/organization/users")
  return Array.isArray(data) ? data : data?.users ?? []
}

/** POST /api/organization-accounts/invite - دعوة مستخدم (OrgAdmin فقط) */
export async function inviteUser(payload) {
  await api.post("/organization-accounts/invite", payload)
}

/** DELETE /api/organization-accounts/users/{applicationUserId} - إزالة مستخدم (OrgAdmin فقط) */
export async function removeUser(applicationUserId) {
  await api.delete(`/organization-accounts/users/${applicationUserId}`)
}
