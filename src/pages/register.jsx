import { useState } from "react"
import { useNavigate, Link, NavLink } from "react-router-dom"
import api from "../api/api"
import { useAuth } from "../context/AuthContext"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Plane, UserPlus } from "lucide-react"

export default function Register() {
  const navigate = useNavigate()
  const { loginFromRegisterResponse } = useAuth()
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    organizationId: "",
    organizationName: "",
    organizationDescription: "",
    organizationEmail: "",
    organizationPhone: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const payload = {
        email: form.email,
        password: form.password,
        displayName: form.displayName || null,
        organizationId: form.organizationId ? parseInt(form.organizationId, 10) : null,
        organizationName: form.organizationName || null,
        organizationDescription: form.organizationDescription || null,
        organizationEmail: form.organizationEmail || null,
        organizationPhone: form.organizationPhone || null,
      }
      const { data } = await api.post("/organization-accounts/register", payload)
      const token = data?.token ?? data?.accessToken
      if (token) {
        await loginFromRegisterResponse(data)
        navigate("/", { replace: true })
        return
      }
      setSuccess("تم إنشاء الحساب بنجاح!")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ أثناء التسجيل")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <NavLink to="/login" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-8 items-center justify-center rounded-md bg-[#006A6A] text-white shadow-sm">
            <Plane className="size-4" />
          </div>
          وكالة السفر
        </NavLink>
        <Card className="border-0 shadow-none">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
              <UserPlus className="size-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">إنشاء حساب</CardTitle>
            <CardDescription>ربط حساب بمنظمة للوصول إلى لوحة التحكم</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم المعروض</Label>
                <Input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  placeholder="اسم المستخدم أو المدير"
                />
              </div>

              <hr className="my-4 border-border" />
              <p className="text-sm font-medium text-muted-foreground">بيانات المنظمة</p>

              <div className="space-y-2">
                <Label>معرّف المنظمة (اختياري)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.organizationId}
                  onChange={(e) => handleChange("organizationId", e.target.value)}
                  placeholder="للربط بمنظمة موجودة"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم المنظمة</Label>
                <Input
                  type="text"
                  value={form.organizationName}
                  onChange={(e) => handleChange("organizationName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>وصف المنظمة</Label>
                <Input
                  type="text"
                  value={form.organizationDescription}
                  onChange={(e) => handleChange("organizationDescription", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>بريد المنظمة</Label>
                <Input
                  type="email"
                  value={form.organizationEmail}
                  onChange={(e) => handleChange("organizationEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>هاتف المنظمة</Label>
                <Input
                  type="tel"
                  value={form.organizationPhone}
                  onChange={(e) => handleChange("organizationPhone", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "جاري التسجيل..." : "إنشاء الحساب"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                لديك حساب؟{" "}
                <Link to="/login" className="font-medium text-[#006A6A] underline-offset-4 hover:underline">
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
