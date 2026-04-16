import { useState, useEffect, useMemo } from "react"
import api from "../../api/api"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import {
  Building2,
  Check,
  X,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  Mail,
  Phone,
  Copy,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  FileStack,
} from "lucide-react"
import { formatDateTimeEn } from "../../utils/formatEn"
import { resolveApiAssetUrl } from "../../utils/apiAssetUrl"
import { MotionSection, MotionSurface, StaggerList, StaggerItem } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminIconBoxRound, adminTextMuted } from "../../lib/admin-ui"

const STATUS_LABELS = { Pending: "معلق", Approved: "معتمد", Rejected: "مرفوض" }
const STATUS_COLORS = {
  Pending: "bg-amber-50 text-amber-900 ring-amber-200/80",
  Approved: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  Rejected: "bg-red-50 text-red-800 ring-red-200/80",
}
const DOCUMENT_TYPE_LABELS = { CommercialLicense: "رخصة تجارية", TaxCertificate: "شهادة ضريبية", Other: "أخرى" }

function unwrapPartnerApplicationsList(data) {
  const root = data?.data ?? data
  if (Array.isArray(root)) return root
  return root?.items ?? root?.Items ?? root?.applications ?? root?.Applications ?? []
}

function partnerAppMatchesQuery(app, q) {
  if (!q.trim()) return true
  const n = q.trim().toLowerCase()
  const st = app.status ?? app.Status
  const hay = [
    app.organizationName,
    app.OrganizationName,
    app.name,
    app.Name,
    app.organizationEmail,
    app.OrganizationEmail,
    app.email,
    app.Email,
    app.phone,
    app.Phone,
    app.organizationPhone,
    app.OrganizationPhone,
    app.description,
    app.Description,
    app.organizationDescription,
    app.OrganizationDescription,
    app.organizationId,
    app.OrganizationId,
    app.id,
    app.Id,
    st,
    app.appliedAt,
    app.AppliedAt,
    STATUS_LABELS[st],
  ]
    .filter(Boolean)
    .map((x) => String(x).toLowerCase())
  return hay.some((s) => s.includes(n))
}

function isPdfDocument(doc) {
  const name = String(doc?.originalFileName ?? "")
  const url = String(doc?.fileUrl ?? "")
  if (/\.pdf(\?|#|$)/i.test(name) || /\.pdf(\?|#|$)/i.test(url)) return true
  return false
}

function PartnerDocumentCard({ doc, index }) {
  const resolvedUrl = resolveApiAssetUrl(doc?.fileUrl ?? "")
  const isPdf = isPdfDocument(doc)
  const [previewOpen, setPreviewOpen] = useState(false)
  const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType ?? "وثيقة"
  const title = doc.originalFileName?.trim() || `وثيقة ${index + 1}`

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
              {typeLabel}
              {doc.uploadedAt ? ` • ${formatDateTimeEn(doc.uploadedAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isPdf && resolvedUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setPreviewOpen((o) => !o)}
            >
              {previewOpen ? (
                <>
                  <EyeOff className="ms-1 size-4" aria-hidden />
                  إخفاء المعاينة
                </>
              ) : (
                <>
                  <Eye className="ms-1 size-4" aria-hidden />
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
            <iframe
              title={title}
              src={resolvedUrl}
              className="h-[min(72vh,640px)] w-full min-h-[280px]"
              loading="lazy"
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            إذا لم تظهر المعاينة، قد يمنع المتصفح العرض — استخدم «فتح في تبويب جديد».
          </p>
        </div>
      )}
    </div>
  )
}

export default function AdminPartnerApplications() {
  const [tab, setTab] = useState("pending")
  const [pending, setPending] = useState([])
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectingId, setRejectingId] = useState(null)
  const [approvingId, setApprovingId] = useState(null)
  const [approveResult, setApproveResult] = useState(null) // { email, temporaryPassword, message }
  const [searchQuery, setSearchQuery] = useState("")

  const fetchPending = async () => {
    try {
      const { data } = await api.get("/partner-applications/pending")
      setPending(unwrapPartnerApplicationsList(data))
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل الطلبات المعلقة")
    }
  }

  const fetchAll = async () => {
    try {
      const { data } = await api.get("/partner-applications")
      setAll(unwrapPartnerApplicationsList(data))
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل الطلبات")
    }
  }

  const fetchDetails = async (organizationId) => {
    setDetailsLoading(true)
    setDetails(null)
    setError("")
    try {
      const { data } = await api.get(`/partner-applications/${organizationId}`)
      const payload = data?.data ?? data
      setDetails(payload ? { ...payload, _fetchForId: organizationId } : data)
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل تفاصيل الطلب")
      setDetails(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setError("")
    if (tab === "pending") fetchPending().finally(() => setLoading(false))
    else fetchAll().finally(() => setLoading(false))
  }, [tab])

  const handleExpand = (orgId) => {
    const id = orgId ?? null
    if (expandedId === id) {
      setExpandedId(null)
      setDetails(null)
      return
    }
    setExpandedId(id)
    if (id) fetchDetails(id)
  }

  const handleApprove = async (organizationId) => {
    setApprovingId(organizationId)
    setApproveResult(null)
    try {
      const { data } = await api.post(`/partner-applications/${organizationId}/approve`)
      setError("")
      setApproveResult({
        email: data?.email,
        temporaryPassword: data?.temporaryPassword,
        message: data?.message,
        note: data?.note,
      })
      fetchPending()
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر اعتماد الطلب")
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (organizationId) => {
    if (!rejectReason?.trim()) {
      setError("يرجى إدخال سبب الرفض")
      return
    }
    setRejectingId(organizationId)
    try {
      await api.post(`/partner-applications/${organizationId}/reject`, { reason: rejectReason.trim() })
      setError("")
      setRejectReason("")
      setExpandedId(null)
      setDetails(null)
      setRejectingId(null)
      fetchPending()
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر رفض الطلب")
    } finally {
      setRejectingId(null)
    }
  }

  const list = tab === "pending" ? pending : all

  const filteredList = useMemo(() => {
    return list.filter((app) => partnerAppMatchesQuery(app, searchQuery))
  }, [list, searchQuery])

  useEffect(() => {
    if (expandedId == null) return
    const stillVisible = filteredList.some(
      (a) => String(a.organizationId ?? a.id ?? a.organization?.id) === String(expandedId)
    )
    if (!stillVisible) {
      setExpandedId(null)
      setDetails(null)
    }
  }, [filteredList, expandedId])

  const displayData = details || (expandedId && list.find((a) => String(a.organizationId ?? a.id ?? a.organization?.id) === String(expandedId)))
  const orgIdFromDetails = displayData?.organizationId ?? displayData?.id ?? displayData?._fetchForId ?? expandedId
  const statusVal = displayData?.status ?? displayData?.verificationStatus ?? ""
  const isPending = String(statusVal).toLowerCase() === "pending"
  const canAct = (tab === "pending" || isPending) && displayData

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-l from-white via-slate-50/80 to-sky-50/30 p-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-brand-navy">طلبات الشركاء</h1>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery.trim()
                ? `عرض ${filteredList.length} من ${list.length} طلب${list.length === 1 ? "" : "ات"}`
                : `${list.length} طلب — تصفية بالاسم، البريد، الهاتف، أو الحالة`}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex flex-wrap gap-2">
              <Button variant={tab === "pending" ? "default" : "outline"} className="rounded-xl" onClick={() => setTab("pending")}>
                المعلقة ({pending.length})
              </Button>
              <Button variant={tab === "all" ? "default" : "outline"} className="rounded-xl" onClick={() => setTab("all")}>
                الكل ({all.length})
              </Button>
            </div>
            <div className="relative min-w-[min(100%,280px)] max-w-md flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث: اسم المنظمة، البريد، الهاتف، رقم المعرف، الحالة…"
                className="h-10 rounded-xl border-slate-200/90 pr-10"
                aria-label="بحث في طلبات الشركاء"
              />
            </div>
          </div>
        </div>
      </div>

      {error && <div className={adminPageError}>{error}</div>}

      {approveResult && (
        <Card className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 shadow-sm ring-1 ring-emerald-100/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <KeyRound className="size-5" />
              بيانات الدخول — أرسلها للمنظمة
            </CardTitle>
            <CardDescription>
              {approveResult.message ?? "تم اعتماد المنظمة."} {approveResult.note}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(approveResult.email || approveResult.temporaryPassword) ? (
              <>
                <div className="flex flex-wrap gap-4">
                  {approveResult.email && (
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-xs text-slate-500">البريد الإلكتروني</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          readOnly
                          value={approveResult.email}
                          className="rounded-xl border-slate-200/90 bg-white font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => navigator.clipboard?.writeText(approveResult.email)}
                          title="نسخ"
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {approveResult.temporaryPassword && (
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-xs text-slate-500">كلمة المرور المؤقتة</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          readOnly
                          value={approveResult.temporaryPassword}
                          type="text"
                          className="rounded-xl border-slate-200/90 bg-white font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => navigator.clipboard?.writeText(approveResult.temporaryPassword)}
                          title="نسخ"
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600">أخبر المنظمة بتغيير كلمة المرور عند أول دخول.</p>
              </>
            ) : (
              <p className="text-sm">{approveResult.message}</p>
            )}
            <Button variant="outline" className="rounded-xl" onClick={() => { setApproveResult(null); setExpandedId(null); setDetails(null); }}>
              تم
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <AdminCardsSkeleton count={5} gridClassName="space-y-3" />
      ) : list.length === 0 ? (
        <Card className={adminCardClass}>
          <CardContent className={`py-12 text-center ${adminTextMuted}`}>
            {tab === "pending" ? "لا توجد طلبات معلقة" : "لا توجد طلبات"}
          </CardContent>
        </Card>
      ) : filteredList.length === 0 ? (
        <Card className={adminCardClass}>
          <CardContent className="py-12 text-center">
            <p className={adminTextMuted}>لا توجد نتائج مطابقة لـ «{searchQuery.trim()}»</p>
            <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={() => setSearchQuery("")}>
              مسح البحث
            </Button>
          </CardContent>
        </Card>
      ) : (
        <MotionSection delay={0.05} aria-label="قائمة طلبات الشركاء">
          <StaggerList className="max-h-[min(78vh,900px)] space-y-3 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80">
          {filteredList.map((app) => {
            const orgId = app.organizationId ?? app.id ?? app.organization?.id
            const exp = expandedId != null && String(expandedId) === String(orgId)
            const docCountFromList = Array.isArray(app.documents) ? app.documents.length : null
            const docCountMeta = app.documentCount ?? app.DocumentCount
            const showDocBadge = docCountFromList !== null || docCountMeta !== undefined
            const docCountDisplay = docCountFromList ?? docCountMeta
            return (
              <StaggerItem key={orgId}>
                <MotionSurface>
                  <Card className={`${adminCardClass} overflow-hidden transition-shadow ${exp ? "ring-2 ring-sky-200/80 shadow-md" : ""}`}>
                <CardHeader
                  className="cursor-pointer py-4 transition-colors hover:bg-sky-50/50"
                  onClick={() => handleExpand(orgId)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className={adminIconBoxRound}>
                        <Building2 className="size-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base font-semibold text-brand-navy">
                            {app.organizationName ?? app.name ?? "—"}
                          </CardTitle>
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 ring-1 ring-slate-200/80">
                            #{orgId}
                          </span>
                        </div>
                        <CardDescription className="line-clamp-2 text-slate-600">
                          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {(app.organizationEmail ?? app.email) && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="size-3 shrink-0 opacity-70" aria-hidden />
                                {app.organizationEmail ?? app.email}
                              </span>
                            )}
                            {(app.phone ?? app.organizationPhone) && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="size-3 shrink-0 opacity-70" aria-hidden />
                                {app.phone ?? app.organizationPhone}
                              </span>
                            )}
                            {!app.organizationEmail && !app.email && !app.phone && !app.organizationPhone && (app.description ?? app.organizationDescription ?? "—")}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {showDocBadge ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/80">
                            <FileStack className="size-3.5" aria-hidden />
                            {Number(docCountDisplay ?? 0)} ملف
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status ?? app.Status] ?? "bg-slate-50 text-slate-700 ring-1 ring-slate-200/80"}`}
                        >
                          {STATUS_LABELS[app.status ?? app.Status] ?? app.status ?? app.Status}
                        </span>
                      </div>
                      <span className="shrink-0 text-slate-400">{exp ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}</span>
                    </div>
                  </div>
                </CardHeader>
                {exp && (
                  <CardContent className="space-y-6 border-t pt-4">
                    {detailsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : (details || app) ? (
                      (() => {
                        const d = details || app
                        return (
                        <>
                        <div>
                          <h4 className="mb-3 font-semibold text-brand-navy">بيانات المنظمة</h4>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">معرّف المنظمة</Label>
                              <p className="font-medium">{d.organizationId ?? d.id ?? orgIdFromDetails}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">اسم المنظمة</Label>
                              <p className="font-medium">{d.organizationName ?? d.name ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500 flex items-center gap-1">
                                <Mail className="size-3" /> البريد
                              </Label>
                              <p>{d.email ?? d.organizationEmail ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="size-3" /> الهاتف
                              </Label>
                              <p>{d.phone ?? d.organizationPhone ?? "—"}</p>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs text-slate-500">الوصف</Label>
                              <p>{d.description ?? d.organizationDescription ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">الحالة</Label>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status] ?? "bg-slate-50 text-slate-700 ring-1 ring-slate-200/80"}`}
                              >
                                {STATUS_LABELS[d.status] ?? d.status}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="size-3" /> تاريخ التقديم
                              </Label>
                              <p>{formatDateTimeEn(d.appliedAt)}</p>
                            </div>
                            {d.approvedAt && (
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">تاريخ الاعتماد</Label>
                                <p>{formatDateTimeEn(d.approvedAt)}</p>
                              </div>
                            )}
                            {d.rejectionReason && (
                              <div className="space-y-1 sm:col-span-2">
                                <Label className="text-xs text-slate-500">سبب الرفض</Label>
                                <p className="text-destructive">{d.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-3 font-semibold text-brand-navy">الوثائق</h4>
                          {(d.documents?.length ?? 0) > 0 ? (
                            <div className="space-y-3">
                              {(d.documents ?? []).map((doc, docIdx) => (
                                <PartnerDocumentCard key={doc.id ?? `${doc.fileUrl}-${docIdx}`} doc={doc} index={docIdx} />
                              ))}
                            </div>
                          ) : (
                            <p className="py-2 text-sm text-slate-500">لا توجد وثائق مرفقة</p>
                          )}
                        </div>

                        {exp && !detailsLoading && (
                          <div className="mt-4 flex flex-wrap items-end gap-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 pt-4">
                            {!canAct && (
                              <p className="w-full text-sm text-slate-600">هذا الطلب معتمد أو مرفوض مسبقاً ولا يمكن تغيير حالته.</p>
                            )}
                            {canAct && (
                              <>
                            <div className="flex-1 space-y-1 min-w-[240px]">
                              <Label>سبب الرفض (مطلوب عند الرفض)</Label>
                              <Input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="مثال: الوثائق غير مكتملة"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApprove(orgIdFromDetails)}
                                disabled={approvingId != null}
                                className={adminBtnPrimary}
                              >
                                {approvingId === orgIdFromDetails ? "جاري الاعتماد..." : "موافقة"}
                                <Check className="ms-2 size-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                className="rounded-xl"
                                onClick={() => handleReject(orgIdFromDetails)}
                                disabled={rejectingId != null || !rejectReason?.trim()}
                              >
                                {rejectingId === orgIdFromDetails ? "جاري الرفض..." : "رفض"}
                                <X className="ms-2 size-4" />
                              </Button>
                            </div>
                            </>
                            )}
                          </div>
                        )}
                      </>
                        )
                      })()
                    ) : (
                      <p className="py-4 text-slate-500">تعذر تحميل التفاصيل</p>
                    )}
                  </CardContent>
                )}
                  </Card>
                </MotionSurface>
              </StaggerItem>
            )
          })}
          </StaggerList>
        </MotionSection>
      )}
    </div>
  )
}
