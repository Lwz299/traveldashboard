import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import api from "../api/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Calendar, CheckCircle2, Search, UserX, Users } from "lucide-react"
import { formatCountEn, formatDateTimeEn } from "../utils/formatEn"
import { EASE } from "../lib/motion-variants"
import { MotionSection, InlineDetailSkeleton, StackedRowsSkeleton } from "../components/motion"

const btnTap = "transition-transform duration-200 ease-in-out active:scale-[0.98]"

/** يتوافق مع الـ API: حاضر إذا isCheckedIn أو وجود وقت تسجيل */
function isRowPresent(row) {
  if (row.isCheckedIn === true) return true
  const t = row.checkedInAtUtc
  return t != null && String(t).trim() !== ""
}

export default function Attendance() {
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventId, setEventId] = useState("")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("all") // all | present | absent
  const [query, setQuery] = useState("")

  useEffect(() => {
    api
      .get("/events/organization/my-events")
      .then((r) => setEvents(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))
  }, [])

  useEffect(() => {
    if (!eventId) {
      setData(null)
      return
    }
    setError("")
    setLoading(true)
    api
      .get(`/tickets/event/${eventId}/attendance`)
      .then((r) => setData(r.data))
      .catch((err) => {
        setData(null)
        setError(
          err.response?.data?.message ??
            err.response?.data?.title ??
            "تعذر تحميل بيانات الحضور"
        )
      })
      .finally(() => setLoading(false))
  }, [eventId])

  const rows = Array.isArray(data?.rows) ? data.rows : []

  const filteredByTab = useMemo(() => {
    let list = rows
    if (tab === "present") list = rows.filter((r) => isRowPresent(r))
    if (tab === "absent") list = rows.filter((r) => !isRowPresent(r))
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const name = String(r.fullName ?? "").toLowerCase()
      const email = String(r.email ?? "").toLowerCase()
      const phone = String(r.phone ?? "").toLowerCase()
      const type = String(r.ticketTypeName ?? "").toLowerCase()
      return name.includes(q) || email.includes(q) || phone.includes(q) || type.includes(q)
    })
  }, [rows, tab, query])

  const stats = data
    ? {
        total: data.totalTickets ?? rows.length,
        checkedIn: data.checkedInCount ?? rows.filter(isRowPresent).length,
        absent: data.absentCount ?? rows.filter((r) => !isRowPresent(r)).length,
      }
    : null

  return (
    <div className="space-y-6">
      <MotionSection delay={0.04}>
        <Card className="transition-shadow duration-200 hover:shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            اختيار الفعالية
          </CardTitle>
          <CardDescription>جلب القائمة من الخادم بدون تقييد على الحاضرين فقط.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[240px] space-y-2">
            <Label>الرحلة / الفعالية</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value)
                setTab("all")
                setQuery("")
              }}
              disabled={eventsLoading}
            >
              <option value="">— اختر فعالية —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title ?? ev.name ?? `فعالية #${ev.id}`}
                </option>
              ))}
            </select>
          </div>
          {eventsLoading && <InlineDetailSkeleton rows={1} />}
        </CardContent>
      </Card>
      </MotionSection>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {eventId && loading && (
          <motion.div
            key="loading"
            role="status"
            aria-busy="true"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="py-4"
          >
            <StackedRowsSkeleton rows={6} />
          </motion.div>
        )}

        {eventId && !loading && data && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="space-y-6"
          >
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="transition-shadow duration-200 hover:shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي التذاكر</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCountEn(stats.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.eventTitle ?? "—"}</p>
              </CardContent>
            </Card>
            <Card className="border-green-200/60 bg-green-50/50 transition-shadow duration-200 hover:shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  حضر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-800">{formatCountEn(stats.checkedIn)}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200/60 bg-amber-50/50 transition-shadow duration-200 hover:shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-900">
                  <UserX className="size-4" />
                  لم يحضر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-900">{formatCountEn(stats.absent)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={tab === "all" ? "default" : "outline"}
                size="sm"
                className={btnTap}
                onClick={() => setTab("all")}
              >
                <Users className="size-4 ml-1" />
                الكل ({formatCountEn(rows.length)})
              </Button>
              <Button
                type="button"
                variant={tab === "present" ? "default" : "outline"}
                size="sm"
                className={btnTap}
                onClick={() => setTab("present")}
              >
                <CheckCircle2 className="size-4 ml-1" />
                الحاضرون ({formatCountEn(rows.filter(isRowPresent).length)})
              </Button>
              <Button
                type="button"
                variant={tab === "absent" ? "default" : "outline"}
                size="sm"
                className={btnTap}
                onClick={() => setTab("absent")}
              >
                <UserX className="size-4 ml-1" />
                غير الحاضرين ({formatCountEn(rows.filter((r) => !isRowPresent(r)).length)})
              </Button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم، البريد، الهاتف..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>

          <Card className="transition-shadow duration-200 hover:shadow-sm">
            <CardHeader>
              <CardTitle>قائمة التذاكر والحضور</CardTitle>
              <CardDescription>
                عرض {formatCountEn(filteredByTab.length)} صف{tab !== "all" ? ` (تبويب: ${tab === "present" ? "الحاضرون" : "غير الحاضرين"})` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-right">
                    <th className="p-3 font-medium">الاسم</th>
                    <th className="p-3 font-medium">البريد</th>
                    <th className="p-3 font-medium">الهاتف</th>
                    <th className="p-3 font-medium">نوع التذكرة</th>
                    <th className="p-3 font-medium">الحالة</th>
                    <th className="p-3 font-medium">وقت الدخول</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredByTab.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        لا توجد نتائج مطابقة.
                      </td>
                    </tr>
                  ) : (
                    filteredByTab.map((r) => {
                      const present = isRowPresent(r)
                      return (
                        <tr
                          key={r.ticketId ?? `${r.userId}-${r.email}`}
                          className="border-b transition-colors duration-200 ease-in-out last:border-0 hover:bg-muted/40"
                        >
                          <td className="p-3">{r.fullName ?? "—"}</td>
                          <td className="p-3 text-muted-foreground">{r.email ?? "—"}</td>
                          <td className="p-3 text-muted-foreground">{r.phone ?? "—"}</td>
                          <td className="p-3">{r.ticketTypeName ?? "—"}</td>
                          <td className="p-3">
                            {present ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                                حاضر
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                                غير حاضر
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {r.checkedInAtUtc ? formatDateTimeEn(r.checkedInAtUtc) : "—"}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
          </motion.div>
        )}

        {eventId && !loading && !data && !error && (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="py-8 text-center text-muted-foreground"
          >
            لا توجد بيانات.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
