import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  fetchOrgAccounts,
  createOrgAccount,
  patchOrgAccountPermissions,
  patchOrgAccountStatus,
  sendOrgAccountPasswordReset,
  forceOrgAccountPassword,
  deleteOrgAccount,
  normalizeOrgAccount,
} from "../../api/adminOrgAccounts"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import {
  ArrowRight,
  Users,
  Plus,
  RefreshCw,
  Ban,
  Check,
  KeyRound,
  Trash2,
  Mail,
} from "lucide-react"
import { MotionSection, MotionSurface } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminTextMuted } from "../../lib/admin-ui"

const ROLE_OPTIONS = [
  { value: "OrgAdmin", label: "مدير المنظمة" },
  { value: "OrgStaff", label: "موظف" },
]

export default function AdminOrgAccounts() {
  const { orgId } = useParams()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionId, setActionId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "OrgStaff",
  })
  const [creating, setCreating] = useState(false)
  const [permEditId, setPermEditId] = useState(null)
  const [permValue, setPermValue] = useState("")

  const loadAccounts = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError("")
    try {
      const list = await fetchOrgAccounts(orgId)
      setAccounts(list)
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل حسابات الشركة")
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const runAction = async (id, fn) => {
    setActionId(id)
    setError("")
    try {
      await fn()
      await loadAccounts()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تنفيذ الإجراء")
    } finally {
      setActionId(null)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError("")
    try {
      await createOrgAccount(orgId, {
        email: createForm.email.trim(),
        password: createForm.password,
        displayName: createForm.displayName.trim() || undefined,
        role: createForm.role,
      })
      setShowCreate(false)
      setCreateForm({ email: "", password: "", displayName: "", role: "OrgStaff" })
      await loadAccounts()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر إنشاء الحساب")
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = (row) => {
    const next = !row.isActive
    const msg = next ? "تفعيل هذا الحساب؟" : "تعطيل هذا الحساب؟ لن يستطيع تسجيل الدخول."
    if (!confirm(msg)) return
    runAction(row.id, () => patchOrgAccountStatus(row.id, next))
  }

  const handleSavePermissions = (accountId) => {
    const n = Number(permValue)
    if (!Number.isFinite(n)) {
      setError("قيمة الصلاحيات يجب أن تكون رقماً (bitmask).")
      return
    }
    runAction(accountId, async () => {
      await patchOrgAccountPermissions(accountId, n)
      setPermEditId(null)
    })
  }

  const handleForcePassword = (row) => {
    const pwd = prompt("كلمة المرور الجديدة:")
    if (!pwd) return
    runAction(row.id, () => forceOrgAccountPassword(row.id, pwd))
  }

  const handleDelete = (row) => {
    if (!confirm(`حذف حساب ${row.email || row.id}؟`)) return
    runAction(row.id, () => deleteOrgAccount(row.id))
  }

  if (loading && accounts.length === 0) {
    return <AdminCardsSkeleton count={4} gridClassName="grid gap-4" />
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button type="button" variant="outline" size="sm" className="mb-3 gap-2 rounded-xl" asChild>
            <Link to="/admin/organizations">
              <ArrowRight className="size-4 rotate-180" />
              المنظمات
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-brand-navy">حسابات الشركة #{orgId}</h1>
          <p className={`mt-1 text-sm ${adminTextMuted}`}>
            إدارة موظفي الوكالة — صلاحيات · تفعيل · إعادة تعيين كلمة المرور
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-xl"
            disabled={loading}
            onClick={() => loadAccounts()}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button type="button" className={`h-10 gap-2 rounded-xl ${adminBtnPrimary}`} onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            حساب جديد
          </Button>
        </div>
      </div>

      {error && <div className={adminPageError}>{error}</div>}

      {showCreate && (
        <MotionSection delay={0}>
          <MotionSurface>
            <Card className={adminCardClass}>
              <CardHeader>
                <CardTitle className="text-brand-navy">إضافة حساب موظف</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>البريد</Label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور</Label>
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الدور</Label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      value={createForm.role}
                      onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>الاسم المعروض (اختياري)</Label>
                    <Input
                      value={createForm.displayName}
                      onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" disabled={creating} className={adminBtnPrimary}>
                      {creating ? "جاري الإنشاء…" : "إنشاء"}
                    </Button>
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </MotionSurface>
        </MotionSection>
      )}

      <Card className={adminCardClass}>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Users className="size-5 text-sky-700" />
          <CardTitle className="text-base text-brand-navy">{accounts.length} حساب</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <p className={`px-6 py-12 text-center text-sm ${adminTextMuted}`}>لا توجد حسابات</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {accounts.map((raw) => {
                const row = normalizeOrgAccount(raw)
                const busy = actionId === row.id
                return (
                  <div key={row.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-navy">{row.displayName || row.email || `#${row.id}`}</p>
                      <p className="text-sm text-slate-600">{row.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.orgRole === "OrgAdmin" ? "مدير" : row.orgRole === "OrgStaff" ? "موظف" : row.orgRole || "—"}
                        {" · "}
                        صلاحيات: {row.permissions != null ? String(row.permissions) : "—"}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                          row.isActive
                            ? "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
                            : "bg-rose-50 text-rose-900 ring-rose-200/80"
                        }`}
                      >
                        {row.isActive ? "نشط" : "معطّل"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {permEditId === row.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={permValue}
                            onChange={(e) => setPermValue(e.target.value)}
                            placeholder="31"
                            className="h-8 w-20 rounded-lg text-sm"
                            dir="ltr"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg"
                            disabled={busy}
                            onClick={() => handleSavePermissions(row.id)}
                          >
                            حفظ
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg"
                            onClick={() => setPermEditId(null)}
                          >
                            إلغاء
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          disabled={busy}
                          onClick={() => {
                            setPermEditId(row.id)
                            setPermValue(row.permissions != null ? String(row.permissions) : "")
                          }}
                        >
                          صلاحيات
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs"
                        disabled={busy}
                        onClick={() => handleToggleActive(row)}
                      >
                        {row.isActive ? <Ban className="size-3.5" /> : <Check className="size-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs"
                        disabled={busy}
                        onClick={() => runAction(row.id, () => sendOrgAccountPasswordReset(row.id))}
                      >
                        <Mail className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs"
                        disabled={busy}
                        onClick={() => handleForcePassword(row)}
                      >
                        <KeyRound className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs text-rose-800"
                        disabled={busy}
                        onClick={() => handleDelete(row)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
