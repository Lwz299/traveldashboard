import { useState, useEffect, useMemo } from "react"
import api from "../../api/api"
import { fetchSuperAdminOrganizations, updateOrganization } from "../../api/superAdmin"
import { Link } from "react-router-dom"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import {
  Building2,
  Pencil,
  RefreshCw,
  Search,
  Users,
  ShieldCheck,
  Clock,
  Ban,
  FileText,
  ExternalLink,
  Eye,
  EyeOff,
  UsersRound,
} from "lucide-react"
import { MotionSection, StaggerItem, StaggerList } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminIconBoxRound } from "../../lib/admin-ui"
import { formatCountEn, formatDateTimeEn } from "../../utils/formatEn"
import { resolveApiAssetUrl } from "../../utils/apiAssetUrl"
import { extractOrganizationDocuments, normalizeOrganizationDocumentRow } from "../../utils/organizationDocuments"

const STATUS_LABELS = { Pending: "معلق", Approved: "معتمد", Rejected: "مرفوض", Verified: "موثقة", Unverified: "غير موثقة" }
const STATUS_BADGE = {
  Pending: "border-amber-200/90 bg-amber-50 text-amber-900 ring-1 ring-amber-200/70",
  Approved: "border-emerald-200/90 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70",
  Rejected: "border-rose-200/90 bg-rose-50 text-rose-900 ring-1 ring-rose-200/70",
  Verified: "border-emerald-200/90 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70",
  Unverified: "border-slate-200/90 bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
}

function pickFirst(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k]
      if (v !== undefined && v !== null && v !== "") return v
    }
  }
  return undefined
}

const DOCUMENT_COUNT_KEYS = [
  "documentCount",
  "DocumentCount",
  "documentsCount",
  "DocumentsCount",
  "fileCount",
  "FileCount",
  "filesCount",
  "FilesCount",
  "totalDocuments",
  "TotalDocuments",
]

/** عدّ الملفات: من المصفوفة إن وُجدت، وإلا من حقول العدّ التي ترجعها قائمة المنظمات بدون تفاصيل المستندات */
function countDocumentsForOrg(org) {
  if (!org || typeof org !== "object") return 0
  const fromArray = extractOrganizationDocuments(org).map(normalizeOrganizationDocumentRow).filter(Boolean).length
  if (fromArray > 0) return fromArray
  let n = pickFirst(org, DOCUMENT_COUNT_KEYS)
  if (n == null) {
    const st = org.statistics ?? org.Statistics
    if (st && typeof st === "object") n = pickFirst(st, DOCUMENT_COUNT_KEYS)
  }
  if (n != null && Number.isFinite(Number(n))) return Math.max(0, Math.floor(Number(n)))
  return 0
}

function normalizeOrganizationRecord(raw) {
  if (!raw || typeof raw !== "object") return raw
  const docs = extractOrganizationDocuments(raw).map(normalizeOrganizationDocumentRow).filter(Boolean)
  return {
    ...raw,
    id: raw.id ?? raw.Id,
    name: raw.name ?? raw.Name,
    documents: docs,
  }
}

function unwrapOrganizationsList(data) {
  const root = data?.data ?? data
  if (Array.isArray(root)) return root
  return root?.items ?? root?.Items ?? root?.organizations ?? root?.Organizations ?? []
}

function normalizeOrganizationDetailsResponse(data) {
  const root = data?.data ?? data
  if (!root || typeof root !== "object") return null
  const nested = root.organization ?? root.Organization ?? root
  const docsRoot = extractOrganizationDocuments(root).map(normalizeOrganizationDocumentRow).filter(Boolean)
  const docsNested = extractOrganizationDocuments(nested).map(normalizeOrganizationDocumentRow).filter(Boolean)
  const documents = docsRoot.length > 0 ? docsRoot : docsNested

  return {
    id: nested.id ?? nested.Id ?? root.id ?? root.Id,
    name: nested.name ?? nested.Name ?? root.name ?? root.Name,
    description: nested.description ?? nested.Description ?? root.description ?? "",
    email: nested.email ?? nested.Email ?? root.email ?? "",
    phone: nested.phone ?? nested.Phone ?? root.phone ?? "",
    isVerified: Boolean(nested.isVerified ?? nested.IsVerified ?? root.isVerified ?? root.IsVerified),
    documents,
  }
}

function isPdfDocument(doc) {
  const name = String(doc?.originalFileName ?? "")
  const url = String(doc?.fileUrl ?? "")
  return /\.pdf(\?|#|$)/i.test(name) || /\.pdf(\?|#|$)/i.test(url)
}

function OrganizationDocumentCard({ doc, index }) {
  const resolvedUrl = resolveApiAssetUrl(doc?.fileUrl ?? "")
  const [previewOpen, setPreviewOpen] = useState(false)
  const isPdf = isPdfDocument(doc)
  const title = doc.originalFileName?.trim() || `مستند ${index + 1}`

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 shadow-sm ring-1 ring-slate-900/[0.03]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
            <FileText className="size-5 text-sky-700" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-navy">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {doc.documentType || "نوع غير محدد"}
              {doc.uploadedAt ? ` • ${formatDateTimeEn(doc.uploadedAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isPdf && resolvedUrl && (
            <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setPreviewOpen((o) => !o)}>
              {previewOpen ? (
                <>
                  <EyeOff className="size-4" aria-hidden />
                  إخفاء المعاينة
                </>
              ) : (
                <>
                  <Eye className="size-4" aria-hidden />
                  عرض PDF
                </>
              )}
            </Button>
          )}
          {resolvedUrl ? (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-50/80"
            >
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              فتح في تبويب جديد
            </a>
          ) : (
            <span className="text-xs text-slate-400">لا يوجد رابط للملف</span>
          )}
        </div>
      </div>
      {isPdf && previewOpen && resolvedUrl && (
        <div className="border-t border-slate-200/80 bg-slate-100/50 p-3 sm:p-4">
          <p className="mb-2 text-[11px] font-medium text-slate-500">معاينة PDF</p>
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-inner">
            <iframe title={title} src={resolvedUrl} className="h-[min(72vh,640px)] w-full min-h-[280px]" loading="lazy" />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">إذا لم تظهر المعاينة، استخدم «فتح في تبويب جديد».</p>
        </div>
      )}
    </div>
  )
}

export default function AdminOrganizations() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", description: "", email: "", phone: "" })
  const [saving, setSaving] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState(null)
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState("")

  const fetchOrganizations = async () => {
    setLoading(true)
    setError("")
    try {
      const list = await fetchSuperAdminOrganizations()
      setOrganizations(list.map(normalizeOrganizationRecord))
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل المنظمات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const getVerificationState = (org) => {
    if (typeof org?.isVerified === "boolean") return org.isVerified ? "Verified" : "Unverified"
    if (typeof org?.IsVerified === "boolean") return org.IsVerified ? "Verified" : "Unverified"
    return org?.verificationStatus ?? org?.VerificationStatus ?? "Unverified"
  }

  const loadOrganizationDetails = async (orgId, listRowOrg = null) => {
    if (!orgId) return
    setSelectedOrgId(orgId)
    setSelectedOrgDetails(null)
    setDetailsError("")
    setDetailsLoading(true)
    try {
      const { data } = await api.get(`/organizations/${orgId}`)
      const normalized = normalizeOrganizationDetailsResponse(data)
      const fromList =
        listRowOrg ?? organizations.find((o) => String(o?.id ?? o?.Id) === String(orgId))
      if (normalized && !(normalized.documents?.length) && fromList?.documents?.length) {
        normalized.documents = fromList.documents
      }
      setSelectedOrgDetails(normalized)
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) setDetailsError("المنظمة غير موجودة.")
      else if (status === 401) setDetailsError("انتهت الجلسة أو التوكن غير صالح.")
      else if (status === 403) setDetailsError("لا تملك صلاحية عرض تفاصيل هذه المنظمة.")
      else if (status === 500) setDetailsError("خطأ داخلي في الخادم.")
      else setDetailsError(err?.response?.data?.message ?? "تعذر تحميل تفاصيل المنظمة.")
    } finally {
      setDetailsLoading(false)
    }
  }

  const stats = useMemo(() => {
    const list = organizations
    const verified = list.filter((o) => {
      const st = getVerificationState(o)
      return st === "Verified" || st === "Approved"
    }).length
    const docs = list.reduce((sum, o) => sum + countDocumentsForOrg(o), 0)
    return { total: list.length, verified, unverified: list.length - verified, docs }
  }, [organizations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return organizations
    return organizations.filter((org) => {
      const name = String(org.name ?? org.organizationName ?? "").toLowerCase()
      const email = String(org.email ?? org.organizationEmail ?? "").toLowerCase()
      const phone = String(org.phone ?? org.organizationPhone ?? "").toLowerCase()
      return name.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [organizations, search])

  const openEdit = (org) => {
    setEditingId(org.id)
    setEditForm({
      name: org.name ?? org.organizationName ?? "",
      description: org.description ?? org.organizationDescription ?? "",
      email: org.email ?? org.organizationEmail ?? "",
      phone: org.phone ?? org.organizationPhone ?? "",
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: "", description: "", email: "", phone: "" })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await updateOrganization(editingId, {
        name: editForm.name || undefined,
        description: editForm.description || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        organizationName: editForm.name || undefined,
        organizationDescription: editForm.description || undefined,
        organizationEmail: editForm.email || undefined,
        organizationPhone: editForm.phone || undefined,
      })
      setEditingId(null)
      fetchOrganizations()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر حفظ التعديلات")
    } finally {
      setSaving(false)
    }
  }

  const kpiClass =
    "rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow hover:shadow-md"

  return (
    <div className="space-y-6" dir="rtl">
      {error && <div className={adminPageError}>{error}</div>}

      <MotionSection aria-label="رأس الصفحة">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="flex items-center gap-3">
            <div className={adminIconBoxRound}>
              <Building2 className="size-5 text-brand-navy" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-brand-navy">المنظمات</h2>
              <p className="text-xs text-slate-500">إدارة حسابات المنظمات وحالة التحقق</p>
            </div>
          </div>
          <Button type="button" variant="outline" className="rounded-xl" onClick={fetchOrganizations} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            تحديث
          </Button>
        </div>
      </MotionSection>

      {loading ? (
        <AdminCardsSkeleton count={4} gridClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" />
      ) : (
        <MotionSection delay={0.03} aria-label="إحصاءات">
          <StaggerList className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <div className={kpiClass}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(stats.total)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">إجمالي المنظمات</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800 ring-1 ring-teal-800/15">
                    <Users className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className={kpiClass}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(stats.verified)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">موثقة</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/15">
                    <ShieldCheck className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className={kpiClass}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(stats.unverified)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">غير موثقة</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-400/20">
                    <Clock className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className={kpiClass}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(stats.docs)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">إجمالي الملفات</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-800 ring-1 ring-sky-600/15">
                    <Ban className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
              </div>
            </StaggerItem>
          </StaggerList>
        </MotionSection>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/50 p-8 text-center text-sm text-slate-500">جاري التحميل…</div>
      ) : organizations.length === 0 ? (
        <Card className={adminCardClass}>
          <CardContent className="py-14 text-center text-sm text-slate-500">لا توجد منظمات مسجّلة</CardContent>
        </Card>
      ) : (
        <>
          <MotionSection delay={0.05} aria-label="بحث وجدول">
            <Card className={adminCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-brand-navy">قائمة المنظمات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث بالاسم أو البريد أو الهاتف…"
                    className="h-10 rounded-xl pr-9"
                    aria-label="بحث في المنظمات"
                  />
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-50/80 text-slate-600">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">#</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">الاسم</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">البريد</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">الهاتف</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">الملفات</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">الحالة</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((org) => {
                        const id = org.id
                        const name = org.name ?? org.organizationName ?? "—"
                        const email = org.email ?? org.organizationEmail ?? "—"
                        const phone = org.phone ?? org.organizationPhone ?? "—"
                        const st = getVerificationState(org)
                        const docsCount = countDocumentsForOrg(org)
                        return (
                          <tr
                            key={id}
                            className="border-t border-slate-200/70 bg-white/90 transition-colors hover:bg-teal-50/30"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">{pickFirst(org, ["id", "Id"]) ?? "—"}</td>
                            <td className="max-w-[200px] px-4 py-3 font-semibold text-brand-navy">
                              <span className="line-clamp-2">{name}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{email}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{phone}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatCountEn(docsCount)}</td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {st ? (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[st] ?? "border border-slate-200 bg-slate-50 text-slate-700"}`}
                                >
                                  {STATUS_LABELS[st] ?? st}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() => loadOrganizationDetails(id, org)}
                                >
                                  عرض
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() => openEdit(org)}
                                >
                                  <Pencil className="size-3.5" />
                                  <span className="ms-1.5">تعديل</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  asChild
                                >
                                  <Link to={`/admin/organizations/${id}/accounts`}>
                                    <UsersRound className="size-3.5" />
                                    <span className="ms-1.5">حسابات</span>
                                  </Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-slate-500">لا توجد نتائج مطابقة للبحث</p>
                )}
              </CardContent>
            </Card>
          </MotionSection>

          {selectedOrgId != null && (
            <MotionSection delay={0.02} aria-label="تفاصيل منظمة">
              <Card className={adminCardClass}>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base font-semibold text-brand-navy">تفاصيل المنظمة #{selectedOrgId}</CardTitle>
                  <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
                    <Link to={`/admin/organizations/${selectedOrgId}/accounts`}>حسابات الموظفين</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {detailsLoading ? (
                    <p className="text-sm text-slate-500">جاري تحميل التفاصيل...</p>
                  ) : detailsError ? (
                    <p className="text-sm text-rose-700">{detailsError}</p>
                  ) : selectedOrgDetails ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div><span className="text-slate-500">الاسم:</span> <span className="font-medium text-slate-800">{selectedOrgDetails.name ?? "—"}</span></div>
                        <div><span className="text-slate-500">البريد:</span> <span className="font-medium text-slate-800">{selectedOrgDetails.email ?? "—"}</span></div>
                        <div><span className="text-slate-500">الهاتف:</span> <span className="font-medium text-slate-800">{selectedOrgDetails.phone ?? "—"}</span></div>
                        <div><span className="text-slate-500">التوثيق:</span> <span className="font-medium text-slate-800">{selectedOrgDetails.isVerified ? "موثقة" : "غير موثقة"}</span></div>
                        {selectedOrgDetails.description ? (
                          <div className="sm:col-span-2"><span className="text-slate-500">الوصف:</span> <span className="font-medium text-slate-800">{selectedOrgDetails.description}</span></div>
                        ) : null}
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-semibold text-brand-navy">المستندات</p>
                        {(selectedOrgDetails.documents?.length ?? 0) === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                            لا توجد ملفات
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(selectedOrgDetails.documents ?? []).map((doc, idx) => (
                              <OrganizationDocumentCard key={doc?.id ?? `${doc?.fileUrl}-${idx}`} doc={doc} index={idx} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">لا تتوفر بيانات.</p>
                  )}
                </CardContent>
              </Card>
            </MotionSection>
          )}

          {editingId != null && (
            <MotionSection delay={0.02} aria-label="تعديل منظمة">
              <Card className={`${adminCardClass} border-teal-200/60 ring-2 ring-teal-800/10`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-brand-navy">تعديل بيانات المنظمة</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>اسم المنظمة</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>البريد</Label>
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>الوصف</Label>
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الهاتف</Label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={saving} className={adminBtnPrimary}>
                        {saving ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                      <Button type="button" variant="outline" className="rounded-xl" onClick={cancelEdit}>
                        إلغاء
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </MotionSection>
          )}
        </>
      )}
    </div>
  )
}
