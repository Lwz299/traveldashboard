import { useState, useEffect, useCallback, useMemo } from "react"
import { getOrganizationUsers, inviteUser, removeUser } from "../api/organizationAccounts"
import { useAuth } from "../context/AuthContext"
import { useOrgPermissions } from "../hooks/useOrgPermissions"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react"
import { MotionSection, MotionSurface, StackedRowsSkeleton } from "../components/motion"
import { orgCardClassSubtle } from "../lib/org-ui"
import { formatCountEn } from "../utils/formatEn"

const btnTap = "transition-transform duration-200 ease-in-out active:scale-[0.98]"

const ROLE_LABELS = { OrgAdmin: "مدير", OrgStaff: "موظف" }

function roleBadgeClass(role) {
  if (role === "OrgAdmin") return "bg-amber-50 text-amber-900 ring-amber-200/80"
  if (role === "OrgStaff") return "bg-sky-50 text-sky-900 ring-sky-200/80"
  return "bg-slate-50 text-slate-700 ring-slate-200/80"
}

const inviteTypeBtn = (active) =>
  [
    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
    active
      ? "bg-white text-emerald-900 shadow-sm shadow-emerald-900/10 ring-1 ring-emerald-900/10"
      : "text-slate-600 hover:text-emerald-900",
  ].join(" ")

export default function OrgUsers() {
  const { user } = useAuth()
  const { can } = useOrgPermissions()
  const canInvite = can(["CanInviteUsers"])
  const canRemove = user?.orgRole === "OrgAdmin"

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [inviteType, setInviteType] = useState("new")
  const [inviteForm, setInviteForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "OrgStaff",
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState("")
  const [removingId, setRemovingId] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const list = await getOrganizationUsers()
      setUsers(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.response?.data?.title ??
          err.response?.data?.detail ??
          "تعذر تحميل قائمة المستخدمين"
      )
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const userCountLabel = useMemo(() => formatCountEn(users.length), [users.length])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (inviteType === "new" && !inviteForm.password?.trim()) {
      setError("كلمة المرور مطلوبة للمستخدمين الجدد.")
      return
    }
    setError("")
    setInviteSuccess("")
    setInviteLoading(true)
    try {
      const payload = {
        email: inviteForm.email,
        displayName: inviteForm.displayName || undefined,
        role: "OrgStaff",
      }
      if (inviteType === "new" && inviteForm.password?.trim()) {
        payload.password = inviteForm.password.trim()
      }
      await inviteUser(payload)
      setInviteSuccess("تم إرسال الدعوة بنجاح.")
      setInviteForm({ email: "", password: "", displayName: "", role: "OrgStaff" })
      fetchUsers()
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.response?.data?.title ??
          err.response?.data?.detail ??
          "تعذر إرسال الدعوة"
      )
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemove = async (applicationUserId) => {
    if (!confirm("هل تريد إزالة هذا المستخدم من المنظمة؟")) return
    setRemovingId(applicationUserId)
    setError("")
    try {
      await removeUser(applicationUserId)
      fetchUsers()
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.response?.data?.title ??
          err.response?.data?.detail ??
          "تعذر إزالة المستخدم"
      )
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-rose-200/90 bg-rose-50/60 px-4 py-3 text-sm text-rose-950"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-700" aria-hidden />
          <p className="min-w-0 leading-relaxed">{error}</p>
        </div>
      )}

      {canInvite && (
        <MotionSection delay={0.04} aria-label="دعوة مستخدم">
          <MotionSurface>
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="border-b border-emerald-900/[0.06] bg-gradient-to-b from-white/90 to-emerald-50/25 px-4 py-4 sm:px-6 sm:py-5">
                <CardTitle className="org-heading flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15">
                    <UserPlus className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  دعوة مستخدم
                </CardTitle>
                <CardDescription className="text-[13px] leading-relaxed text-slate-600">
                  أرسل دعوة لبريد إلكتروني لإضافة موظف إلى المنظمة. المستخدم الجديد يحتاج كلمة مرور لإنشاء الحساب.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-4 py-5 sm:px-6">
                {inviteSuccess && (
                  <div
                    className="flex items-start gap-2 rounded-xl border border-teal-200/90 bg-teal-50/60 px-3 py-2.5 text-sm text-teal-950"
                    role="status"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />
                    <span>{inviteSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleInvite} className="space-y-5">
                  <div>
                    <Label className="mb-2 block text-xs font-medium text-slate-600">نوع الدعوة</Label>
                    <div
                      className="inline-flex flex-wrap gap-1 rounded-xl border border-emerald-900/10 bg-slate-100/60 p-1 ring-1 ring-white/60"
                      role="radiogroup"
                      aria-label="نوع الدعوة"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={inviteType === "new"}
                        className={inviteTypeBtn(inviteType === "new")}
                        onClick={() => setInviteType("new")}
                      >
                        مستخدم جديد
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={inviteType === "existing"}
                        className={inviteTypeBtn(inviteType === "existing")}
                        onClick={() => setInviteType("existing")}
                      >
                        مستخدم مسجّل مسبقاً
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
                      <Label htmlFor="invite-email">البريد الإلكتروني</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        autoComplete="email"
                        className="h-10 rounded-xl"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                        required
                      />
                    </div>
                    {inviteType === "new" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="invite-password">كلمة المرور</Label>
                        <Input
                          id="invite-password"
                          type="password"
                          autoComplete="new-password"
                          className="h-10 rounded-xl"
                          value={inviteForm.password}
                          onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                          required={inviteType === "new"}
                          placeholder="لإنشاء الحساب"
                        />
                        <p className="text-[11px] text-slate-500">مطلوبة لأن الحساب يُنشأ من الصفر</p>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-display">الاسم المعروض</Label>
                      <Input
                        id="invite-display"
                        type="text"
                        className="h-10 rounded-xl"
                        value={inviteForm.displayName}
                        onChange={(e) => setInviteForm((f) => ({ ...f, displayName: e.target.value }))}
                        placeholder="اختياري"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الدور</Label>
                      <div className="flex h-10 items-center rounded-xl border border-emerald-900/12 bg-emerald-50/40 px-3 text-sm text-slate-700">
                        موظف (OrgStaff)
                      </div>
                      <p className="text-[11px] text-slate-500">الدعوة تضيف موظفاً فقط</p>
                    </div>
                  </div>

                  <Button type="submit" disabled={inviteLoading} className={`rounded-xl ${btnTap}`}>
                    {inviteLoading ? "جاري الإرسال..." : "إرسال الدعوة"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </MotionSurface>
        </MotionSection>
      )}

      {!canInvite && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/50 px-4 py-3 text-sm text-sky-950"
          role="status"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-sky-700" aria-hidden />
          <p className="leading-relaxed">
            عرض القائمة متاح لك؛ <strong className="font-semibold text-slate-800">دعوة مستخدمين جدد</strong> تتطلب
            صلاحية <span className="font-mono text-xs">CanInviteUsers</span> أو دور مدير المنظمة.
          </p>
        </div>
      )}

      <MotionSection delay={canInvite ? 0.06 : 0.04} aria-label="قائمة المستخدمين">
        <MotionSurface>
          <Card className={`${orgCardClassSubtle} overflow-hidden`}>
            <CardHeader className="border-b border-emerald-900/[0.06] bg-gradient-to-b from-white/90 to-emerald-50/20 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="org-heading flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15">
                      <Users className="size-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    أعضاء المنظمة
                  </CardTitle>
                  <CardDescription className="mt-1.5 text-[13px] text-slate-600">
                    {loading ? "جاري التحميل…" : `${userCountLabel} مستخدم`}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={loading}
                  className={`h-10 gap-2 rounded-xl border-emerald-900/12 bg-white/80 shadow-sm ${btnTap}`}
                >
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
                  تحديث
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-4 py-6 sm:px-6">
                  <StackedRowsSkeleton rows={5} />
                </div>
              ) : users.length === 0 ? (
                <div className="rounded-b-2xl border-t border-emerald-900/[0.04] bg-gradient-to-b from-slate-50/80 to-white/60 px-6 py-14 text-center">
                  <Users className="mx-auto mb-3 size-10 text-slate-300" strokeWidth={1.25} aria-hidden />
                  <p className="text-sm font-medium text-slate-600">لا يوجد مستخدمون في القائمة</p>
                  <p className="mt-1 text-xs text-slate-500">عند إضافة أعضاء ستظهر هنا.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100/90">
                  {users.map((u) => {
                    const id = u.applicationUserId ?? u.id
                    const memberRole = u.role ?? u.orgRole
                    const isSelf = Number(id) === Number(user?.accountId)
                    return (
                      <li
                        key={id ?? u.email}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-emerald-50/35 sm:px-6"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={[
                              "flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1",
                              memberRole === "OrgAdmin"
                                ? "bg-gradient-to-br from-amber-100/90 to-amber-50 text-amber-800 ring-amber-200/80"
                                : "bg-gradient-to-br from-slate-100 to-white text-slate-600 ring-slate-200/80",
                            ].join(" ")}
                          >
                            {memberRole === "OrgAdmin" ? (
                              <Shield className="size-5" strokeWidth={1.75} aria-hidden />
                            ) : (
                              <User className="size-5" strokeWidth={1.75} aria-hidden />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium text-slate-900">{u.displayName || u.email}</p>
                              {isSelf && (
                                <span className="shrink-0 rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                                  أنت
                                </span>
                              )}
                            </div>
                            <p className="truncate text-sm text-slate-500">{u.email}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${roleBadgeClass(memberRole)}`}
                          >
                            {ROLE_LABELS[memberRole] ?? memberRole ?? "—"}
                          </span>
                        </div>
                        {!isSelf && canRemove && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemove(id)}
                            disabled={removingId != null}
                            className={`shrink-0 rounded-lg border-rose-200/90 text-rose-700 hover:bg-rose-50 hover:text-rose-800 ${btnTap}`}
                          >
                            <Trash2 className="ms-1 size-4" aria-hidden />
                            {removingId === id ? "جاري…" : "إزالة"}
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </MotionSurface>
      </MotionSection>
    </div>
  )
}
