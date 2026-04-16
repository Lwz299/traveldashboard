import { useState } from "react"
import { useNavigate, Link, NavLink } from "react-router-dom"
import api from "../api/api"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Plane, Building2, Plus, Trash2 } from "lucide-react"

const DOCUMENT_TYPES = [
  { value: "CommercialLicense", label: "رخصة تجارية" },
  { value: "TaxCertificate", label: "شهادة ضريبية" },
  { value: "Other", label: "وثيقة أخرى" },
]

export default function BecomePartner() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    organizationName: "",
    organizationDescription: "",
    organizationEmail: "",
    organizationPhone: "",
  })
  const [documents, setDocuments] = useState([{ documentType: "CommercialLicense", file: null }])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const updateDocument = (index, field, value) => {
    setDocuments((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, [field]: value } : doc))
    )
  }

  const addDocument = () => {
    setDocuments((prev) => [...prev, { documentType: "CommercialLicense", file: null }])
  }

  const removeDocument = (index) => {
    if (documents.length <= 1) return
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const selectedDocs = documents.filter((d) => d.file instanceof File)
      if (selectedDocs.length === 0) {
        setError("يرجى اختيار ملف وثيقة واحد على الأقل.")
        setLoading(false)
        return
      }

      const fd = new FormData()
      fd.append("email", form.email)
      if (form.password?.trim()) fd.append("password", form.password.trim())
      fd.append("displayName", form.displayName || "")
      fd.append("organizationName", form.organizationName || "")
      fd.append("organizationDescription", form.organizationDescription || "")
      fd.append("organizationEmail", form.organizationEmail || "")
      fd.append("organizationPhone", form.organizationPhone || "")

      selectedDocs.forEach((doc) => {
        fd.append("documents", doc.file)
        fd.append("documentTypes", doc.documentType)
      })

      await api.post("/partner-applications/apply-with-files", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setSuccess("تم إرسال طلبك بنجاح. ستُرسل إليك بيانات الدخول عند الاعتماد.")
      setTimeout(() => navigate("/login"), 3000)
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.response?.data?.title ??
          (typeof err.response?.data === "string" ? err.response.data : null) ??
          "حدث خطأ أثناء إرسال الطلب"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="org-app flex min-h-svh flex-col items-center gap-8 bg-gradient-to-br from-teal-50/90 via-white to-slate-50 p-6 py-10 md:p-10">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <NavLink to="/login" className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-lg shadow-teal-900/15 ring-1 ring-teal-900/10">
            <Plane className="size-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="block text-sm font-semibold tracking-tight text-slate-900">وكالة السفر</span>
            <span className="text-xs font-medium text-slate-500">طلب انضمام شريك</span>
          </div>
        </NavLink>
        <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.04]">
          <CardHeader className="space-y-2 pb-2 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-teal-50 ring-1 ring-teal-100">
              <Building2 className="size-5 text-teal-800" strokeWidth={1.75} />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">انضم كشريك</CardTitle>
            <CardDescription className="text-[13px] leading-relaxed text-slate-500">
              سجّل شركتك للانضمام كبائع في المنصة. سيتم مراجعة طلبك من قبل الإدارة.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2.5 text-sm text-red-800">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 text-sm text-emerald-900">
                  {success}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">كلمة المرور (اختياري)</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="سيتم إرسال كلمة مرور مؤقتة عند الاعتماد"
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                  <p className="text-xs text-slate-500">ستُرسل إليك بيانات الدخول عند الاعتماد</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700">الاسم المعروض</Label>
                  <Input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => handleChange("displayName", e.target.value)}
                    placeholder="مدير الشركة"
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
              </div>

              <hr className="my-4 border-slate-200/80" />
              <p className="text-sm font-medium text-slate-600">بيانات المنظمة</p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">اسم المنظمة</Label>
                  <Input
                    type="text"
                    value={form.organizationName}
                    onChange={(e) => handleChange("organizationName", e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">بريد المنظمة</Label>
                  <Input
                    type="email"
                    value={form.organizationEmail}
                    onChange={(e) => handleChange("organizationEmail", e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700">وصف المنظمة</Label>
                  <Input
                    type="text"
                    value={form.organizationDescription}
                    onChange={(e) => handleChange("organizationDescription", e.target.value)}
                    placeholder="وصف مختصر للنشاط"
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">هاتف المنظمة</Label>
                  <Input
                    type="tel"
                    value={form.organizationPhone}
                    onChange={(e) => handleChange("organizationPhone", e.target.value)}
                    placeholder="+964..."
                    className="h-11 rounded-xl border-slate-200/90"
                  />
                </div>
              </div>

              <hr className="my-4 border-slate-200/80" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">الوثائق</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDocument}
                  className="gap-1 rounded-xl border-slate-200/90"
                >
                  <Plus className="size-4" /> إضافة وثيقة
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                صيغ مسموحة: pdf, png, jpg, jpeg, webp - الحد الأقصى 10MB لكل ملف
              </p>

              {documents.map((doc, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 ring-1 ring-slate-900/[0.03]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">وثيقة #{i + 1}</span>
                    {documents.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(i)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">نوع الوثيقة</Label>
                      <select
                        className="flex h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-1 text-sm"
                        value={doc.documentType}
                        onChange={(e) => updateDocument(i, "documentType", e.target.value)}
                      >
                        {DOCUMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">ملف الوثيقة</Label>
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => updateDocument(i, "file", e.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {doc.file ? `الملف المختار: ${doc.file.name}` : "لم يتم اختيار ملف بعد"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-teal-800 text-[15px] font-medium hover:bg-teal-900"
                disabled={loading}
              >
                {loading ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
              <p className="text-center text-sm text-slate-500">
                لديك حساب معتمد؟{" "}
                <Link to="/login" className="font-medium text-teal-800 underline-offset-4 hover:underline">
                  تسجيل الدخول
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
