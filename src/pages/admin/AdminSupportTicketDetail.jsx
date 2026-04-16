import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { MotionSection } from "../../components/motion"
import { TicketsDetailSkeleton } from "../../components/motion/TicketsSkeleton"
import {
  closeAdminSupportTicket,
  getAdminSupportTicket,
  postAdminSupportMessage,
  updateAdminSupportTicketStatus,
} from "../../api/supportTickets"
import {
  ArrowLeft,
  Paperclip,
  Send,
  LayoutGrid,
  MessageSquare,
  History,
  Ticket,
  User,
  Building2,
  Clock,
  Shield,
  ExternalLink,
} from "lucide-react"
import { EASE } from "../../lib/motion-variants"
import { useReducedMotion } from "framer-motion"
import MessageBubble from "../../components/support/MessageBubble"
import { normalizeStatus } from "../../components/support/StatusBadge"
import PriorityBadge from "../../components/support/PriorityBadge"
import StatusBadge from "../../components/support/StatusBadge"
import { TicketLifecyclePipeline, toApiTicketStatus } from "../../components/support/TicketLifecyclePipeline"
import { adminCardClass, adminIconBox, adminPageError, adminBtnPrimary } from "../../lib/admin-ui"
import { cn } from "../../lib/utils.mjs"
import { formatDateTimeEn } from "../../utils/formatEn"

function extractArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    return value.items ?? value.messages ?? value.replies ?? value.thread ?? value.history ?? []
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

const DETAIL_TABS = [
  { id: "overview", label: "نظرة عامة", Icon: LayoutGrid },
  { id: "conversation", label: "المحادثة", Icon: MessageSquare },
  { id: "history", label: "السجل", Icon: History },
  { id: "attachments", label: "المرفقات", Icon: Paperclip },
]

function buildHistoryEntries(ticket, thread, ticketBody, createdAt) {
  const rows = []

  if (createdAt) {
    rows.push({
      id: "evt-created",
      kind: "event",
      at: createdAt,
      title: "إنشاء التذكرة",
      detail: ticketBody ? String(ticketBody).slice(0, 160) + (String(ticketBody).length > 160 ? "…" : "") : "تم فتح طلب الدعم",
    })
  }

  const rawHistory = extractArray(
    pickFirst(ticket, ["history", "History", "statusHistory", "StatusHistory", "auditTrail", "AuditTrail"]) ?? []
  )
  rawHistory.forEach((h, i) => {
    const at = pickFirst(h, ["at", "At", "createdAt", "CreatedAt", "timestamp", "Timestamp"])
    const title =
      pickFirst(h, ["title", "Title", "action", "Action", "description", "Description"]) ?? "حدث في التذكرة"
    const detail = pickFirst(h, ["detail", "Detail", "body", "Body", "message", "Message"]) ?? ""
    if (at) {
      rows.push({
        id: pickFirst(h, ["id", "Id"]) ?? `hist-${i}`,
        kind: "audit",
        at,
        title: String(title),
        detail: String(detail),
      })
    }
  })

  thread.forEach((m, i) => {
    const body = pickFirst(m, ["body", "Body", "message", "Message", "content", "Content"]) ?? ""
    const at = pickFirst(m, ["createdAt", "CreatedAt", "sentAt", "SentAt", "timestamp", "Timestamp"])
    const senderType = String(pickFirst(m, ["senderType", "SenderType"]) ?? "")
    const isAdmin = senderType === "2" || senderType.toLowerCase().includes("admin")
    if (at) {
      rows.push({
        id: pickFirst(m, ["id", "Id"]) ?? `msg-${i}`,
        kind: "message",
        at,
        title: isAdmin ? "رد من فريق الدعم" : "رسالة من المستخدم",
        detail: body,
      })
    }
  })

  rows.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  return rows
}

export default function AdminSupportTicketDetail() {
  const { ticketId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [ticket, setTicket] = useState(null)

  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  const reduce = useReducedMotion()

  const load = async (id) => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getAdminSupportTicket(id)
      setTicket(data)
    } catch (e) {
      setFetchError(e?.response?.data?.message || "تعذر تحميل تفاصيل التذكرة")
      setTicket(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketId) load(ticketId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  const subject = useMemo(() => {
    if (!ticket) return ""
    return pickFirst(ticket, ["subject", "Subject", "title", "Title"]) ?? "بدون عنوان"
  }, [ticket])

  const status = useMemo(
    () =>
      normalizeStatus(
        pickFirst(ticket, ["statusLabel", "StatusLabel", "ticketStatus", "TicketStatus", "status", "Status"])
      ),
    [ticket]
  )

  const priority = useMemo(() => pickFirst(ticket, ["priority", "Priority"]) ?? "Medium", [ticket])
  const createdAt = useMemo(
    () => pickFirst(ticket, ["createdAt", "CreatedAt", "created_at", "Created_At"]),
    [ticket]
  )

  const thread = useMemo(() => {
    if (!ticket) return []
    return extractArray(ticket.thread || ticket.messages || ticket.replies || ticket.adminMessages)
  }, [ticket])

  const ticketBody = useMemo(() => {
    if (!ticket) return ""
    return pickFirst(ticket, ["body", "Body", "description", "Description", "content", "Content"]) ?? ""
  }, [ticket])

  const attachments = useMemo(() => {
    if (!ticket) return []
    return extractArray(
      pickFirst(ticket, ["attachments", "Attachments", "files", "Files", "documents", "Documents"]) ?? []
    )
  }, [ticket])

  const historyEntries = useMemo(
    () => buildHistoryEntries(ticket, thread, ticketBody, createdAt),
    [ticket, thread, ticketBody, createdAt]
  )

  const ownerName =
    pickFirst(ticket, [
      "ownerName",
      "OwnerName",
      "requesterName",
      "RequesterName",
      "createdByName",
      "CreatedByName",
    ]) || "—"
  const identityType = pickFirst(ticket, ["identityType", "IdentityType"]) || "User"
  const lastReplyAt = pickFirst(ticket, ["lastMessageAt", "LastMessageAt", "updatedAt", "UpdatedAt"])

  const disabled = status === "Closed" || closing || sending || changingStatus

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!ticketId || disabled) return
    const text = message.trim()
    if (text.length < 3) return

    setSending(true)
    setActionError(null)
    try {
      await postAdminSupportMessage({ id: ticketId, body: text })
      setMessage("")
      await load(ticketId)
    } catch (e2) {
      setActionError(e2?.response?.data?.message || "تعذر إرسال الرد")
    } finally {
      setSending(false)
    }
  }

  const closeTicket = async () => {
    if (!ticketId || status === "Closed" || closing) return
    const ok = window.confirm("هل تريد إغلاق التذكرة؟")
    if (!ok) return

    setClosing(true)
    setActionError(null)
    try {
      await closeAdminSupportTicket(ticketId)
      await load(ticketId)
    } catch (e) {
      setActionError(e?.response?.data?.message || "تعذر إغلاق التذكرة")
    } finally {
      setClosing(false)
    }
  }

  const setStatus = async (nextStatus) => {
    if (!ticketId || !nextStatus || changingStatus) return
    setChangingStatus(true)
    setActionError(null)
    try {
      await updateAdminSupportTicketStatus({ id: ticketId, status: toApiTicketStatus(nextStatus) })
      await load(ticketId)
    } catch (e) {
      setActionError(e?.response?.data?.message || "تعذر تحديث حالة التذكرة")
    } finally {
      setChangingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => navigate("/admin/support")}
            aria-label="رجوع"
          >
            <ArrowLeft className="size-4" />
          </Button>
        </div>
        <TicketsDetailSkeleton />
      </div>
    )
  }

  if (!ticket && fetchError) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => navigate("/admin/support")}
            aria-label="رجوع"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <p className="text-sm text-rose-600">{fetchError}</p>
        </div>
      </div>
    )
  }

  if (!ticket) return null

  return (
    <div className="space-y-5 pb-28" dir="rtl">
      <div className="rounded-2xl border border-slate-200/75 bg-gradient-to-l from-white via-slate-50/70 to-sky-50/35 px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => navigate("/admin/support")}
          aria-label="رجوع إلى قائمة التذاكر"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">تذكرة دعم</p>
          <p className="font-mono text-sm font-semibold text-brand-navy">#{ticketId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <PriorityBadge priority={priority} />
        </div>
      </div>
      </div>

      {actionError && <div className={adminPageError}>{actionError}</div>}

      {/* Hero: lifecycle + title */}
      <MotionSection aria-label="رأس التذكرة">
        <div className={`${adminCardClass} overflow-hidden p-4 sm:p-6`}>
          <TicketLifecyclePipeline
            status={status}
            onSelectStep={setStatus}
            disabled={disabled}
            busy={changingStatus}
          />
          <div className="mt-6 grid gap-4 border-t border-slate-200/80 pt-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h1 className="text-balance text-xl font-bold leading-snug text-brand-navy sm:text-2xl md:text-3xl">
                {subject}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  {String(identityType).toLowerCase().includes("org") ? (
                    <Building2 className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <User className="size-3.5 shrink-0" aria-hidden />
                  )}
                  {ownerName}
                </span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden />
                  {createdAt ? formatDateTimeEn(createdAt) : "—"}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/65 p-3.5">
              <p className="mb-2 text-xs font-semibold text-slate-500">ملخص الحالة</p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <PriorityBadge priority={priority} />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                آخر نشاط: <span className="font-medium text-slate-700">{lastReplyAt ? formatDateTimeEn(lastReplyAt) : "—"}</span>
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-200/80 pt-5">
            <div className="mb-4 rounded-xl border border-slate-200/75 bg-gradient-to-b from-slate-50/90 to-white p-1.5 sm:p-2">
              <div
                className="flex flex-wrap gap-1 sm:grid sm:grid-cols-4 sm:gap-1"
                role="tablist"
                aria-label="أقسام التذكرة"
              >
                {DETAIL_TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all sm:min-h-0",
                      activeTab === id
                        ? "bg-white text-brand-navy shadow-sm ring-1 ring-slate-900/[0.06]"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-0 sm:px-1">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="rounded-2xl border-slate-200/80 bg-gradient-to-b from-white to-slate-50/45 shadow-none ring-1 ring-slate-900/[0.04]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div className={adminIconBox}>
                            <Shield className="size-4" strokeWidth={1.75} />
                          </div>
                          <CardTitle className="text-base font-semibold text-brand-navy">الحالة والأولوية</CardTitle>
                        </div>
                        <CardDescription className="text-[13px]">تحديث الحالة من مسار التذكرة أعلاه، أو من هنا.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2 pt-0">
                        <StatusBadge status={status} />
                        <PriorityBadge priority={priority} />
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200/80 bg-gradient-to-b from-white to-slate-50/45 shadow-none ring-1 ring-slate-900/[0.04] lg:col-span-2">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div className={adminIconBox}>
                            <Ticket className="size-4" strokeWidth={1.75} />
                          </div>
                          <CardTitle className="text-base font-semibold text-brand-navy">بيانات سريعة</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                          <span className="text-slate-500">المالك</span>
                          <span className="font-medium text-slate-800">{ownerName}</span>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                          <span className="text-slate-500">نوع الحساب</span>
                          <span className="font-medium text-slate-800">{identityType}</span>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                          <span className="text-slate-500">آخر نشاط</span>
                          <span className="font-medium text-slate-800">
                            {lastReplyAt ? formatDateTimeEn(lastReplyAt) : "—"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-brand-navy">وصف الطلب</h3>
                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/70 to-white p-4 text-sm leading-relaxed text-slate-700">
                      {ticketBody || "—"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={disabled || closing}
                      onClick={closeTicket}
                      className="rounded-xl"
                    >
                      {closing ? "جارٍ الإغلاق..." : "إغلاق التذكرة"}
                    </Button>
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setActiveTab("conversation")}>
                      الانتقال إلى المحادثة
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "conversation" && (
                <div className="space-y-4">
                  <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
                    <MessageBubble body={ticketBody} timestamp={createdAt} isAdmin={false} />
                    {thread.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white/60 p-8 text-center text-sm text-slate-500">
                        لا توجد ردود بعد — اكتب أول رد أدناه.
                      </div>
                    ) : (
                      thread.map((m, i) => {
                        const body = pickFirst(m, ["body", "Body", "message", "Message", "content", "Content"]) ?? ""
                        const at = pickFirst(m, ["createdAt", "CreatedAt", "sentAt", "SentAt", "timestamp", "Timestamp"])
                        const senderType = String(pickFirst(m, ["senderType", "SenderType"]) ?? "")
                        const isAdmin = senderType === "2" || senderType.toLowerCase().includes("admin")
                        return (
                          <motion.div
                            key={pickFirst(m, ["id", "Id"]) || i}
                            initial={reduce ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: reduce ? 0 : 0.22, ease: EASE, delay: i * 0.02 }}
                          >
                            <MessageBubble body={body} timestamp={at} isAdmin={isAdmin} />
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-3">
                  {historyEntries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 py-12 text-center text-sm text-slate-500">
                      لا يوجد سجل زمني بعد.
                    </div>
                  ) : (
                    <ul className="relative space-y-0 border-s border-teal-600/25 pe-6">
                      {historyEntries.map((row) => (
                        <li key={row.id} className="relative pb-6 last:pb-0">
                          <span
                            className="absolute -end-[5px] top-1.5 size-2.5 rounded-full bg-teal-600 ring-4 ring-teal-600/15"
                            aria-hidden
                          />
                          <p className="text-[11px] font-medium text-slate-500">{formatDateTimeEn(row.at)}</p>
                          <p className="mt-0.5 font-semibold text-brand-navy">{row.title}</p>
                          {row.detail ? (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{row.detail}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === "attachments" && (
                <div>
                  {attachments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 py-14 text-center">
                      <Paperclip className="mx-auto size-10 text-slate-300" aria-hidden />
                      <p className="mt-3 text-sm text-slate-500">لا توجد مرفقات مسجّلة لهذه التذكرة.</p>
                      <p className="mt-1 text-xs text-slate-400">إن وفر الخادم حقول المرفقات ستظهر هنا تلقائياً.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white/90">
                      {attachments.map((a, i) => {
                        const name =
                          pickFirst(a, ["fileName", "FileName", "name", "Name", "title", "Title"]) ?? `مرفق ${i + 1}`
                        const url = pickFirst(a, ["url", "Url", "downloadUrl", "DownloadUrl", "href", "Href", "fileUrl", "FileUrl"])
                        return (
                          <li key={pickFirst(a, ["id", "Id"]) ?? i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <span className="min-w-0 truncate text-sm font-medium text-slate-800">{name}</span>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
                              >
                                فتح
                                <ExternalLink className="size-3.5" aria-hidden />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">لا رابط</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </MotionSection>

      {activeTab === "conversation" && (
        <div className="fixed bottom-3 left-3 right-3 z-20 md:left-6 md:right-6">
          <Card className="rounded-2xl border-slate-200/90 bg-white/95 shadow-lg ring-1 ring-slate-900/[0.04] backdrop-blur">
            <CardContent className="p-3">
              <form onSubmit={sendMessage} className="flex items-end gap-2">
                <Button type="button" variant="outline" size="icon" className="rounded-xl" disabled title="قريباً">
                  <Paperclip className="size-4" aria-hidden />
                </Button>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="اكتب رد فريق الدعم..."
                  disabled={disabled}
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-800/25 disabled:opacity-70"
                />
                <Button
                  type="submit"
                  disabled={disabled || message.trim().length < 3}
                  className={`rounded-xl ${adminBtnPrimary}`}
                >
                  {sending ? "جارٍ الإرسال..." : "إرسال"}
                  <Send className="ms-2 size-4" aria-hidden />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
