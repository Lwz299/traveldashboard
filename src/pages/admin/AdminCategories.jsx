import { useState, useEffect } from "react"
import api from "../../api/api"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { FolderTree, Plus, Pencil, Trash2 } from "lucide-react"
import { MotionSection, MotionSurface, StaggerList, StaggerItem } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminTextMuted } from "../../lib/admin-ui"

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modal, setModal] = useState(null) // 'create' | { id }
  const [form, setForm] = useState({ name: "", description: "" })
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
    setForm({ name: "", description: "" })
  }

  const openEdit = (cat) => {
    setModal({ id: cat.id })
    setForm({ name: cat.name ?? "", description: cat.description ?? "" })
  }

  const closeModal = () => {
    setModal(null)
    setForm({ name: "", description: "" })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      if (modal === "create") {
        await api.post("/super-admin/categories", form)
      } else {
        await api.put(`/super-admin/categories/${modal.id}`, form)
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
                          <FolderTree className="size-5 text-sky-600" strokeWidth={1.75} />
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
