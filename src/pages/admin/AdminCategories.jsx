import { useState, useEffect } from "react"
import api from "../../api/api"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Plus, Pencil, Trash2 } from "lucide-react"
import CategoryIcon, {
  CATEGORY_LUCIDE_ICON_KEYS,
  getCategoryIconName,
} from "../../components/CategoryIcon"
import { MotionSection, MotionSurface, StaggerList, StaggerItem } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminTextMuted } from "../../lib/admin-ui"

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modal, setModal] = useState(null) // 'create' | { id }
  const [form, setForm] = useState({ name: "", description: "", iconUrl: "" })
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    setLoading(true)
    setError("")
    try {
      const { data } = await api.get("/super-admin/categories")
      setCategories(Array.isArray(data) ? data : data?.items ?? data?.categories ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل التصنيفات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const openCreate = () => {
    setModal("create")
    setForm({ name: "", description: "", iconUrl: "" })
  }

  const openEdit = (cat) => {
    setModal({ id: cat.id })
    setForm({
      name: cat.name ?? "",
      description: cat.description ?? "",
      iconUrl: getCategoryIconName(cat),
    })
  }

  const closeModal = () => {
    setModal(null)
    setForm({ name: "", description: "", iconUrl: "" })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        iconUrl: form.iconUrl.trim() || null,
      }
      if (modal === "create") {
        await api.post("/super-admin/categories", payload)
      } else {
        await api.put(`/super-admin/categories/${modal.id}`, payload)
      }
      closeModal()
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر حفظ التصنيف")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("هل تريد حذف هذا التصنيف؟")) return
    setError("")
    try {
      await api.delete(`/super-admin/categories/${id}`)
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر حذف التصنيف")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-4">
        <Button onClick={openCreate} className={adminBtnPrimary}>
          <Plus className="size-4 me-2" />
          تصنيف جديد
        </Button>
      </div>

      {error && <div className={adminPageError}>{error}</div>}

      {modal && (
        <Card className={adminCardClass}>
          <CardHeader>
            <CardTitle className="text-brand-navy">{modal === "create" ? "إضافة تصنيف" : "تعديل تصنيف"}</CardTitle>
            <CardDescription className="text-slate-500">أدخل بيانات التصنيف</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">الاسم</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="h-11 rounded-xl border-slate-200/90"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">الوصف</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200/90"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">الأيقونة</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/90 ring-1 ring-slate-900/[0.04]"
                    aria-hidden
                  >
                    <CategoryIcon
                      name={form.iconUrl || undefined}
                      className="size-6 text-sky-700"
                      strokeWidth={1.75}
                    />
                  </div>
                  <select
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                    dir="ltr"
                    value={form.iconUrl}
                    onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
                  >
                    <option value="">افتراضي</option>
                    {CATEGORY_LUCIDE_ICON_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                    {form.iconUrl &&
                    !CATEGORY_LUCIDE_ICON_KEYS.includes(form.iconUrl) &&
                    !/^https?:\/\//i.test(form.iconUrl) ? (
                      <option value={form.iconUrl}>{form.iconUrl} (غير في القائمة)</option>
                    ) : null}
                  </select>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  يُحفَظ في الـ API كحقل <span className="font-mono">iconUrl</span> (اسم الأيقونة في Lucide).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving} className={adminBtnPrimary}>
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={closeModal}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <AdminCardsSkeleton count={8} gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      ) : categories.length === 0 ? (
        <MotionSurface>
          <Card className={adminCardClass}>
            <CardContent className={`py-12 text-center ${adminTextMuted}`}>لا توجد تصنيفات</CardContent>
          </Card>
        </MotionSurface>
      ) : (
        <MotionSection delay={0.05} aria-label="قائمة التصنيفات">
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <StaggerItem key={cat.id}>
                <MotionSurface>
                  <Card className={adminCardClass}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CategoryIcon
                            name={getCategoryIconName(cat)}
                            className="size-5 text-sky-600"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <CardTitle className="text-base font-semibold text-brand-navy">{cat.name ?? "—"}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => openEdit(cat)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-destructive hover:text-destructive"
                            onClick={() => handleDelete(cat.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                      {cat.description && <CardDescription className="text-slate-500">{cat.description}</CardDescription>}
                    </CardHeader>
                  </Card>
                </MotionSurface>
              </StaggerItem>
            ))}
          </StaggerList>
        </MotionSection>
      )}
    </div>
  )
}
