import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  MotionSection,
  MotionSurface,
  StaggerItem,
  StaggerList,
} from "../components/motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { formatDateTimeEn } from "../utils/formatEn"
import { TicketsListSkeleton } from "../components/motion/TicketsSkeleton"
import { createSupportTicket, listSupportTickets } from "../api/supportTickets"
import { formatStatusArabic, normalizeStatus } from "../components/support/StatusBadge"
import { AlertCircle, Plus, Ticket } from "lucide-react"

function extractArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    return value.items ?? value.tickets ?? value.data ?? []
  }
  return []
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

export default function SupportTickets() {
  const navigate = useNavigate()

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [priority, setPriority] = useState("Medium")

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listSupportTickets()
      const arr = extractArray(res)
      setTickets(arr)
    } catch (e) {
      setError(e?.response?.data?.message || "حدث خطأ أثناء تحميل التذاكر")
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = useMemo(() => subject.trim().length >= 2 && body.trim().length >= 5, [subject, body])

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit || creating) return

    setCreating(true)
    setSuccessMsg(null)
    setError(null)
    try {
      const created = await createSupportTicket({ subject: subject.trim(), body: body.trim(), priority })
      setSubject("")
      setBody("")
      setPriority("Medium")
      setSuccessMsg("تم إنشاء التذكرة. يمكنك متابعة الردود عبر التفاصيل.")
      await load()

      const createdId = pickFirst(created, ["id", "ticketId", "Id"])
      if (createdId) navigate(`/support/${createdId}`)
    } catch (e2) {
      setError(e2?.response?.data?.message || "تعذر إنشاء التذكرة")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6" dir="rtl">
        <TicketsListSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6" dir="rtl">
      {error && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-rose-200/90 bg-rose-50/60 px-4 py-3 text-sm text-rose-950"
          role="status"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-700" aria-hidden />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-teal-200/90 bg-teal-50/60 px-4 py-3 text-sm text-teal-950" role="status">
          {successMsg}
        </div>
      )}

      <MotionSection delay={0.04} aria-label="إنشاء تذكرة جديدة">
        <Card className="rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Plus className="size-5 text-teal-800" strokeWidth={1.75} aria-hidden />
              إنشاء تذكرة
            </CardTitle>
            <CardDescription className="text-[13px]">اكتب المشكلة/المعلومة ثم سنعرض الرد هنا.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="subject">عنوان المشكلة</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="مثال: مشكلة في الحجز"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="priority">الأولوية</Label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-800/25 disabled:opacity-70"
                    disabled={creating}
                  >
                    <option value="Low">منخفضة</option>
                    <option value="Medium">متوسطة</option>
                    <option value="High">عالية</option>
                    <option value="Critical">حرجة</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="body">تفاصيل الحالة</Label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="اكتب التفاصيل هنا…"
                  rows={4}
                  disabled={creating}
                  className="w-full resize-none rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-800/25 disabled:opacity-70"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={!canSubmit || creating} className="rounded-xl">
                  {creating ? "جاري الإنشاء..." : "إنشاء تذكرة"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.06} aria-label="قائمة التذاكر">
        <div className="flex items-center justify-end gap-2 text-sm text-slate-600">
          <Ticket className="size-4 text-slate-400" aria-hidden />
          <span className="tabular-nums">{tickets.length}</span>
        </div>

        {tickets.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/50 py-10 text-center text-sm text-slate-500">
            لا توجد تذاكر بعد. أنشئ تذكرة جديدة لبدء المتابعة.
          </div>
        ) : (
          <StaggerList className="mt-4 grid gap-3 md:grid-cols-2">
            {tickets.map((t) => {
              const id = pickFirst(t, ["id", "ticketId", "Id"])
              const lastAt = pickFirst(t, ["lastMessageAt", "LastMessageAt", "updatedAt", "UpdatedAt"])
              const subj = pickFirst(t, ["subject", "Subject", "title", "Title"]) || "بدون عنوان"
              const statusRaw = pickFirst(t, ["ticketStatus", "TicketStatus", "status", "Status"])
              const statusAr = formatStatusArabic(statusRaw)
              const statusNorm = normalizeStatus(statusRaw)
              return (
                <StaggerItem key={id || subj}>
                  <MotionSurface>
                    <button
                      type="button"
                      onClick={() => id && navigate(`/support/${id}`)}
                      disabled={!id}
                      className="w-full rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-left transition-colors duration-200 ease-out hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-teal-800/25 disabled:opacity-60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{subj}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            آخر تحديث: {lastAt ? formatDateTimeEn(lastAt) : "—"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            statusNorm === "Resolved"
                              ? "border-emerald-200/90 bg-emerald-50/80 text-emerald-900"
                              : statusNorm === "Pending" || statusNorm === "InProgress"
                                ? "border-amber-200/90 bg-amber-50/80 text-amber-900"
                                : statusNorm === "Closed"
                                  ? "border-rose-200/90 bg-rose-50/80 text-rose-900"
                                  : "border-slate-200/80 bg-slate-50/60 text-slate-800"
                          }`}
                        >
                          {statusAr}
                        </span>
                      </div>
                    </button>
                  </MotionSurface>
                </StaggerItem>
              )
            })}
          </StaggerList>
        )}
      </MotionSection>
    </div>
  )
}

