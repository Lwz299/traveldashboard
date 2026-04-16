import { useEffect, useState } from "react"
import api from "../api/api"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Plus, Users, Bell, Send, Tags, Sparkles } from "lucide-react"
import { formatNotifyResponse } from "../utils/notificationResponse"
import { formatCountEn } from "../utils/formatEn"
import {
  MotionSection,
  StaggerItem,
  StaggerList,
  DashboardPageSkeleton,
} from "../components/motion"

const btnTap = "transition-transform duration-200 ease-in-out active:scale-[0.98]"

const cardShell =
  "rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow hover:shadow-md"

const textareaClass =
  "flex min-h-[100px] w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-800/25"

function Feedback({ type, children }) {
  if (!children) return null
  const ok = type === "ok"
  return (
    <div
      role="status"
      className={`rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
        ok ? "border border-emerald-200/80 bg-emerald-50/90 text-emerald-900" : "border border-red-200/80 bg-red-50/90 text-red-800"
      }`}
    >
      {children}
    </div>
  )
}

export default function Attendees() {
  const [segments, setSegments] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [segmentForm, setSegmentForm] = useState({ name: "" })
  const [assignSegment, setAssignSegment] = useState({ segmentId: "", userId: "" })
  const [assignStatus, setAssignStatus] = useState("")

  const [eventId, setEventId] = useState("")
  const [eventTitle, setEventTitle] = useState("")
  const [eventBody, setEventBody] = useState("")
  const [eventLoading, setEventLoading] = useState(false)
  const [eventFeedback, setEventFeedback] = useState({ type: "", text: "" })

  const [orgTitle, setOrgTitle] = useState("")
  const [orgBody, setOrgBody] = useState("")
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgFeedback, setOrgFeedback] = useState({ type: "", text: "" })

  const [pushUserId, setPushUserId] = useState("")
  const [pushTitle, setPushTitle] = useState("")
  const [pushMessage, setPushMessage] = useState("")
  const [pushLoading, setPushLoading] = useState(false)
  const [pushFeedback, setPushFeedback] = useState({ type: "", text: "" })

  useEffect(() => {
    Promise.all([
      api.get("/user-segments").then((r) => r.data).catch(() => []),
      api.get("/events/organization/my-events").then((r) => r.data).catch(() => []),
    ]).then(([seg, ev]) => {
      setSegments(Array.isArray(seg) ? seg : [])
      setEvents(Array.isArray(ev) ? ev : [])
      setLoading(false)
    })
  }, [])

  const addSegment = async (e) => {
    e.preventDefault()
    try {
      await api.post("/user-segments", { name: segmentForm.name })
      setSegmentForm({ name: "" })
      const { data } = await api.get("/user-segments")
      setSegments(Array.isArray(data) ? data : [])
    } catch (err) {
      alert(err.response?.data?.message || "حدث خطأ")
    }
  }

  const assignUserToSegment = async (e) => {
    e.preventDefault()
    setAssignStatus("")
    try {
      await api.post(`/user-segments/${assignSegment.segmentId}/users/${assignSegment.userId}`)
      setAssignStatus("تم إضافة المسافر للفئة بنجاح")
      setAssignSegment({ segmentId: "", userId: "" })
    } catch (err) {
      setAssignStatus(err.response?.data?.message || "فشل التوزيع")
    }
  }

  const sendInAppForEvent = async (e) => {
    e.preventDefault()
    setEventFeedback({ type: "", text: "" })
    const t = eventTitle.trim()
    const b = eventBody.trim()
    if (!eventId || !t || !b) {
      setEventFeedback({ type: "err", text: "اختر رحلة وأدخل العنوان والنص." })
      return
    }
    setEventLoading(true)
    try {
      const { data } = await api.post(`/notifications/in-app/event/${eventId}`, {
        title: t,
        body: b,
      })
      setEventFeedback({ type: "ok", text: formatNotifyResponse(data) })
      setEventTitle("")
      setEventBody("")
    } catch (err) {
      setEventFeedback({
        type: "err",
        text: err.response?.data?.message ?? err.response?.data?.title ?? "فشل الإرسال",
      })
    } finally {
      setEventLoading(false)
    }
  }

  const sendInAppForOrganization = async (e) => {
    e.preventDefault()
    setOrgFeedback({ type: "", text: "" })
    const t = orgTitle.trim()
    const b = orgBody.trim()
    if (!t || !b) {
      setOrgFeedback({ type: "err", text: "أدخل العنوان والنص." })
      return
    }
    setOrgLoading(true)
    try {
      const { data } = await api.post("/notifications/in-app/organization", {
        title: t,
        body: b,
      })
      setOrgFeedback({ type: "ok", text: formatNotifyResponse(data) })
      setOrgTitle("")
      setOrgBody("")
    } catch (err) {
      setOrgFeedback({
        type: "err",
        text: err.response?.data?.message ?? err.response?.data?.title ?? "فشل الإرسال",
      })
    } finally {
      setOrgLoading(false)
    }
  }

  const sendPushToUser = async (e) => {
    e.preventDefault()
    setPushFeedback({ type: "", text: "" })
    const uid = pushUserId.trim()
    const t = pushTitle.trim()
    const m = pushMessage.trim()
    if (!uid || !t || !m) {
      setPushFeedback({ type: "err", text: "أدخل معرّف المستخدم والعنوان والرسالة." })
      return
    }
    setPushLoading(true)
    try {
      await api.post(`/notifications/push/${encodeURIComponent(uid)}`, {
        title: t,
        message: m,
      })
      setPushFeedback({ type: "ok", text: "تم الطلب — قد يُسجَّل فقط في الخادم حتى تفعيل FCM." })
      setPushTitle("")
      setPushMessage("")
    } catch (err) {
      setPushFeedback({
        type: "err",
        text: err.response?.data?.message ?? err.response?.data?.title ?? "فشل الطلب",
      })
    } finally {
      setPushLoading(false)
    }
  }

  if (loading) {
    return <DashboardPageSkeleton />
  }

  const assignErr = assignStatus && !assignStatus.includes("نجاح")

  return (
    <div className="space-y-10 pb-4">
      <MotionSection delay={0.04}>
        <StaggerList className="grid gap-3 sm:grid-cols-3">
          <StaggerItem>
        <div
          className={`${cardShell} flex items-center gap-4 px-4 py-4`}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100">
            <Tags className="size-5 text-teal-800" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              {formatCountEn(segments.length)}
            </p>
            <p className="text-[13px] text-slate-500">فئة مسجّلة</p>
          </div>
        </div>
          </StaggerItem>
          <StaggerItem>
        <div className={`${cardShell} flex items-center gap-4 px-4 py-4`}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
            <Sparkles className="size-5 text-sky-800" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              {formatCountEn(events.length)}
            </p>
            <p className="text-[13px] text-slate-500">رحلة لربط الإشعارات</p>
          </div>
        </div>
          </StaggerItem>
          <StaggerItem>
        <div className={`${cardShell} flex items-center gap-4 px-4 py-4 sm:col-span-1`}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200/80">
            <Bell className="size-5 text-slate-700" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-medium leading-snug text-slate-700">إشعارات in-app</p>
            <p className="text-[13px] text-slate-500">عنوان + نص لكل إرسال</p>
          </div>
        </div>
          </StaggerItem>
        </StaggerList>
      </MotionSection>

      <MotionSection delay={0.06} className="space-y-4" aria-labelledby="segments-heading">
        <h2 id="segments-heading" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          الفئات والتوزيع
        </h2>
        <Card className={cardShell}>
          <CardHeader className="border-b border-slate-100/80 pb-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/80 ring-1 ring-teal-100">
                <Users className="size-6 text-teal-900" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="text-lg font-semibold text-slate-900">فئات الحضور (Segments)</CardTitle>
                <CardDescription className="text-[13px] leading-relaxed text-slate-500">
                  تصنيفات مثل VIP ثم ربط مسافر بمعرّف المستخدم.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <form onSubmit={addSegment} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="seg-name" className="text-[13px] text-slate-600">
                  اسم فئة جديدة
                </Label>
                <Input
                  id="seg-name"
                  placeholder="مثال: VIP"
                  value={segmentForm.name}
                  onChange={(e) => setSegmentForm({ name: e.target.value })}
                  required
                  className="h-11 rounded-xl border-slate-200/90 bg-white"
                />
              </div>
              <Button
                type="submit"
                className={`h-11 shrink-0 rounded-xl bg-teal-800 px-6 hover:bg-teal-900 ${btnTap}`}
              >
                <Plus className="ms-2 size-4" strokeWidth={2} />
                إضافة
              </Button>
            </form>

            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-1">
              <ul className="divide-y divide-slate-100/90 rounded-lg">
                {segments.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors duration-200 ease-in-out first:rounded-t-lg last:rounded-b-lg hover:bg-white/80"
                  >
                    <span className="font-medium text-slate-800">{s.name || s.title || "—"}</span>
                    <span className="tabular-nums text-xs text-slate-400">#{s.id}</span>
                  </li>
                ))}
              </ul>
              {segments.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-slate-500">لا توجد فئات بعد — أضف أول فئة أعلاه.</p>
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white p-4 sm:p-5">
              <p className="mb-3 text-[13px] font-medium text-slate-700">توزيع مسافر على فئة</p>
              <form onSubmit={assignUserToSegment} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[13px] text-slate-600">الفئة</Label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-800/25"
                      value={assignSegment.segmentId}
                      onChange={(e) => setAssignSegment((x) => ({ ...x, segmentId: e.target.value }))}
                      required
                    >
                      <option value="">اختر فئة…</option>
                      {segments.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.title || "—"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-slate-600">معرّف المستخدم</Label>
                    <Input
                      placeholder="userId"
                      value={assignSegment.userId}
                      onChange={(e) => setAssignSegment((x) => ({ ...x, userId: e.target.value }))}
                      required
                      className="h-11 rounded-xl border-slate-200/90 font-mono text-sm tabular-nums"
                    />
                  </div>
                </div>
                <Button type="submit" variant="secondary" className={`w-full rounded-xl sm:w-auto ${btnTap}`}>
                  ربط المسافر بالفئة
                </Button>
                {assignStatus && (
                  <Feedback type={assignErr ? "err" : "ok"}>{assignStatus}</Feedback>
                )}
              </form>
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.08} className="space-y-4" aria-labelledby="notify-heading">
        <h2 id="notify-heading" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          إشعارات الميني أب
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className={`${cardShell} overflow-hidden border-teal-100/80`}>
            <div className="h-1 bg-gradient-to-l from-teal-600/90 to-teal-500/70" aria-hidden />
            <CardHeader className="pb-2 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100">
                  <Bell className="size-5 text-teal-800" strokeWidth={1.75} />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">حاملو تذاكر رحلة</CardTitle>
                  <CardDescription className="mt-1 text-[13px] leading-relaxed text-slate-500">
                    يصل الإشعار لمن لديهم تذكرة لهذه الرحلة فقط.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={sendInAppForEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[13px] text-slate-600">الرحلة</Label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-800/25"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    required
                  >
                    <option value="">اختر رحلة…</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title || ev.name || "بدون عنوان"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-slate-600">العنوان</Label>
                  <Input
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="h-11 rounded-xl border-slate-200/90"
                    placeholder="عنوان قصير"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-slate-600">النص</Label>
                  <textarea
                    value={eventBody}
                    onChange={(e) => setEventBody(e.target.value)}
                    rows={4}
                    className={textareaClass}
                    placeholder="نص الإشعار…"
                    maxLength={4000}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={eventLoading}
                  className={`h-11 w-full rounded-xl bg-teal-800 text-[15px] font-medium hover:bg-teal-900 ${btnTap}`}
                >
                  {eventLoading ? "جاري الإرسال…" : "إرسال الإشعار"}
                </Button>
                {eventFeedback.text && <Feedback type={eventFeedback.type}>{eventFeedback.text}</Feedback>}
              </form>
            </CardContent>
          </Card>

          <Card className={`${cardShell} overflow-hidden border-slate-200`}>
            <div className="h-1 bg-gradient-to-l from-slate-700 to-slate-500" aria-hidden />
            <CardHeader className="pb-2 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200/80">
                  <Bell className="size-5 text-slate-800" strokeWidth={1.75} />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">مشترو من منظمتكم</CardTitle>
                  <CardDescription className="mt-1 text-[13px] leading-relaxed text-slate-500">
                    لمن اشترَوا من أي فعالية تابعة لمنظمتكم.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={sendInAppForOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[13px] text-slate-600">العنوان</Label>
                  <Input
                    value={orgTitle}
                    onChange={(e) => setOrgTitle(e.target.value)}
                    className="h-11 rounded-xl border-slate-200/90"
                    placeholder="عنوان قصير"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-slate-600">النص</Label>
                  <textarea
                    value={orgBody}
                    onChange={(e) => setOrgBody(e.target.value)}
                    rows={4}
                    className={textareaClass}
                    placeholder="نص الإشعار…"
                    maxLength={4000}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={orgLoading}
                  className={`h-11 w-full rounded-xl bg-slate-900 text-[15px] font-medium hover:bg-slate-800 ${btnTap}`}
                >
                  {orgLoading ? "جاري الإرسال…" : "إرسال للمنظمة"}
                </Button>
                {orgFeedback.text && <Feedback type={orgFeedback.type}>{orgFeedback.text}</Feedback>}
              </form>
            </CardContent>
          </Card>
        </div>

        <Card
          className={`${cardShell} border-dashed border-slate-200/90 bg-slate-50/40`}
        >
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white">
                <Send className="size-5 text-slate-600" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-semibold text-slate-900">Push — مستخدم محدد</CardTitle>
                <CardDescription className="mt-1 text-[13px] text-slate-500">
                  اختياري؛ غالباً تسجيل في الخادم حتى يفعّل FCM لاحقاً.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendPushToUser} className="grid gap-4 md:grid-cols-2 md:items-end">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[13px] text-slate-600">معرّف المستخدم</Label>
                <Input
                  value={pushUserId}
                  onChange={(e) => setPushUserId(e.target.value)}
                  className="h-11 rounded-xl border-slate-200/90 bg-white font-mono text-sm tabular-nums"
                  placeholder="userId"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-slate-600">العنوان</Label>
                <Input
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  className="h-11 rounded-xl border-slate-200/90 bg-white"
                  maxLength={500}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[13px] text-slate-600">الرسالة</Label>
                <textarea
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  rows={3}
                  className={textareaClass + " min-h-[80px] bg-white"}
                  maxLength={2000}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={pushLoading}
                  variant="outline"
                  className={`h-11 rounded-xl border-slate-300/90 bg-white hover:bg-slate-50 ${btnTap}`}
                >
                  {pushLoading ? "جاري الإرسال…" : "إرسال Push"}
                </Button>
                {pushFeedback.text && (
                  <div className="mt-3">
                    <Feedback type={pushFeedback.type}>{pushFeedback.text}</Feedback>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </MotionSection>
    </div>
  )
}
