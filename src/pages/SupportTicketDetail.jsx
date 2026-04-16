import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { MotionHeader, MotionSection, MotionSurface } from "../components/motion"
import { TicketsDetailSkeleton } from "../components/motion/TicketsSkeleton"
import { formatDateTimeEn } from "../utils/formatEn"
import { getSupportTicket } from "../api/supportTickets"
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Ticket,
  Shield,
  Building2,
} from "lucide-react"
import { EASE } from "../lib/motion-variants"
import { motion, useReducedMotion } from "framer-motion"
import MessageBubble from "../components/support/MessageBubble"
import StatusBadge, { normalizeStatus, formatStatusArabic } from "../components/support/StatusBadge"
import PriorityBadge from "../components/support/PriorityBadge"
import { TicketLifecyclePipeline } from "../components/support/TicketLifecyclePipeline"

function extractArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    return value.items ?? value.messages ?? value.replies ?? value.thread ?? []
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

function messageIsAdmin(m) {
  const senderType = String(pickFirst(m, ["senderType", "SenderType", "authorType", "AuthorType"]) ?? "")
  const role = String(pickFirst(m, ["role", "Role"]) ?? "").toLowerCase()
  if (senderType === "2" || senderType === "Admin" || senderType.toLowerCase().includes("admin")) return true
  if (role.includes("admin") || role.includes("support") || role.includes("agent")) return true
  return false
}

export default function SupportTicketDetail() {
  const { ticketId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)

  const reduce = useReducedMotion()

  const load = async (id) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSupportTicket(id)
      setTicket(data)
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل تفاصيل التذكرة")
      setTicket(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketId) load(ticketId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  const thread = useMemo(() => {
    if (!ticket) return []
    return extractArray(ticket.thread || ticket.messages || ticket.replies || ticket.adminMessages)
  }, [ticket])

  const ticketBody = useMemo(() => {
    if (!ticket) return ""
    return pickFirst(ticket, ["body", "Body", "description", "Description", "content", "Content"]) ?? ""
  }, [ticket])

  const subject = useMemo(() => {
    if (!ticket) return ""
    return pickFirst(ticket, ["subject", "Subject", "title", "Title"]) ?? "بدون عنوان"
  }, [ticket])

  const mainStatusRaw = useMemo(
    () => pickFirst(ticket, ["ticketStatus", "TicketStatus", "status", "Status"]),
    [ticket]
  )

  const orgStatusRaw = useMemo(
    () =>
      pickFirst(ticket, [
        "organizationVisibleStatus",
        "OrganizationVisibleStatus",
        "requesterVisibleStatus",
        "RequesterVisibleStatus",
        "customerFacingStatus",
        "CustomerFacingStatus",
        "clientStatus",
        "ClientStatus",
      ]),
    [ticket]
  )

  const adminStatusRaw = useMemo(
    () =>
      pickFirst(ticket, [
        "adminStatus",
        "AdminStatus",
        "internalStatus",
        "InternalStatus",
        "supportTeamStatus",
        "SupportTeamStatus",
        "platformStatus",
        "PlatformStatus",
      ]),
    [ticket]
  )

  const mainStatus = useMemo(() => normalizeStatus(mainStatusRaw), [mainStatusRaw])
  const orgStatus = useMemo(
    () => normalizeStatus(orgStatusRaw ?? mainStatusRaw),
    [orgStatusRaw, mainStatusRaw]
  )
  const adminStatus = useMemo(
    () => normalizeStatus(adminStatusRaw ?? mainStatusRaw),
    [adminStatusRaw, mainStatusRaw]
  )

  const statusMismatch = orgStatus !== adminStatus

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <MotionHeader>
          <header className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => navigate("/support")}
              aria-label="رجوع"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <p className="text-sm text-slate-500">جارٍ التحميل…</p>
            </div>
          </header>
        </MotionHeader>
        <TicketsDetailSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <MotionHeader>
          <header className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => navigate("/support")}
              aria-label="رجوع"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          </header>
        </MotionHeader>
      </div>
    )
  }

  const priority = pickFirst(ticket, ["priority", "Priority"]) ?? "Medium"
  const createdAt = pickFirst(ticket, ["createdAt", "CreatedAt", "created_at", "Created_At"])
  const updatedAt = pickFirst(ticket, ["updatedAt", "UpdatedAt", "lastMessageAt", "LastMessageAt"])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-8" dir="rtl">
      <MotionHeader>
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-l from-white via-slate-50/60 to-teal-50/25 px-3 py-3 sm:px-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={() => navigate("/support")}
                aria-label="رجوع إلى التذاكر"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">تذكرة دعم</p>
                <p className="font-mono text-xs text-slate-500">#{ticketId}</p>
                <h1 className="mt-1 text-balance text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{subject}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={mainStatus} />
                  <PriorityBadge priority={priority} />
                  {mainStatus === "Closed" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-200/90 bg-teal-50/70 px-2.5 py-0.5 text-[11px] font-semibold text-teal-900">
                      <CheckCircle2 className="size-3.5" aria-hidden />
                      مغلقة
                    </span>
                  )}
                </div>
              </div>
            </div>
          </header>
        </div>
      </MotionHeader>

      <MotionSection aria-label="مسار الحالة">
        <MotionSurface>
          <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-sm ring-1 ring-slate-900/[0.04]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Ticket className="size-5 text-teal-800" strokeWidth={1.75} aria-hidden />
                حالة التذكرة
              </CardTitle>
              <CardDescription className="text-[13px] leading-relaxed">
                نفس الحالة تُدار من لوحة السوبر أدمن؛ أدناه عرض موحّد، وإن فرّق الخادم بين عرض المنظمة وعرض الإدارة يظهران
                جنباً إلى جنب.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <TicketLifecyclePipeline status={mainStatus} disabled heading="مسار معالجة التذكرة" />

              {statusMismatch ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Building2 className="size-4 text-teal-700" aria-hidden />
                      عرض المنظمة
                    </div>
                    <StatusBadge status={orgStatus} />
                    <p className="mt-2 text-[11px] text-slate-500">ما يخص واجهة حسابكم عند توفر حقل مستقل من الخادم.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Shield className="size-4 text-sky-700" aria-hidden />
                      لوحة الإدارة
                    </div>
                    <StatusBadge status={adminStatus} />
                    <p className="mt-2 text-[11px] text-slate-500">حالة العمل في فريق الدعم عند توفر حقل مستقل.</p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-[12px] text-slate-500">
                  الحالة المعروضة: <span className="font-semibold text-slate-700">{formatStatusArabic(mainStatusRaw)}</span>
                  — موحّدة لعرض المنظمة ولوحة الإدارة ما لم يفرّق الخادم بينهما.
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
                {createdAt && (
                  <span>
                    الإنشاء: <span className="font-medium text-slate-700">{formatDateTimeEn(createdAt)}</span>
                  </span>
                )}
                {updatedAt && (
                  <span>
                    آخر تحديث: <span className="font-medium text-slate-700">{formatDateTimeEn(updatedAt)}</span>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </MotionSurface>
      </MotionSection>

      <MotionSection aria-label="محتوى التذكرة">
        <Card className="rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <MessageCircle className="size-5 text-teal-800" strokeWidth={1.75} aria-hidden />
              الرسالة والردود
            </CardTitle>
            <CardDescription className="text-[13px]">
              رسالتكم الأصلية ثم ردود فريق الدعم عند توفرها.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">رسالتكم</p>
                <div className="rounded-2xl border border-teal-100/80 bg-teal-50/60 p-4 text-sm leading-relaxed text-slate-900">
                  {ticketBody || "—"}
                </div>
              </div>

              {thread.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
                  لا توجد ردود من فريق الدعم حتى الآن. سنُظهر الرسائل هنا عند الرد.
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-slate-500">المحادثة</p>
                  <div className="flex flex-col gap-4">
                    {thread.map((m, i) => {
                      const body = pickFirst(m, ["body", "Body", "message", "Message", "content", "Content"]) ?? ""
                      const at = pickFirst(m, ["createdAt", "CreatedAt", "sentAt", "SentAt", "timestamp", "Timestamp"])
                      const isAdmin = messageIsAdmin(m)
                      return (
                        <motion.div
                          key={pickFirst(m, ["id", "Id"]) || i}
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduce ? 0 : 0.22, ease: EASE, delay: i * 0.03 }}
                        >
                          <MessageBubble body={body} timestamp={at} isAdmin={isAdmin} />
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </MotionSection>
    </div>
  )
}
