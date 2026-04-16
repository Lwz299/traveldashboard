import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getSuperAdminBroadcasts,
  getSuperAdminNotificationsDelivered,
  postAiBroadcastNotification,
  postInAppEventNotification,
  postInAppOrganizationNotification,
  postPushNotification,
  postSuperAdminBroadcastAll,
} from "../../api/notifications"
import { getLocalBroadcastHistory, appendLocalBroadcastHistory } from "../../utils/broadcastHistoryLocal"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { MotionSection, MotionSurface } from "../../components/motion"
import { adminBtnPrimary, adminCardClass, adminIconBox, adminTextMuted } from "../../lib/admin-ui"
import { formatCountEn, formatDateTimeEn } from "../../utils/formatEn"
import { formatNotifyResponse } from "../../utils/notificationResponse"
import {
  BellRing,
  Bot,
  Building2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Megaphone,
  RefreshCw,
  ScrollText,
  Send,
  Smartphone,
  Sparkles,
} from "lucide-react"

function extractArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") return value.items ?? value.notifications ?? value.data ?? value.broadcasts ?? []
  return []
}

function extractBroadcastPage(data) {
  if (!data || typeof data !== "object") return { items: [], totalCount: 0 }
  const items = data.items ?? data.Items ?? extractArray(data)
  const totalCount = Number(data.totalCount ?? data.TotalCount ?? items.length) || 0
  return { items: Array.isArray(items) ? items : [], totalCount }
}

function extractDeliveredPage(data) {
  if (!data || typeof data !== "object") return { items: [], totalCount: 0 }
  const items = data.items ?? data.Items ?? extractArray(data)
  const totalCount = Number(data.totalCount ?? data.TotalCount ?? items.length) || 0
  return { items: Array.isArray(items) ? items : [], totalCount }
}

const NOTIFICATION_TYPE_LABELS = {
  platform_announcement: "إعلان المنصة",
  organizer_event_message: "منظم — مشتري الفعالية",
  organizer_org_message: "منظم — عملاء المنظمة",
}

const pageTabBtn = (active) =>
  [
    "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all",
    active
      ? "border-sky-400 bg-sky-50 text-sky-950 ring-1 ring-sky-200/90 shadow-sm"
      : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80",
  ].join(" ")

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

function mergePublishedRows(serverRows, localRows) {
  const key = (r) => {
    const t = pickFirst(r, ["title", "Title"]) ?? ""
    const b = pickFirst(r, ["body", "Body", "message", "Message"]) ?? ""
    return `${String(t).trim()}|${String(b).trim()}`
  }
  const map = new Map()
  for (const s of serverRows) {
    const k = key(s)
    if (k !== "|") map.set(k, s)
  }
  for (const l of localRows) {
    const k = key(l)
    if (k && k !== "|" && !map.has(k)) map.set(k, l)
  }
  return [...map.values()].sort((a, b) => {
    const da = new Date(pickFirst(a, ["createdAt", "CreatedAt", "sentAt", "SentAt"]) || 0).getTime()
    const db = new Date(pickFirst(b, ["createdAt", "CreatedAt", "sentAt", "SentAt"]) || 0).getTime()
    return db - da
  })
}

export default function AdminNotificationsCenter() {
  const [pageTab, setPageTab] = useState("compose")
  const [activeMode, setActiveMode] = useState("all")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [allTitle, setAllTitle] = useState("")
  const [allBody, setAllBody] = useState("")
  const [allSource, setAllSource] = useState("dashboard")
  const [allExternalRef, setAllExternalRef] = useState("")

  const [eventId, setEventId] = useState("")
  const [eventTitle, setEventTitle] = useState("")
  const [eventBody, setEventBody] = useState("")

  const [orgId, setOrgId] = useState("")
  const [orgTitle, setOrgTitle] = useState("")
  const [orgBody, setOrgBody] = useState("")

  const [pushUserId, setPushUserId] = useState("")
  const [pushTitle, setPushTitle] = useState("")
  const [pushMessage, setPushMessage] = useState("")

  const [aiKey, setAiKey] = useState("")
  const [aiTitle, setAiTitle] = useState("")
  const [aiBody, setAiBody] = useState("")
  const [aiExternalRef, setAiExternalRef] = useState("")

  const [pubLoading, setPubLoading] = useState(true)
  const [pubError, setPubError] = useState("")
  const [publishedBroadcasts, setPublishedBroadcasts] = useState([])
  const [pubTotalCount, setPubTotalCount] = useState(0)
  const [pubSkip, setPubSkip] = useState(0)
  const [pubTake, setPubTake] = useState(50)
  const [pubQ, setPubQ] = useState("")
  const [pubQInput, setPubQInput] = useState("")
  const [historyHint, setHistoryHint] = useState("")

  const [delLoading, setDelLoading] = useState(false)
  const [delError, setDelError] = useState("")
  const [delItems, setDelItems] = useState([])
  const [delTotal, setDelTotal] = useState(0)
  const [delSkip, setDelSkip] = useState(0)
  const [delTake, setDelTake] = useState(50)
  const [delType, setDelType] = useState("")
  const [delQInput, setDelQInput] = useState("")
  const [delQ, setDelQ] = useState("")
  const [delUserIdInput, setDelUserIdInput] = useState("")
  const [delUserIdFilter, setDelUserIdFilter] = useState("")

  const modeOptions = [
    { id: "all", label: "بث عام", Icon: Megaphone },
    { id: "event", label: "حسب فعالية", Icon: BellRing },
    { id: "org", label: "كل عملاء منظمة", Icon: Building2 },
    { id: "push", label: "Push تجريبي", Icon: Smartphone },
    { id: "ai", label: "تكامل AI", Icon: Bot },
  ]

  const loadPublishedBroadcasts = useCallback(
    async (overrides = {}) => {
      const effQ = overrides.q !== undefined ? overrides.q : pubQ
      const effSkip = overrides.skip !== undefined ? overrides.skip : pubSkip
      const effTake = overrides.take !== undefined ? overrides.take : pubTake

      setPubLoading(true)
      setPubError("")
      setHistoryHint("")
      try {
        const data = await getSuperAdminBroadcasts({ q: effQ || undefined, skip: effSkip, take: effTake })
        const { items: serverItems, totalCount } = extractBroadcastPage(data)
        setPubTotalCount(totalCount)
        const merged = effSkip === 0 ? mergePublishedRows(serverItems, getLocalBroadcastHistory()) : serverItems
        setPublishedBroadcasts(merged)
      } catch (err) {
        const st = err?.response?.status
        if (st === 404 || st === 405) {
          const local = getLocalBroadcastHistory()
          setPublishedBroadcasts(mergePublishedRows([], local))
          setPubTotalCount(0)
          setHistoryHint(local.length ? "السجل المعروض محلي مؤقتاً." : "سجل البث غير متاح حالياً.")
        } else {
          setPubError(err?.response?.data?.message ?? "تعذر تحميل سجل البث.")
          setPublishedBroadcasts([])
          setPubTotalCount(0)
        }
      } finally {
        setPubLoading(false)
      }
    },
    [pubQ, pubSkip, pubTake]
  )

  const loadDelivered = useCallback(
    async (overrides = {}) => {
      const effQ = overrides.q !== undefined ? overrides.q : delQ
      const effUid = overrides.userId !== undefined ? overrides.userId : delUserIdFilter
      const effSkip = overrides.skip !== undefined ? overrides.skip : delSkip
      const effType = overrides.type !== undefined ? overrides.type : delType
      const effTake = overrides.take !== undefined ? overrides.take : delTake
      setDelLoading(true)
      setDelError("")
      try {
        const data = await getSuperAdminNotificationsDelivered({
          type: effType || undefined,
          q: effQ || undefined,
          userId: String(effUid).trim() || undefined,
          skip: effSkip,
          take: effTake,
        })
        const { items, totalCount } = extractDeliveredPage(data)
        setDelItems(items)
        setDelTotal(totalCount)
      } catch (err) {
        setDelError(err?.response?.data?.message ?? "تعذر تحميل سجل التسليم التفصيلي.")
        setDelItems([])
        setDelTotal(0)
      } finally {
        setDelLoading(false)
      }
    },
    [delType, delQ, delUserIdFilter, delSkip, delTake]
  )

  const applyDeliveredSearch = useCallback(() => {
    setDelQ(delQInput.trim())
    setDelUserIdFilter(delUserIdInput.trim())
    setDelSkip(0)
  }, [delQInput, delUserIdInput])

  useEffect(() => {
    if (pageTab !== "broadcasts") return
    loadPublishedBroadcasts()
  }, [pageTab, loadPublishedBroadcasts])

  useEffect(() => {
    if (pageTab !== "delivered") return
    loadDelivered()
  }, [pageTab, loadDelivered])

  const handleSend = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSending(true)
    try {
      if (activeMode === "all") {
        const title = allTitle.trim()
        const body = allBody.trim()
        if (!title || !body) throw new Error("الرجاء إدخال العنوان والنص.")
        const payload = { title, body, source: allSource.trim() || "dashboard" }
        if (allExternalRef.trim()) payload.externalReferenceId = allExternalRef.trim()
        const data = await postSuperAdminBroadcastAll(payload)
        appendLocalBroadcastHistory({ title, body })
        setSuccess(formatNotifyResponse(data) || "تم الإرسال بنجاح.")
        setAllTitle("")
        setAllBody("")
        setAllExternalRef("")
        setPubSkip(0)
        await loadPublishedBroadcasts({ skip: 0, q: pubQ })
      }
      if (activeMode === "event") {
        if (!eventId.trim() || !eventTitle.trim() || !eventBody.trim()) throw new Error("الرجاء تعبئة كل الحقول.")
        const data = await postInAppEventNotification(eventId.trim(), {
          title: eventTitle.trim(),
          body: eventBody.trim(),
        })
        setSuccess(formatNotifyResponse(data) || "تم إرسال إشعار الفعالية.")
      }
      if (activeMode === "org") {
        if (!orgTitle.trim() || !orgBody.trim()) throw new Error("الرجاء تعبئة كل الحقول.")
        const payload = { title: orgTitle.trim(), body: orgBody.trim() }
        if (orgId.trim()) payload.organizationId = Number(orgId)
        const data = await postInAppOrganizationNotification(payload)
        setSuccess(formatNotifyResponse(data) || "تم إرسال إشعار المنظمة.")
      }
      if (activeMode === "push") {
        if (!pushUserId.trim() || !pushTitle.trim() || !pushMessage.trim()) throw new Error("الرجاء تعبئة كل الحقول.")
        const data = await postPushNotification(pushUserId.trim(), { title: pushTitle.trim(), message: pushMessage.trim() })
        setSuccess(data?.message ?? data?.Message ?? "تم تنفيذ Push.")
      }
      if (activeMode === "ai") {
        if (!aiKey.trim() || !aiTitle.trim() || !aiBody.trim()) throw new Error("الرجاء إدخال المفتاح والعنوان والنص.")
        const data = await postAiBroadcastNotification(
          {
            title: aiTitle.trim(),
            body: aiBody.trim(),
            externalReferenceId: aiExternalRef.trim() || undefined,
          },
          aiKey.trim()
        )
        setSuccess(formatNotifyResponse(data) || "تم تنفيذ بث AI بنجاح.")
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ??
          err?.response?.data?.title ??
          (typeof err?.response?.data === "string" ? err.response.data : null) ??
          err?.message ??
          "تعذر تنفيذ الطلب"
      )
    } finally {
      setSending(false)
    }
  }

  const recipientsSum = useMemo(
    () =>
      publishedBroadcasts.reduce((sum, row) => {
        const n = Number(pickFirst(row, ["recipientCount", "RecipientCount", "usersNotified", "UsersNotified"]) ?? 0)
        return sum + (Number.isFinite(n) ? n : 0)
      }, 0),
    [publishedBroadcasts]
  )

  const latestBroadcastAt = useMemo(() => {
    if (!publishedBroadcasts.length) return null
    return pickFirst(publishedBroadcasts[0], ["createdAt", "CreatedAt", "sentAt", "SentAt"]) ?? null
  }, [publishedBroadcasts])

  const typeLabelAr = (raw) => {
    const t = String(raw ?? "").trim()
    if (!t) return "—"
    return NOTIFICATION_TYPE_LABELS[t] ?? t
  }

  return (
    <div className="space-y-8" dir="rtl">
      <MotionSurface>
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="mb-3 text-xs leading-relaxed text-slate-600">
            الإشعارات الفعلية تُخزَّن في قاعدة البيانات (جدول المستخدم). بث «للجميع» يُلخّص في سجل البث؛ التفاصيل لكل مستخدم تظهر في «سجل التسليم».
          </p>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="أقسام مركز الإشعارات">
            <button
              type="button"
              role="tab"
              aria-selected={pageTab === "compose"}
              className={pageTabBtn(pageTab === "compose")}
              onClick={() => setPageTab("compose")}
            >
              <Send className="size-4 shrink-0" aria-hidden />
              إرسال وتكوين
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pageTab === "delivered"}
              className={pageTabBtn(pageTab === "delivered")}
              onClick={() => setPageTab("delivered")}
            >
              <ListChecks className="size-4 shrink-0" aria-hidden />
              سجل التسليم
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pageTab === "broadcasts"}
              className={pageTabBtn(pageTab === "broadcasts")}
              onClick={() => setPageTab("broadcasts")}
            >
              <Megaphone className="size-4 shrink-0" aria-hidden />
              بث المنصة
            </button>
          </div>
        </div>
      </MotionSurface>

      {pageTab === "compose" && (
      <MotionSurface>
        <Card className={`${adminCardClass} hover:bg-white/95 hover:shadow-sm`}>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className={adminIconBox}>
                <Sparkles className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-brand-navy">مركز الإشعارات</CardTitle>
                <p className="mt-1 text-xs text-slate-500">واجهة موحّدة لجميع مسارات الإشعارات.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 bg-gradient-to-b from-white/70 via-white to-slate-50/30 rounded-b-2xl">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {modeOptions.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveMode(id)
                    setError("")
                    setSuccess("")
                  }}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all ${
                    activeMode === id
                      ? "border-sky-300 bg-sky-50 text-sky-900 ring-1 ring-sky-200/80 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-white"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            {error && <div className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 text-sm text-rose-800">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 text-sm text-emerald-900">{success}</div>}

            <form onSubmit={handleSend} className="space-y-4">
              {activeMode === "all" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>العنوان</Label><Input value={allTitle} onChange={(e) => setAllTitle(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                    <div className="space-y-2"><Label>المصدر</Label><Input value={allSource} onChange={(e) => setAllSource(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                  </div>
                  <div className="space-y-2"><Label>النص</Label><textarea value={allBody} onChange={(e) => setAllBody(e.target.value)} rows={4} className="flex w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-800/25" /></div>
                  <div className="space-y-2"><Label>مرجع خارجي</Label><Input value={allExternalRef} onChange={(e) => setAllExternalRef(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                </>
              )}

              {activeMode === "event" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>eventId</Label><Input value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                    <div className="space-y-2"><Label>العنوان</Label><Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                  </div>
                  <div className="space-y-2"><Label>النص</Label><textarea value={eventBody} onChange={(e) => setEventBody(e.target.value)} rows={4} className="flex w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-800/25" /></div>
                </>
              )}

              {activeMode === "org" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>organizationId</Label><Input value={orgId} onChange={(e) => setOrgId(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                    <div className="space-y-2"><Label>العنوان</Label><Input value={orgTitle} onChange={(e) => setOrgTitle(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                  </div>
                  <div className="space-y-2"><Label>النص</Label><textarea value={orgBody} onChange={(e) => setOrgBody(e.target.value)} rows={4} className="flex w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-800/25" /></div>
                </>
              )}

              {activeMode === "push" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>userId</Label><Input value={pushUserId} onChange={(e) => setPushUserId(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                    <div className="space-y-2"><Label>العنوان</Label><Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                  </div>
                  <div className="space-y-2"><Label>الرسالة</Label><textarea value={pushMessage} onChange={(e) => setPushMessage(e.target.value)} rows={3} className="flex w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-800/25" /></div>
                </>
              )}

              {activeMode === "ai" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2"><Label>X-AI-Broadcast-Key</Label><Input value={aiKey} onChange={(e) => setAiKey(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                    <div className="space-y-2"><Label>العنوان</Label><Input value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                    <div className="space-y-2"><Label>مرجع خارجي</Label><Input value={aiExternalRef} onChange={(e) => setAiExternalRef(e.target.value)} className="h-11 rounded-xl border-slate-200/90" /></div>
                  </div>
                  <div className="space-y-2"><Label>النص</Label><textarea value={aiBody} onChange={(e) => setAiBody(e.target.value)} rows={3} className="flex w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-800/25" /></div>
                </>
              )}

              <Button type="submit" disabled={sending} className={`h-11 text-[15px] font-medium ${adminBtnPrimary}`}>
                {sending ? "جارٍ التنفيذ..." : "تنفيذ"} <Send className="ms-2 size-4" aria-hidden />
              </Button>
            </form>
          </CardContent>
        </Card>
      </MotionSurface>
      )}

      {pageTab === "delivered" && (
      <MotionSection aria-label="سجل التسليم التفصيلي">
        <Card className={`${adminCardClass} hover:bg-white/95 hover:shadow-sm`}>
          <CardHeader className="flex flex-col gap-3 border-b border-slate-200/70 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={adminIconBox}>
                <ListChecks className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-brand-navy">سجل التسليم التفصيلي</CardTitle>
                <p className="mt-1 text-xs text-slate-500">كل إشعار وصل لمستخدم — بحث وفلترة حسب النوع أو المستخدم.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                const q = delQInput.trim()
                const uid = delUserIdInput.trim()
                setDelQ(q)
                setDelUserIdFilter(uid)
                loadDelivered({ q, userId: uid, skip: delSkip })
              }}
              disabled={delLoading}
            >
              <RefreshCw className={`size-4 ${delLoading ? "animate-spin" : ""}`} aria-hidden /> تحديث
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="min-w-[160px] space-y-1.5">
                <Label className="text-slate-700">نوع الإشعار</Label>
                <select
                  value={delType}
                  onChange={(e) => {
                    setDelType(e.target.value)
                    setDelSkip(0)
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm shadow-sm outline-none ring-1 ring-slate-900/[0.04] focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  disabled={delLoading}
                >
                  <option value="">الكل</option>
                  <option value="platform_announcement">إعلان المنصة</option>
                  <option value="organizer_event_message">منظم — مشتري الفعالية</option>
                  <option value="organizer_org_message">منظم — عملاء المنظمة</option>
                </select>
              </div>
              <div className="min-w-[140px] space-y-1.5">
                <Label className="text-slate-700">معرّف المستخدم</Label>
                <Input
                  value={delUserIdInput}
                  onChange={(e) => setDelUserIdInput(e.target.value)}
                  placeholder="userId"
                  className="h-10 rounded-xl border-slate-200/90 font-mono text-sm"
                  disabled={delLoading}
                />
              </div>
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label className="text-slate-700">بحث في العنوان أو النص</Label>
                <div className="flex gap-2">
                  <Input
                    value={delQInput}
                    onChange={(e) => setDelQInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        applyDeliveredSearch()
                      }
                    }}
                    placeholder="كلمات في العنوان أو المحتوى"
                    className="h-10 rounded-xl border-slate-200/90"
                    disabled={delLoading}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 shrink-0 rounded-xl"
                    onClick={applyDeliveredSearch}
                  >
                    بحث
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-slate-700">عدد الصفوف</Label>
                <select
                  value={delTake}
                  onChange={(e) => {
                    setDelTake(Number(e.target.value))
                    setDelSkip(0)
                  }}
                  className="h-10 rounded-xl border border-slate-200/90 bg-white px-2 text-sm"
                  disabled={delLoading}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            {delTotal > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-[13px] text-slate-600">
                <span>
                  إجمالي السجلات: <strong className="text-brand-navy">{formatCountEn(delTotal)}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={delLoading || delSkip <= 0}
                    onClick={() => setDelSkip((s) => Math.max(0, s - delTake))}
                  >
                    <ChevronRight className="size-4" /> السابق
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={delLoading || delSkip + delTake >= delTotal}
                    onClick={() => setDelSkip((s) => s + delTake)}
                  >
                    التالي <ChevronLeft className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {delError && (
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 text-sm text-rose-800">{delError}</div>
            )}

            {delLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100/90" />
                ))}
              </div>
            ) : delItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/60 py-12 text-center text-sm text-slate-500">
                لا توجد نتائج لهذه المعايير.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="min-w-[1100px] w-full border-collapse text-sm">
                  <thead className="bg-slate-50/80 text-slate-600">
                    <tr>
                      <th className="px-3 py-3 text-right font-medium">#</th>
                      <th className="px-3 py-3 text-right font-medium">المستخدم</th>
                      <th className="px-3 py-3 text-right font-medium">البريد</th>
                      <th className="min-w-[140px] px-3 py-3 text-right font-medium">الاسم</th>
                      <th className="min-w-[120px] px-3 py-3 text-right font-medium">العنوان</th>
                      <th className="min-w-[200px] px-3 py-3 text-right font-medium">النص</th>
                      <th className="px-3 py-3 text-right font-medium">النوع</th>
                      <th className="px-3 py-3 text-right font-medium">مرجع</th>
                      <th className="px-3 py-3 text-right font-medium">مقروء</th>
                      <th className="px-3 py-3 text-right font-medium">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delItems.map((row, idx) => {
                      const uid = pickFirst(row, ["userId", "UserId"])
                      const email = pickFirst(row, ["recipientEmail", "RecipientEmail"]) ?? "—"
                      const name = pickFirst(row, ["recipientFullName", "RecipientFullName"]) ?? "—"
                      const title = pickFirst(row, ["title", "Title"]) ?? "—"
                      const body = pickFirst(row, ["body", "Body"]) ?? "—"
                      const typ = pickFirst(row, ["type", "Type", "notificationType", "NotificationType"]) ?? "—"
                      const refId = pickFirst(row, ["referenceId", "ReferenceId"])
                      const read = pickFirst(row, ["isRead", "IsRead"])
                      const at = pickFirst(row, ["createdAt", "CreatedAt"])
                      const readBool = read === true || read === "true" || String(read).toLowerCase() === "true"
                      return (
                        <tr key={`${uid}-${idx}-${at}`} className="border-t border-slate-200/70 bg-white/90">
                          <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-500">{delSkip + idx + 1}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-slate-700">
                            {uid != null ? formatCountEn(uid) : "—"}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-3 text-slate-700" title={email !== "—" ? String(email) : undefined}>
                            {email}
                          </td>
                          <td className="max-w-[160px] px-3 py-3 text-slate-800">{name}</td>
                          <td className="max-w-[160px] px-3 py-3 font-medium text-brand-navy">{title}</td>
                          <td className="max-w-xs px-3 py-3 text-slate-600">
                            <span className="line-clamp-2">{body}</span>
                          </td>
                          <td className="max-w-[140px] px-3 py-3 text-[11px] text-slate-700" title={String(typ)}>
                            {typeLabelAr(typ)}
                          </td>
                          <td className="max-w-[100px] truncate px-3 py-3 font-mono text-[11px] text-slate-500" title={refId != null ? String(refId) : undefined}>
                            {refId != null && refId !== "" ? String(refId) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                                readBool
                                  ? "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
                                  : "bg-amber-50 text-amber-900 ring-amber-200/80"
                              }`}
                            >
                              {readBool ? "نعم" : "لا"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">{at ? formatDateTimeEn(at) : "—"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {delTotal > 0 && !delLoading && delItems.length > 0 && (
              <p className={`text-center text-xs ${adminTextMuted}`}>
                عرض {formatCountEn(delSkip + 1)}–{formatCountEn(Math.min(delSkip + delTake, delTotal))} من {formatCountEn(delTotal)}
              </p>
            )}
          </CardContent>
        </Card>
      </MotionSection>
      )}

      {pageTab === "broadcasts" && (
      <>
      <MotionSection aria-label="مؤشرات سجل البث">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className={`${adminCardClass} hover:bg-white/95 hover:shadow-sm`}><CardContent className="p-4 bg-gradient-to-br from-sky-50/40 to-white rounded-2xl"><p className="text-xs text-slate-500">إجمالي سجلات البث</p><p className="mt-1 text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(pubTotalCount)}</p></CardContent></Card>
          <Card className={`${adminCardClass} hover:bg-white/95 hover:shadow-sm`}><CardContent className="p-4 bg-gradient-to-br from-emerald-50/40 to-white rounded-2xl"><p className="text-xs text-slate-500">مجموع المستلمين (الصفحة)</p><p className="mt-1 text-2xl font-semibold tabular-nums text-brand-navy">{formatCountEn(recipientsSum)}</p></CardContent></Card>
          <Card className={`${adminCardClass} hover:bg-white/95 hover:shadow-sm`}><CardContent className="p-4 bg-gradient-to-br from-indigo-50/35 to-white rounded-2xl"><p className="text-xs text-slate-500">آخر بث</p><p className="mt-1 text-sm font-medium text-brand-navy">{latestBroadcastAt ? formatDateTimeEn(latestBroadcastAt) : "—"}</p></CardContent></Card>
        </div>
      </MotionSection>

      <MotionSection aria-label="سجل البثوات">
        <Card className={`${adminCardClass} hover:bg-white/95 hover:shadow-sm`}>
          <CardHeader className="flex flex-col gap-3 border-b border-slate-200/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><div className={adminIconBox}><ScrollText className="size-5" strokeWidth={1.75} /></div><CardTitle className="text-lg font-semibold text-brand-navy">سجل البثوات</CardTitle></div>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => loadPublishedBroadcasts()} disabled={pubLoading}>
              <RefreshCw className={`size-4 ${pubLoading ? "animate-spin" : ""}`} aria-hidden /> تحديث السجل
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label className="text-slate-700">بحث</Label>
                <div className="flex gap-2">
                  <Input value={pubQInput} onChange={(e) => setPubQInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setPubQ(pubQInput.trim()); setPubSkip(0) } }} placeholder="العنوان / النص / المصدر / المرجع" className="h-10 rounded-xl border-slate-200/90" />
                  <Button type="button" variant="secondary" className="h-10 shrink-0 rounded-xl" onClick={() => { setPubQ(pubQInput.trim()); setPubSkip(0) }}>بحث</Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-slate-700">عدد الصفوف</Label>
                <select value={pubTake} onChange={(e) => { setPubTake(Number(e.target.value)); setPubSkip(0) }} className="h-10 rounded-xl border border-slate-200/90 bg-white px-2 text-sm">
                  <option value={20}>20</option><option value={50}>50</option><option value={100}>100</option><option value={200}>200</option>
                </select>
              </div>
            </div>

            {pubTotalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-[13px] text-slate-600">
                <span>إجمالي السجلات: <strong className="text-brand-navy">{formatCountEn(pubTotalCount)}</strong></span>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={pubLoading || pubSkip <= 0} onClick={() => setPubSkip((s) => Math.max(0, s - pubTake))}><ChevronRight className="size-4" /> السابق</Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={pubLoading || pubSkip + pubTake >= pubTotalCount} onClick={() => setPubSkip((s) => s + pubTake)}>التالي <ChevronLeft className="size-4" /></Button>
                </div>
              </div>
            )}

            {pubError && <div className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 text-sm text-rose-800">{pubError}</div>}
            {historyHint && !pubError && <div className="rounded-xl border border-sky-200/80 bg-sky-50/90 px-3 py-2.5 text-[13px] text-sky-900">{historyHint}</div>}

            {pubLoading ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100/90" />)}</div>
            ) : publishedBroadcasts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/60 py-12 text-center text-sm text-slate-500">لا يوجد سجلات</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-50/80 text-slate-600"><tr><th className="w-12 px-2 py-3 text-right font-medium">#</th><th className="px-2 py-3 text-right font-medium">id</th><th className="px-3 py-3 text-right font-medium">العنوان</th><th className="min-w-[180px] px-3 py-3 text-right font-medium">النص</th><th className="px-2 py-3 text-right font-medium">النوع</th><th className="px-2 py-3 text-right font-medium">المصدر</th><th className="min-w-[100px] px-2 py-3 text-right font-medium">مرجع</th><th className="px-3 py-3 text-right font-medium">التاريخ</th><th className="px-2 py-3 text-right font-medium">المستلمون</th></tr></thead>
                  <tbody>
                    {publishedBroadcasts.map((row, idx) => {
                      const id = pickFirst(row, ["id", "Id"]) ?? idx
                      const t = pickFirst(row, ["title", "Title"]) ?? "—"
                      const b = pickFirst(row, ["body", "Body", "message", "Message"]) ?? "—"
                      const ntype = pickFirst(row, ["notificationType", "NotificationType"]) ?? "—"
                      const src = pickFirst(row, ["source", "Source"]) ?? "—"
                      const ext = pickFirst(row, ["externalReferenceId", "ExternalReferenceId"]) ?? ""
                      const at = pickFirst(row, ["createdAt", "CreatedAt", "sentAt", "SentAt"]) ?? null
                      const notified = pickFirst(row, ["recipientCount", "RecipientCount", "usersNotified", "UsersNotified"]) ?? null
                      return (
                        <tr key={`${id}-${idx}`} className="border-t border-slate-200/70 bg-white/90">
                          <td className="px-2 py-3 text-slate-500">{pubSkip + idx + 1}</td>
                          <td className="max-w-[72px] truncate px-2 py-3 font-mono text-[11px] text-slate-600">{String(id)}</td>
                          <td className="px-3 py-3 font-semibold text-brand-navy">{t}</td>
                          <td className="max-w-xs px-3 py-3 text-slate-600"><span className="line-clamp-2">{b}</span></td>
                          <td className="px-2 py-3 text-[11px] text-slate-600">{ntype}</td>
                          <td className="px-2 py-3 text-[11px] text-slate-600">{src}</td>
                          <td className="max-w-[120px] truncate px-2 py-3 font-mono text-[11px] text-slate-500" title={ext || undefined}>{ext || "—"}</td>
                          <td className="px-3 py-3 text-slate-500">{at ? formatDateTimeEn(at) : "—"}</td>
                          <td className="px-2 py-3 text-slate-600">{notified != null && notified !== "" ? formatCountEn(notified) : "—"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionSection>
      </>
      )}
    </div>
  )
}
