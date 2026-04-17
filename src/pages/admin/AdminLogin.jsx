import { useState } from "react"
import { useNavigate, Link, NavLink } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Shield } from "lucide-react"
import { adminBtnPrimary } from "../../lib/admin-ui"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { adminLogin } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await adminLogin(email, password)
      navigate("/admin", { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.title ??
        (typeof err.response?.data === "string" ? err.response.data : null) ??
        err.message
      const status = err.response?.status
      if (status === 401 || status === 400) {
        setError(msg || "بريد أو كلمة مرور غير صحيحة.")
      } else if (!err.response) {
        setError("تعذر الاتصال بالخادم. تحقق من الاتصال بالإنترنت أو من إعداد VITE_API_URL")
      } else {
        setError(msg || `خطأ ${status || ""}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-app flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-surface-canvas via-white to-sky-50/40 p-6 md:p-10">
      <div className="flex w-full max-w-[420px] flex-col gap-8">
        <NavLink
          to="/admin/login"
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-slate-800 text-white shadow-lg shadow-sky-500/15 ring-2 ring-sky-400/20">
            <Shield className="size-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="block text-sm font-semibold tracking-tight text-brand-navy">
              غرفة التحكم المركزية
            </span>
            <span className="text-xs font-medium text-slate-500">Super Admin</span>
          </div>
        </NavLink>

        <Card className="admin-glass rounded-2xl shadow-xl shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.05]">
          <CardHeader className="space-y-1 text-center pb-2 pt-8">
            <CardTitle className="text-xl font-semibold tracking-tight text-brand-navy">
              تسجيل دخول المدير العام
            </CardTitle>
            <CardDescription className="text-[13px] text-slate-500">للمسؤولين فقط</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2.5 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="superadmin@system.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-200/90 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-200/90 bg-white"
                />
              </div>
              <Button type="submit" className={`h-11 w-full ${adminBtnPrimary}`} disabled={loading}>
                {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
              <p className="text-center text-sm text-slate-500">
                لوحة المنظمة؟{" "}
                <Link to="/login" className="font-medium text-slate-800 underline-offset-4 hover:underline">
                  تسجيل دخول المنظمة
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
