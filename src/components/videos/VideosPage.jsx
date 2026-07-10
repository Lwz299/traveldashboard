import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import api from "../../api/api"
import {
  fetchVideos,
  createVideoDraft,
  uploadVideoFile,
  uploadVideoThumbnail,
  publishVideo,
  submitVideoReview,
  approveVideo,
  suspendVideo,
  archiveVideo,
  deleteVideo,
} from "../../api/videos"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import {
  Video,
  Plus,
  RefreshCw,
  Upload,
  Play,
  Archive,
  Ban,
  Check,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react"
import { formatDateTimeEn } from "../../utils/formatEn"
import { resolveApiAssetUrl } from "../../utils/apiAssetUrl"
import {
  VIDEO_STATUS_OPTIONS,
  TARGET_TYPE_OPTIONS,
  targetTypeLabelAr,
  videoStatusBadgeClass,
  videoStatusLabelAr,
} from "../../utils/videoDisplay"
import { MotionSection, MotionSurface, DashboardPageSkeleton } from "../motion"
import { AdminCardsSkeleton } from "../motion/AdminSkeletons"
import { orgCardClass, orgBtnPrimary, orgCardClassSubtle } from "../../lib/org-ui"
import { adminCardClass, adminPageError, adminBtnPrimary, adminTextMuted } from "../../lib/admin-ui"

const EMPTY_FORM = {
  title: "",
  description: "",
  targetType: "Trip",
  targetId: "",
  targetLabel: "",
  externalUrl: "",
  organizationId: "",
}

/**
 * @param {{ mode?: 'org' | 'admin', initialTripId?: string }} props
 */
export default function VideosPage({ mode = "org", initialTripId = "" }) {
  const isAdmin = mode === "admin"
  const cardClass = isAdmin ? adminCardClass : orgCardClass
  const btnPrimary = isAdmin ? adminBtnPrimary : orgBtnPrimary

  const [searchParams] = useSearchParams()
  const tripFromUrl = searchParams.get("trip") ?? searchParams.get("eventId") ?? initialTripId

  const [videos, setVideos] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [orgFilter, setOrgFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [events, setEvents] = useState([])
  const [organizations, setOrganizations] = useState([])

  const [modal, setModal] = useState(null) // null | 'create' | { id, step }
  const [form, setForm] = useState({ ...EMPTY_FORM, targetId: tripFromUrl || "" })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [thumbFile, setThumbFile] = useState(null)

  const pageSize = 20

  const loadVideos = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const { items, totalCount: total } = await fetchVideos({
        page,
        pageSize,
        status: statusFilter || undefined,
        organizationId: isAdmin && orgFilter ? orgFilter : undefined,
      })
      setVideos(items)
      setTotalCount(total)
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل الفيديوهات")
      setVideos([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, orgFilter, isAdmin])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  useEffect(() => {
    const eventsPath = isAdmin ? "/events" : "/events/organization/my-events"
    api
      .get(eventsPath)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.items ?? data?.Items ?? []
        setEvents(list)
      })
      .catch(() => setEvents([]))
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    api
      .get("/organizations")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.items ?? data?.Items ?? []
        setOrganizations(list)
      })
      .catch(() => setOrganizations([]))
  }, [isAdmin])

  useEffect(() => {
    if (tripFromUrl && !modal) {
      setForm((f) => ({ ...f, targetType: "Trip", targetId: tripFromUrl }))
    }
  }, [tripFromUrl, modal])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const selectedVideo = useMemo(() => {
    if (!modal || modal === "create") return null
    return videos.find((v) => String(v.id) === String(modal.id)) ?? null
  }, [modal, videos])

  const openCreate = () => {
    setModal("create")
    setForm({
      ...EMPTY_FORM,
      targetType: tripFromUrl ? "Trip" : "General",
      targetId: tripFromUrl || "",
    })
    setVideoFile(null)
    setThumbFile(null)
  }

  const openManage = (video) => {
    setModal({ id: video.id, step: "upload" })
    setVideoFile(null)
    setThumbFile(null)
  }

  const closeModal = () => {
    setModal(null)
    setForm({ ...EMPTY_FORM })
    setVideoFile(null)
    setThumbFile(null)
  }

  const buildDraftPayload = () => {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      targetType: form.targetType,
      targetId: null,
      targetLabel: null,
      externalUrl: form.externalUrl.trim() || null,
    }
    if (form.targetType === "Trip" && form.targetId) {
      payload.targetId = Number(form.targetId) || form.targetId
    }
    if (form.targetType === "Destination" && form.targetLabel.trim()) {
      payload.targetLabel = form.targetLabel.trim()
    }
    if (isAdmin && form.organizationId) {
      payload.organizationId = Number(form.organizationId) || form.organizationId
    }
    return payload
  }

  const handleCreateDraft = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const created = await createVideoDraft(buildDraftPayload())
      const id = created?.id ?? created?.Id
      if (id == null) throw new Error("لم يُرجع الخادم معرّف الفيديو")
      await loadVideos()
      setModal({ id, step: "upload" })
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? "تعذر إنشاء المسودة")
    } finally {
      setSaving(false)
    }
  }

  const handleUploadVideo = async () => {
    const id = modal?.id
    if (!id || !videoFile) return
    setUploading(true)
    setError("")
    try {
      await uploadVideoFile(id, videoFile)
      setVideoFile(null)
      await loadVideos()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر رفع الفيديو")
    } finally {
      setUploading(false)
    }
  }

  const handleUploadThumb = async () => {
    const id = modal?.id
    if (!id || !thumbFile) return
    setUploading(true)
    setError("")
    try {
      await uploadVideoThumbnail(id, thumbFile)
      setThumbFile(null)
      await loadVideos()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر رفع الصورة المصغّرة")
    } finally {
      setUploading(false)
    }
  }

  const runAction = async (id, fn) => {
    setActionId(id)
    setError("")
    try {
      await fn()
      await loadVideos()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تنفيذ الإجراء")
    } finally {
      setActionId(null)
    }
  }

  const handlePublish = (id) => runAction(id, () => publishVideo(id))
  const handleSubmitReview = (id) => runAction(id, () => submitVideoReview(id))
  const handleApprove = (id) => runAction(id, () => approveVideo(id))
  const handleArchive = (id) => {
    if (!confirm("أرشفة هذا الفيديو؟ لن يظهر للعملاء.")) return
    runAction(id, () => archiveVideo(id))
  }
  const handleSuspend = (id) => {
    const reason = prompt("سبب الإيقاف (اختياري):")
    if (reason === null) return
    runAction(id, () => suspendVideo(id, reason))
  }
  const handleDelete = (id) => {
    if (!confirm("حذف نهائي؟ لا يمكن التراجع.")) return
    runAction(id, () => deleteVideo(id))
  }

  const manageVideo =
    selectedVideo ??
    (modal && modal !== "create" ? videos.find((v) => String(v.id) === String(modal.id)) : null)

  if (loading && videos.length === 0 && !error) {
    return isAdmin ? (
      <AdminCardsSkeleton count={6} gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
    ) : (
      <DashboardPageSkeleton />
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isAdmin ? "text-brand-navy" : "org-heading"}`}>
            {isAdmin ? "إشراف الفيديوهات" : "الفيديوهات"}
          </h1>
          <p className={`mt-1 text-sm ${isAdmin ? adminTextMuted : "org-text-secondary"}`}>
            {isAdmin
              ? "مراجعة ونشر فيديوهات كل الشركات"
              : "إنشاء ورفع ونشر فيديوهات ترويجية لرحلاتك"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 gap-2 rounded-xl"
            disabled={loading}
            onClick={() => loadVideos()}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            تحديث
          </Button>
          <Button type="button" onClick={openCreate} className={`h-10 gap-2 rounded-xl ${btnPrimary}`}>
            <Plus className="size-4" aria-hidden />
            فيديو جديد
          </Button>
        </div>
      </div>

      {error && <div className={isAdmin ? adminPageError : "rounded-xl border border-rose-200/90 bg-rose-50 px-4 py-3 text-sm text-rose-900"}>{error}</div>}

      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-700">فلتر الحالة</Label>
              <select
                className="h-10 min-w-[160px] rounded-xl border border-slate-200/90 bg-white px-3 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                {VIDEO_STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div className="space-y-1.5">
                <Label className="text-slate-700">الشركة</Label>
                <select
                  className="h-10 min-w-[180px] rounded-xl border border-slate-200/90 bg-white px-3 text-sm"
                  value={orgFilter}
                  onChange={(e) => {
                    setOrgFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">كل الشركات</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name ?? o.Name ?? `شركة #${o.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {videos.length === 0 ? (
            <p className={`px-6 py-14 text-center text-sm ${isAdmin ? adminTextMuted : "text-slate-500"}`}>
              لا توجد فيديوهات
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3 text-right">الفيديو</th>
                    {isAdmin && <th className="px-4 py-3 text-right">الشركة</th>}
                    <th className="px-4 py-3 text-right">الهدف</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">التاريخ</th>
                    <th className="px-4 py-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {videos.map((v) => {
                    const thumb = resolveApiAssetUrl(v.thumbnailUrl)
                    const videoUrl = resolveApiAssetUrl(v.url)
                    const busy = actionId === v.id
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
                              {thumb ? (
                                <img src={thumb} alt="" className="size-full object-cover" />
                              ) : (
                                <div className="flex size-full items-center justify-center text-slate-400">
                                  <Video className="size-5" />
                                </div>
                              )}
                              {videoUrl && (
                                <a
                                  href={videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100"
                                  title="معاينة"
                                >
                                  <Play className="size-5 text-white" />
                                </a>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">{v.title || `فيديو #${v.id}`}</p>
                              {v.description ? (
                                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{v.description}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-slate-700">
                            {v.organizationName || (v.organizationId != null ? `#${v.organizationId}` : "—")}
                          </td>
                        )}
                        <td className="px-4 py-3 text-slate-700">
                          <span className="block text-xs text-slate-500">{targetTypeLabelAr(v.targetType)}</span>
                          <span className="text-sm">
                            {v.targetType === "Trip" && v.targetId != null
                              ? `رحلة #${v.targetId}`
                              : v.targetLabel || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${videoStatusBadgeClass(v.status)}`}
                          >
                            {videoStatusLabelAr(v.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">
                          {v.createdAt ? formatDateTimeEn(String(v.createdAt)) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              disabled={busy}
                              onClick={() => openManage(v)}
                            >
                              <Upload className="size-3.5" />
                              رفع
                            </Button>
                            {!isAdmin && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg text-xs"
                                  disabled={busy}
                                  onClick={() => handleSubmitReview(v.id)}
                                >
                                  <Send className="size-3.5" />
                                  مراجعة
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className={`h-8 rounded-lg text-xs ${btnPrimary}`}
                                  disabled={busy}
                                  onClick={() => handlePublish(v.id)}
                                >
                                  <Check className="size-3.5" />
                                  نشر
                                </Button>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg text-xs"
                                  disabled={busy}
                                  onClick={() => handleApprove(v.id)}
                                >
                                  <Check className="size-3.5" />
                                  موافقة
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className={`h-8 rounded-lg text-xs ${btnPrimary}`}
                                  disabled={busy}
                                  onClick={() => handlePublish(v.id)}
                                >
                                  نشر
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs text-amber-900"
                              disabled={busy}
                              onClick={() => handleSuspend(v.id)}
                            >
                              <Ban className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              disabled={busy}
                              onClick={() => handleArchive(v.id)}
                            >
                              <Archive className="size-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-xs text-rose-800"
                                disabled={busy}
                                onClick={() => handleDelete(v.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-3">
              <span className="text-xs text-slate-500">
                صفحة {page} من {totalPages} ({totalCount} فيديو)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {modal && (
        <MotionSection delay={0}>
          <MotionSurface>
            <Card className={isAdmin ? adminCardClass : orgCardClassSubtle}>
              <CardHeader>
                <CardTitle className={isAdmin ? "text-brand-navy" : "org-heading"}>
                  {modal === "create" ? "إنشاء فيديو (مسودة)" : `إدارة الفيديو #${modal.id}`}
                </CardTitle>
                <CardDescription>
                  {modal === "create"
                    ? "الخطوة 1: البيانات — ثم رفع الملف ونشر"
                    : "رفع ملف mp4/webm أو صورة مصغّرة ثم النشر"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {modal === "create" ? (
                  <form onSubmit={handleCreateDraft} className="space-y-4">
                    <div className="space-y-2">
                      <Label>العنوان</Label>
                      <Input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        required
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف (اختياري)</Label>
                      <Input
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    {isAdmin && (
                      <div className="space-y-2">
                        <Label>الشركة</Label>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm"
                          value={form.organizationId}
                          onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                        >
                          <option value="">من التوكن / افتراضي</option>
                          {organizations.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name ?? o.Name ?? `#${o.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>نوع الهدف</Label>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm"
                          value={form.targetType}
                          onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))}
                        >
                          {TARGET_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {form.targetType === "Trip" && (
                        <div className="space-y-2">
                          <Label>الرحلة</Label>
                          <select
                            className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm"
                            value={form.targetId}
                            onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
                          >
                            <option value="">— اختر —</option>
                            {events.map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                {ev.title ?? ev.name ?? `#${ev.id}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {form.targetType === "Destination" && (
                        <div className="space-y-2">
                          <Label>اسم الوجهة</Label>
                          <Input
                            value={form.targetLabel}
                            onChange={(e) => setForm((f) => ({ ...f, targetLabel: e.target.value }))}
                            placeholder="مثل: أربيل"
                            className="h-11 rounded-xl"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>رابط خارجي (بديل عن الرفع)</Label>
                      <Input
                        dir="ltr"
                        value={form.externalUrl}
                        onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
                        placeholder="https://cdn.example.com/promo.mp4"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={saving} className={btnPrimary}>
                        {saving ? "جاري الإنشاء…" : "إنشاء مسودة"}
                      </Button>
                      <Button type="button" variant="outline" className="rounded-xl" onClick={closeModal}>
                        إلغاء
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {manageVideo && (
                      <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                        {manageVideo.thumbnailUrl && (
                          <img
                            src={resolveApiAssetUrl(manageVideo.thumbnailUrl)}
                            alt=""
                            className="size-20 rounded-lg object-cover ring-1 ring-slate-200"
                          />
                        )}
                        <div className="min-w-0 text-sm">
                          <p className="font-semibold text-slate-900">{manageVideo.title}</p>
                          <p className="mt-1 text-slate-600">
                            الحالة: {videoStatusLabelAr(manageVideo.status)}
                          </p>
                          {manageVideo.url && (
                            <a
                              href={resolveApiAssetUrl(manageVideo.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-sky-700 hover:underline"
                            >
                              <Play className="size-3.5" />
                              معاينة الفيديو
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 rounded-xl border border-dashed border-slate-200 p-4">
                        <Label className="flex items-center gap-2">
                          <Upload className="size-4" />
                          ملف الفيديو (mp4 / webm)
                        </Label>
                        <Input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                          className="text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className={btnPrimary}
                          disabled={!videoFile || uploading}
                          onClick={handleUploadVideo}
                        >
                          {uploading ? "جاري الرفع…" : "رفع الفيديو"}
                        </Button>
                      </div>
                      <div className="space-y-2 rounded-xl border border-dashed border-slate-200 p-4">
                        <Label className="flex items-center gap-2">
                          <ImageIcon className="size-4" />
                          صورة مصغّرة (اختياري)
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
                          className="text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={!thumbFile || uploading}
                          onClick={handleUploadThumb}
                        >
                          رفع المصغّرة
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                      {!isAdmin && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            disabled={actionId === modal.id}
                            onClick={() => handleSubmitReview(modal.id)}
                          >
                            <Send className="size-4" />
                            إرسال للمراجعة
                          </Button>
                          <Button
                            type="button"
                            className={btnPrimary}
                            disabled={actionId === modal.id}
                            onClick={() => handlePublish(modal.id)}
                          >
                            <Check className="size-4" />
                            نشر
                          </Button>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            disabled={actionId === modal.id}
                            onClick={() => handleApprove(modal.id)}
                          >
                            موافقة
                          </Button>
                          <Button
                            type="button"
                            className={btnPrimary}
                            disabled={actionId === modal.id}
                            onClick={() => handlePublish(modal.id)}
                          >
                            نشر
                          </Button>
                        </>
                      )}
                      <Button type="button" variant="outline" className="rounded-xl" onClick={closeModal}>
                        إغلاق
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionSurface>
        </MotionSection>
      )}
    </div>
  )
}
