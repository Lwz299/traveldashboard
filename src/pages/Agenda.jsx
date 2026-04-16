import { useEffect, useState, useCallback } from "react"
import api from "../api/api"
import { getEventStaff, addEventStaff, removeEventStaff, patchAgendaItem } from "../api/eventStaff"
import { getOrganizationUsers } from "../api/organizationAccounts"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import {
  Plus,
  ListTodo,
  HelpCircle,
  Users,
  Trash2,
  UserPlus,
  Calendar,
  Clock,
  ClipboardList,
  Sparkles,
} from "lucide-react"
import {
  MotionSection,
  MotionSurface,
  StaggerItem,
  StaggerList,
  DashboardPageSkeleton,
} from "../components/motion"
import {
  agendaItemId,
  staffMemberId,
  responsibleBlock,
  orgUserApplicationId,
  orgUserLabel,
} from "../utils/agendaDisplay"
import { orgCardClassSubtle, orgBtnPrimary } from "../lib/org-ui"

function pickKey(aid, i) {
  return aid != null ? String(aid) : `idx-${i}`
}

const btnTap = "transition-transform duration-200 ease-in-out active:scale-[0.98]"

const selectClass =
  "flex h-11 w-full rounded-xl border border-emerald-900/15 bg-white/90 px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600/30"

const textareaClass =
  "min-h-[88px] w-full resize-y rounded-xl border border-emerald-900/15 bg-white/90 px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-600/30"

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 sm:flex-initial sm:justify-start sm:px-4",
        active
          ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/15 ring-1 ring-emerald-700/20"
          : "bg-white/80 text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50/95 hover:text-emerald-900",
      ].join(" ")}
    >
      <Icon className="size-4 shrink-0 opacity-95" strokeWidth={1.75} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white/70 px-3 py-2 shadow-sm ring-1 ring-white/60">
      <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/90">
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-lg font-bold tabular-nums leading-none text-slate-900">{value}</p>
        <p className="org-text-secondary text-[11px] font-medium">{label}</p>
      </div>
    </div>
  )
}

export default function Agenda() {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [agenda, setAgenda] = useState([])
  const [questions, setQuestions] = useState([])
  const [staff, setStaff] = useState([])
  const [orgUsers, setOrgUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffForm, setStaffForm] = useState({
    applicationUserId: "",
    jobTitle: "",
    responsibilities: "",
  })
  const [agendaForm, setAgendaForm] = useState({
    title: "",
    time: "",
    description: "",
    responsibleStaffMemberId: "",
  })
  const [questionForm, setQuestionForm] = useState({ text: "", type: "Text" })
  const [tab, setTab] = useState("agenda")
  const [assignPick, setAssignPick] = useState({})

  const refreshAgenda = useCallback(async () => {
    if (!selectedEvent) return
    try {
      const { data } = await api.get(`/events/${selectedEvent}/agenda`)
      setAgenda(Array.isArray(data) ? data : [])
    } catch {
      setAgenda([])
    }
  }, [selectedEvent])

  const refreshStaff = useCallback(async () => {
    if (!selectedEvent) return
    try {
      const list = await getEventStaff(selectedEvent)
      setStaff(Array.isArray(list) ? list : [])
    } catch {
      setStaff([])
    }
  }, [selectedEvent])

  useEffect(() => {
    api.get("/events/organization/my-events").then(({ data }) => {
      setEvents(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    getOrganizationUsers()
      .then((list) => setOrgUsers(Array.isArray(list) ? list : []))
      .catch(() => setOrgUsers([]))
  }, [])

  useEffect(() => {
    if (!selectedEvent) {
      setAgenda([])
      setQuestions([])
      setStaff([])
      setAssignPick({})
      return
    }
    api
      .get(`/events/${selectedEvent}/questions`)
      .then(({ data }) => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => setQuestions([]))
    refreshAgenda()
    refreshStaff()
  }, [selectedEvent, refreshAgenda, refreshStaff])

  const addAgendaItem = async (e) => {
    e.preventDefault()
    if (!selectedEvent) return
    try {
      const payload = {
        title: agendaForm.title,
        time: agendaForm.time,
        description: agendaForm.description,
      }
      const rid = agendaForm.responsibleStaffMemberId
      if (rid !== "" && rid != null) {
        const n = Number(rid)
        if (Number.isFinite(n)) payload.responsibleStaffMemberId = n
      }
      await api.post(`/events/${selectedEvent}/agenda`, payload)
      setAgendaForm({ title: "", time: "", description: "", responsibleStaffMemberId: "" })
      await refreshAgenda()
    } catch (err) {
      alert(err.response?.data?.message || "حدث خطأ")
    }
  }

  const handleClearResponsible = async (item, rowKey) => {
    const id = agendaItemId(item)
    if (!selectedEvent || id == null) return
    try {
      await patchAgendaItem(selectedEvent, id, { clearResponsible: true })
      setAssignPick((p) => {
        const next = { ...p }
        delete next[rowKey]
        return next
      })
      await refreshAgenda()
    } catch (err) {
      alert(err.response?.data?.message || "تعذر إزالة المسؤول")
    }
  }

  const handleAssignResponsible = async (item, rowKey) => {
    const id = agendaItemId(item)
    if (!selectedEvent || id == null) return
    const sid = assignPick[rowKey]
    if (sid === "" || sid == null) {
      alert("اختر عضواً من الطاقم")
      return
    }
    const n = Number(sid)
    if (!Number.isFinite(n)) return
    try {
      await patchAgendaItem(selectedEvent, id, { responsibleStaffMemberId: n })
      setAssignPick((p) => ({ ...p, [rowKey]: "" }))
      await refreshAgenda()
    } catch (err) {
      alert(err.response?.data?.message || "تعذر ربط المسؤول")
    }
  }

  const addStaff = async (e) => {
    e.preventDefault()
    if (!selectedEvent) return
    const uid = Number(staffForm.applicationUserId)
    if (!Number.isFinite(uid)) {
      alert("اختر مستخدماً من المنظمة")
      return
    }
    try {
      await addEventStaff(selectedEvent, {
        applicationUserId: uid,
        jobTitle: staffForm.jobTitle?.trim() || undefined,
        responsibilities: staffForm.responsibilities?.trim() || undefined,
      })
      setStaffForm({ applicationUserId: "", jobTitle: "", responsibilities: "" })
      await refreshStaff()
    } catch (err) {
      alert(err.response?.data?.message || "تعذر إضافة العضو")
    }
  }

  const deleteStaff = async (row) => {
    const sid = staffMemberId(row)
    if (!selectedEvent || sid == null) return
    if (!confirm("إزالة هذا العضو من طاقم الرحلة؟")) return
    try {
      await removeEventStaff(selectedEvent, sid)
      await refreshStaff()
      await refreshAgenda()
    } catch (err) {
      alert(err.response?.data?.message || "تعذر الحذف")
    }
  }

  const addQuestion = async (e) => {
    e.preventDefault()
    if (!selectedEvent) return
    try {
      await api.post(`/events/${selectedEvent}/questions`, questionForm)
      setQuestionForm({ text: "", type: "Text" })
      const { data } = await api.get(`/events/${selectedEvent}/questions`)
      setQuestions(Array.isArray(data) ? data : [])
    } catch (err) {
      alert(err.response?.data?.message || "حدث خطأ")
    }
  }

  if (loading) {
    return <DashboardPageSkeleton />
  }

  const staffOptionsForAgenda = staff.map((s) => {
    const sid = staffMemberId(s)
    const jt = s.jobTitle ?? s.JobTitle ?? ""
    return {
      value: sid != null ? String(sid) : "",
      label: jt ? `${jt} (#${sid})` : `عضو طاقم #${sid}`,
    }
  })

  const staffApplicationIds = new Set(
    staff.map((s) => s.applicationUserId ?? s.ApplicationUserId).filter((x) => x != null)
  )
  const orgUsersAvailableForStaff = orgUsers.filter((u) => {
    const aid = orgUserApplicationId(u)
    return aid != null && !staffApplicationIds.has(aid)
  })

  const staffEmptyHint = tab === "agenda" && staff.length === 0 && selectedEvent

  return (
    <div className="w-full space-y-6 md:space-y-8">
      <MotionSection delay={0.03}>
        <MotionSurface>
          <Card className={`${orgCardClassSubtle} w-full overflow-hidden`}>
            <CardHeader className="border-b border-emerald-900/[0.06] bg-gradient-to-b from-white/95 to-emerald-50/25 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-start gap-3 sm:items-center">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/15 ring-1 ring-emerald-600/25">
                      <Calendar className="size-[18px]" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="org-heading text-lg font-semibold leading-tight">اختيار الرحلة</CardTitle>
                      <CardDescription className="mt-0.5 text-[13px] leading-relaxed">
                        اختر رحلة لعرض الطاقم والأجندة وأسئلة التسجيل.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="w-full min-w-0">
                    <Label htmlFor="agenda-event-select" className="sr-only">
                      الرحلة
                    </Label>
                    <select
                      id="agenda-event-select"
                      className={selectClass}
                      value={selectedEvent ?? ""}
                      onChange={(e) => setSelectedEvent(e.target.value || null)}
                    >
                      <option value="">— اختر رحلة —</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title || ev.name || "بدون عنوان"}
                        </option>
                      ))}
                    </select>
                    {events.length === 0 && (
                      <p className="org-text-secondary mt-3 text-center text-sm sm:text-right">
                        لا توجد رحلات بعد. أنشئ رحلة من قسم «الرحلات» أولاً.
                      </p>
                    )}
                  </div>
                </div>

                {selectedEvent && (
                  <div className="flex w-full flex-wrap gap-2 sm:gap-3 xl:w-auto xl:max-w-[min(100%,520px)] xl:justify-end xl:shrink-0">
                    <StatChip icon={Users} value={staff.length} label="أعضاء الطاقم" />
                    <StatChip icon={ClipboardList} value={agenda.length} label="بنود الأجندة" />
                    <StatChip icon={HelpCircle} value={questions.length} label="أسئلة مخصصة" />
                  </div>
                )}
              </div>
            </CardHeader>

            {selectedEvent && (
              <CardContent className="px-4 py-4 sm:px-6 sm:py-4">
                <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex min-w-min gap-2 rounded-2xl border border-emerald-900/10 bg-slate-100/60 p-1.5 ring-1 ring-white/50 sm:inline-flex sm:flex-wrap">
                    <TabButton active={tab === "staff"} onClick={() => setTab("staff")} icon={Users} label="طاقم العمل" />
                    <TabButton active={tab === "agenda"} onClick={() => setTab("agenda")} icon={ListTodo} label="الأجندة" />
                    <TabButton
                      active={tab === "questions"}
                      onClick={() => setTab("questions")}
                      icon={HelpCircle}
                      label="الأسئلة"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </MotionSurface>
      </MotionSection>

      {selectedEvent && (
        <div className="w-full space-y-5">
              {staffEmptyHint && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100/80">
                  <Sparkles className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
                  <p>
                    لا يوجد أعضاء في طاقم هذه الرحلة بعد. أضف طاقماً من تبويب «طاقم العمل» ليتمكن من ربط
                    المسؤولين ببنود الأجندة.
                  </p>
                </div>
              )}

              {tab === "staff" && (
                <MotionSurface>
                  <Card className={orgCardClassSubtle}>
                    <CardHeader className="space-y-1">
                      <CardTitle className="org-heading flex items-center gap-2 text-lg font-semibold">
                        <UserPlus className="size-5 text-emerald-700" strokeWidth={1.75} />
                        طاقم الرحلة
                      </CardTitle>
                      <CardDescription className="text-[13px] leading-relaxed">
                        من مستخدمي المنظمة فقط (نفس الدعوات). لا يُكرر المستخدم مرتين لنفس الرحلة.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <form onSubmit={addStaff} className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Label className="text-slate-700">المستخدم</Label>
                          <select
                            className={`${selectClass} mt-1.5`}
                            value={staffForm.applicationUserId}
                            onChange={(e) => setStaffForm((f) => ({ ...f, applicationUserId: e.target.value }))}
                            required
                          >
                            <option value="">— اختر مستخدماً —</option>
                            {orgUsersAvailableForStaff.map((u) => {
                              const aid = orgUserApplicationId(u)
                              return (
                                <option key={aid} value={aid != null ? String(aid) : ""}>
                                  {orgUserLabel(u)}
                                </option>
                              )
                            })}
                          </select>
                        </div>
                        <div className="sm:col-span-2 md:col-span-1">
                          <Label className="text-slate-700">المسمى الوظيفي</Label>
                          <Input
                            value={staffForm.jobTitle}
                            onChange={(e) => setStaffForm((f) => ({ ...f, jobTitle: e.target.value }))}
                            placeholder="مثال: مشرف التجمع"
                            className="mt-1.5 rounded-xl border-emerald-900/15 shadow-sm"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-slate-700">المسؤوليات والملاحظات</Label>
                          <textarea
                            value={staffForm.responsibilities}
                            onChange={(e) => setStaffForm((f) => ({ ...f, responsibilities: e.target.value }))}
                            placeholder="مثال: التنسيق مع الحافلات والتجمع"
                            className={`${textareaClass} mt-1.5`}
                            rows={3}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Button type="submit" className={`rounded-xl ${orgBtnPrimary} ${btnTap}`}>
                            <Plus className="ml-2 size-4" />
                            إضافة للطاقم
                          </Button>
                        </div>
                      </form>

                      <StaggerList className="grid gap-3 sm:grid-cols-2">
                        {staff.map((row, i) => {
                          const sid = staffMemberId(row)
                          const jt = row.jobTitle ?? row.JobTitle ?? "—"
                          const resp = row.responsibilities ?? row.Responsibilities ?? ""
                          return (
                            <StaggerItem key={sid ?? i}>
                              <MotionSurface>
                                <div className="org-card-surface flex h-full flex-col justify-between gap-3 rounded-2xl border border-emerald-900/10 p-4 transition-shadow duration-200 hover:shadow-md">
                                  <div>
                                    <p className="org-heading font-semibold text-slate-900">{jt}</p>
                                    {resp && (
                                      <p className="org-text-secondary mt-2 text-sm leading-relaxed">{resp}</p>
                                    )}
                                    <p className="mt-3 text-[11px] font-medium tabular-nums text-slate-400">
                                      مستخدم #{row.applicationUserId ?? row.ApplicationUserId ?? "—"}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full rounded-xl border-rose-200/90 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                    onClick={() => deleteStaff(row)}
                                  >
                                    <Trash2 className="ml-2 size-4" />
                                    إزالة من الطاقم
                                  </Button>
                                </div>
                              </MotionSurface>
                            </StaggerItem>
                          )
                        })}
                      </StaggerList>
                      {staff.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-emerald-50/40 py-12 text-center">
                          <Users className="mx-auto size-10 text-emerald-600/50" strokeWidth={1.25} />
                          <p className="org-text-secondary mt-3 text-sm">لا يوجد أعضاء بعد — أضف أول عضو للطاقم.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </MotionSurface>
              )}

              {tab === "agenda" && (
                <MotionSurface>
                  <Card className={orgCardClassSubtle}>
                    <CardHeader className="space-y-1">
                      <CardTitle className="org-heading flex items-center gap-2 text-lg font-semibold">
                        <ListTodo className="size-5 text-emerald-700" strokeWidth={1.75} />
                        عناصر الأجندة
                      </CardTitle>
                      <CardDescription className="text-[13px] leading-relaxed">
                        اربط كل بنداً بمسؤول من طاقم هذه الرحلة فقط. يمكن تعديل المسؤول أو إزالته لاحقاً.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <form
                        onSubmit={addAgendaItem}
                        className="rounded-2xl border border-emerald-900/10 bg-gradient-to-b from-emerald-50/50 to-white/80 p-4 ring-1 ring-emerald-900/[0.04] sm:p-5"
                      >
                        <p className="mb-3 text-sm font-semibold text-emerald-900">إضافة بند جديد</p>
                        <div className="grid gap-3 sm:grid-cols-12 sm:gap-4">
                          <div className="sm:col-span-12 lg:col-span-5">
                            <Label className="text-slate-700">العنوان</Label>
                            <Input
                              placeholder="مثال: التجمع والمغادرة"
                              value={agendaForm.title}
                              onChange={(e) => setAgendaForm((f) => ({ ...f, title: e.target.value }))}
                              className="mt-1.5 h-10 rounded-xl border-emerald-900/15 shadow-sm"
                            />
                          </div>
                          <div className="sm:col-span-6 lg:col-span-2">
                            <Label className="text-slate-700">الوقت</Label>
                            <div className="relative mt-1.5">
                              <Clock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                              <Input
                                placeholder="08:00"
                                value={agendaForm.time}
                                onChange={(e) => setAgendaForm((f) => ({ ...f, time: e.target.value }))}
                                className="h-10 rounded-xl border-emerald-900/15 pr-10 shadow-sm"
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-6 lg:col-span-3">
                            <Label className="text-slate-700">مسؤول البند (اختياري)</Label>
                            <select
                              className={`${selectClass} mt-1.5 h-10`}
                              value={agendaForm.responsibleStaffMemberId}
                              onChange={(e) =>
                                setAgendaForm((f) => ({ ...f, responsibleStaffMemberId: e.target.value }))
                              }
                            >
                              <option value="">— بدون —</option>
                              {staffOptionsForAgenda.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-12 lg:col-span-12">
                            <Label className="text-slate-700">الوصف</Label>
                            <textarea
                              value={agendaForm.description}
                              onChange={(e) => setAgendaForm((f) => ({ ...f, description: e.target.value }))}
                              placeholder="تفاصيل اختيارية للبند"
                              className={`${textareaClass} mt-1.5 min-h-[64px]`}
                              rows={2}
                            />
                          </div>
                          <div className="sm:col-span-12">
                            <Button type="submit" className={`${orgBtnPrimary} rounded-xl ${btnTap}`}>
                              <Plus className="ml-2 size-4" />
                              إضافة البند
                            </Button>
                          </div>
                        </div>
                      </form>

                      <div>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">جدول الأجندة</p>
                          <span className="text-xs tabular-nums text-slate-500">{agenda.length} بند</span>
                        </div>

                        {agenda.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-gradient-to-b from-emerald-50/50 to-white/60 py-14 text-center">
                            <ListTodo className="mx-auto size-10 text-emerald-600/45" strokeWidth={1.25} />
                            <p className="org-text-secondary mt-3 text-sm">لا توجد بنود بعد — أضف أول بند من النموذج أعلاه.</p>
                          </div>
                        ) : (
                          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_4px_24px_-8px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/[0.04]">
                            <table className="w-full min-w-[900px] border-collapse text-[13px] leading-snug">
                              <thead>
                                <tr className="border-b border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-slate-50/70">
                                  <th className="w-10 px-2 py-3 text-center text-xs font-semibold text-slate-600 sm:px-3">#</th>
                                  <th className="w-[88px] whitespace-nowrap px-2 py-3 text-right text-xs font-semibold text-slate-600 sm:px-3">
                                    الوقت
                                  </th>
                                  <th className="min-w-[200px] px-2 py-3 text-right text-xs font-semibold text-slate-600 sm:min-w-[240px] sm:px-4">
                                    البند
                                  </th>
                                  <th className="min-w-[120px] px-2 py-3 text-right text-xs font-semibold text-slate-600 sm:px-3">
                                    المسؤول الحالي
                                  </th>
                                  <th className="min-w-[300px] px-2 py-3 text-right text-xs font-semibold text-slate-600 sm:min-w-[340px] sm:px-4">
                                    تحديث المسؤول
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100/90">
                                {agenda.map((item, i) => {
                                  const aid = agendaItemId(item)
                                  const rowKey = pickKey(aid, i)
                                  const resp = responsibleBlock(item)
                                  const email = resp?.email ?? resp?.Email
                                  const name = resp?.displayName ?? resp?.name ?? resp?.DisplayName
                                  const rjt = resp?.jobTitle ?? resp?.JobTitle
                                  const title = item.title ?? item.Title ?? item.name ?? "—"
                                  const timeStr = item.time ?? item.Time ?? ""
                                  const desc = item.description ?? item.Description ?? ""

                                  return (
                                    <tr
                                      key={aid ?? i}
                                      className={i % 2 === 0 ? "bg-white/95" : "bg-slate-50/50 transition-colors hover:bg-emerald-50/40"}
                                    >
                                      <td className="px-2 py-3 text-center tabular-nums text-slate-500 sm:px-3">
                                        {i + 1}
                                      </td>
                                      <td className="whitespace-nowrap px-2 py-3 tabular-nums text-slate-700 sm:px-3">
                                        {timeStr !== "" && timeStr != null ? (
                                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 px-2 py-0.5 text-xs font-medium ring-1 ring-slate-200/80">
                                            <Clock className="size-3.5 opacity-70" aria-hidden />
                                            {timeStr}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                      <td className="max-w-0 px-2 py-3 sm:px-4">
                                        <p className="font-semibold text-slate-900">{title}</p>
                                        {desc ? (
                                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">{desc}</p>
                                        ) : null}
                                      </td>
                                      <td className="max-w-[200px] px-2 py-3 align-top sm:px-3">
                                        {resp ? (
                                          <div className="space-y-0.5">
                                            <p className="font-medium leading-tight text-emerald-900">{name || email || "—"}</p>
                                            {rjt && <p className="text-[11px] text-slate-600">{rjt}</p>}
                                            {email && name && (
                                              <p className="truncate text-[11px] text-slate-500" title={email}>
                                                {email}
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-xs text-slate-400">بدون مسؤول</span>
                                        )}
                                      </td>
                                      <td className="px-2 py-3 align-top sm:px-4">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                                          <div className="min-w-[180px] flex-1">
                                            <Label className="sr-only">تعيين مسؤول للبند {i + 1}</Label>
                                            <select
                                              className={`${selectClass} h-9 text-[13px]`}
                                              value={assignPick[rowKey] ?? ""}
                                              onChange={(e) =>
                                                setAssignPick((p) => ({ ...p, [rowKey]: e.target.value }))
                                              }
                                            >
                                              <option value="">— اختر من الطاقم —</option>
                                              {staffOptionsForAgenda.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                  {o.label}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            <Button
                                              type="button"
                                              size="sm"
                                              className={`h-9 rounded-lg px-3 text-xs ${orgBtnPrimary}`}
                                              onClick={() => handleAssignResponsible(item, rowKey)}
                                            >
                                              حفظ
                                            </Button>
                                            {resp ? (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-9 rounded-lg border-slate-200 px-3 text-xs"
                                                onClick={() => handleClearResponsible(item, rowKey)}
                                              >
                                                إزالة
                                              </Button>
                                            ) : null}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </MotionSurface>
              )}

              {tab === "questions" && (
                <MotionSurface>
                  <Card className={orgCardClassSubtle}>
                    <CardHeader className="space-y-1">
                      <CardTitle className="org-heading flex items-center gap-2 text-lg font-semibold">
                        <HelpCircle className="size-5 text-emerald-700" strokeWidth={1.75} />
                        الأسئلة المخصصة
                      </CardTitle>
                      <CardDescription className="text-[13px]">
                        أسئلة إضافية يمكن ربطها بتسجيل المسافرين حسب نوع الحقل.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <form onSubmit={addQuestion} className="rounded-2xl border border-emerald-900/10 bg-emerald-50/30 p-4 sm:p-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <Label className="text-slate-700">نص السؤال</Label>
                            <Input
                              value={questionForm.text}
                              onChange={(e) => setQuestionForm((f) => ({ ...f, text: e.target.value }))}
                              required
                              className="mt-1.5 rounded-xl border-emerald-900/15 shadow-sm"
                              placeholder="صياغة السؤال للمسافر"
                            />
                          </div>
                          <div className="sm:col-span-2 md:col-span-1">
                            <Label className="text-slate-700">نوع الإجابة</Label>
                            <select
                              className={`${selectClass} mt-1.5`}
                              value={questionForm.type}
                              onChange={(e) => setQuestionForm((f) => ({ ...f, type: e.target.value }))}
                            >
                              <option value="Text">نص حر</option>
                              <option value="Number">رقم</option>
                              <option value="Boolean">نعم / لا</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <Button type="submit" className={`rounded-xl ${orgBtnPrimary} ${btnTap}`}>
                              <Plus className="ml-2 size-4" />
                              إضافة السؤال
                            </Button>
                          </div>
                        </div>
                      </form>

                      <ul className="space-y-2">
                        {questions.map((q, i) => (
                          <li
                            key={q.id || i}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-emerald-900/10 bg-white/70 px-4 py-3 text-sm shadow-sm ring-1 ring-white/60 transition-colors hover:bg-emerald-50/40"
                          >
                            <span className="font-medium text-slate-900">{q.text || q.question || "—"}</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
                              {q.type}
                            </span>
                          </li>
                        ))}
                        {questions.length === 0 && (
                          <li className="rounded-2xl border border-dashed border-emerald-900/20 bg-emerald-50/40 py-12 text-center text-sm text-slate-500">
                            لا توجد أسئلة بعد
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </MotionSurface>
              )}
        </div>
      )}
    </div>
  )
}
