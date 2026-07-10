import { useEffect, useState } from "react"
import api from "../api/api"
import { useAuth } from "../context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { User, Building2, FileText, ExternalLink } from "lucide-react"
import {
  MotionSection,
  MotionSurface,
  StaggerItem,
  StaggerList,
  DashboardPageSkeleton,
} from "../components/motion"
import { resolveApiAssetUrl } from "../utils/apiAssetUrl"
import {
  extractOrganizationDocuments,
  normalizeOrganizationDocumentRow,
  labelOrganizationDocumentType,
} from "../utils/organizationDocuments"
import { formatOrgPermissionsLabels, normalizeOrgPermissions } from "../utils/orgPermissions"

const ROLE_LABELS = { OrgAdmin: "مدير المنظمة", OrgStaff: "موظف" }

/** يطابق أشكال استجابة GET /organizations/me (غلاف data / organization + documents) */
function normalizeOrganizationMePayload(data) {
  if (data == null) return null
  const root = data?.data ?? data
  if (!root || typeof root !== "object") return null
  const nested = root.organization ?? root.Organization ?? root
  const docsRoot = extractOrganizationDocuments(root).map(normalizeOrganizationDocumentRow).filter(Boolean)
  const docsNested = extractOrganizationDocuments(nested).map(normalizeOrganizationDocumentRow).filter(Boolean)
  const documents = docsRoot.length > 0 ? docsRoot : docsNested
  const name = nested.name ?? nested.Name ?? root.name ?? root.Name
  const email = nested.email ?? nested.Email ?? root.email ?? root.Email
  const phone = nested.phone ?? nested.Phone ?? root.phone ?? root.Phone
  return {
    ...nested,
    ...root,
    id: nested.id ?? nested.Id ?? root.id ?? root.Id,
    name,
    organizationName: name,
    description: nested.description ?? nested.Description ?? root.description ?? "",
    email,
    organizationEmail: email,
    phone,
    organizationPhone: phone,
    isVerified: Boolean(nested.isVerified ?? nested.IsVerified ?? root.isVerified ?? root.IsVerified),
    documents,
  }
}

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [orgError, setOrgError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.token) {
      setLoading(false)
      return
    }
    Promise.allSettled([api.get("/organization-accounts/me"), api.get("/organizations/me")])
      .then(([accResult, orgResult]) => {
        const acc = accResult.status === "fulfilled" ? accResult.value.data : null
        if (orgResult.status === "fulfilled") {
          setOrganization(normalizeOrganizationMePayload(orgResult.value.data))
          setOrgError("")
        } else {
          setOrganization(null)
          const st = orgResult.reason?.response?.status
          if (st === 403) setOrgError("لا تملك صلاحية الوصول لبيانات المنظمة.")
          else if (st === 404) setOrgError("بيانات المنظمة غير موجودة.")
          else if (st === 500) setOrgError("حدث خطأ داخلي أثناء تحميل بيانات المنظمة.")
          else setOrgError("تعذر تحميل بيانات المنظمة.")
        }
        setProfile(acc)
      })
      .finally(() => setLoading(false))
  }, [user?.token])

  if (loading) {
    return <DashboardPageSkeleton />
  }

  const docs = organization?.documents ?? []
  const permissionLabels = profile ? formatOrgPermissionsLabels(normalizeOrgPermissions(profile)) : []

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <MotionSection delay={0.04}>
        <StaggerList className="space-y-6">
          {profile && (
            <StaggerItem>
              <MotionSurface>
                <Card className="rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <User className="h-5 w-5" />
                      بيانات الحساب
                      {user?.orgRole && (
                        <span className="text-sm font-normal text-muted-foreground">
                          — {ROLE_LABELS[user.orgRole] ?? user.orgRole}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <div>
                        <dt className="text-sm text-muted-foreground">الاسم</dt>
                        <dd className="font-medium">{profile.displayName ?? profile.name ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">البريد الإلكتروني</dt>
                        <dd className="font-medium">{profile.email ?? "-"}</dd>
                      </div>
                      {profile.phone && (
                        <div>
                          <dt className="text-sm text-muted-foreground">الهاتف</dt>
                          <dd className="font-medium">{profile.phone}</dd>
                        </div>
                      )}
                      {permissionLabels.length > 0 && (
                        <div>
                          <dt className="text-sm text-muted-foreground">الصلاحيات</dt>
                          <dd className="mt-1 flex flex-wrap gap-1.5">
                            {permissionLabels.map((label) => (
                              <span
                                key={label}
                                className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/80"
                              >
                                {label}
                              </span>
                            ))}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </MotionSurface>
            </StaggerItem>
          )}

          <StaggerItem>
            <MotionSurface>
              <Card className="rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    بيانات المنظمة
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    عرض فقط. تعديل بيانات المنظمة متاح لمدير النظام (Super Admin) فقط.
                  </p>
                </CardHeader>
                <CardContent>
                  {organization ? (
                    <dl className="space-y-4 transition-opacity duration-300 ease-in-out">
                      <div>
                        <dt className="text-sm text-muted-foreground">اسم المنظمة</dt>
                        <dd className="font-medium">{organization.name ?? organization.organizationName ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">الوصف</dt>
                        <dd className="font-medium">
                          {organization.description ?? organization.organizationDescription ?? "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">بريد المنظمة</dt>
                        <dd className="font-medium">{organization.email ?? organization.organizationEmail ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">هاتف المنظمة</dt>
                        <dd className="font-medium">{organization.phone ?? organization.organizationPhone ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">حالة التوثيق</dt>
                        <dd className="font-medium">{organization.isVerified ? "موثقة" : "غير موثقة"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">مستندات المنظمة</dt>
                        <dd className="mt-2">
                          {docs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              لا توجد مستندات مرفوعة، أو لم تُرجع الخادم القائمة في هذا الطلب.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {docs.map((doc, idx) => {
                                const row = doc
                                if (!row) return null
                                const fileUrl = resolveApiAssetUrl(row.fileUrl ?? "")
                                const typeLabel = labelOrganizationDocumentType(row.documentType)
                                return (
                                  <li
                                    key={row.id ?? `${row.fileUrl}-${idx}`}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 px-3 py-3 ring-1 ring-slate-900/[0.03]"
                                  >
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
                                        <FileText className="size-5 text-sky-700" strokeWidth={1.75} aria-hidden />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-900">
                                          {row.originalFileName?.trim() || `مستند ${idx + 1}`}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">{typeLabel}</p>
                                      </div>
                                    </div>
                                    {fileUrl ? (
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 transition-colors hover:bg-sky-50/80"
                                      >
                                        <ExternalLink className="size-3.5" aria-hidden />
                                        فتح الملف
                                      </a>
                                    ) : (
                                      <span className="text-xs text-slate-400">لا يوجد رابط</span>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-muted-foreground">{orgError || "تعذر تحميل بيانات المنظمة"}</p>
                  )}
                </CardContent>
              </Card>
            </MotionSurface>
          </StaggerItem>
        </StaggerList>
      </MotionSection>
    </div>
  )
}
