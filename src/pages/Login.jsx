import { useState } from "react"
import { useNavigate, Link, NavLink } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Eye, EyeOff, Plane } from "lucide-react"
import loginBackground from "../assets/one.png"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      navigate("/", { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.title ??
        (typeof err.response?.data === "string" ? err.response.data : null) ??
        err.message
      const status = err.response?.status
      if (status === 401 || status === 400) {
        setError(msg || "بريد أو كلمة مرور غير صحيحة. قد تكون المنظمة قيد المراجعة أو غير معتمدة.")
      } else if (!err.response) {
        setError("تعذر الاتصال بالخادم. تحقق من الاتصال بالإنترنت أو من إعداد VITE_API_URL (https://api.altadumntest.com/api)")
      } else {
        setError(msg || `خطأ ${status || ""}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="org-app relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden p-6 md:p-10" dir="rtl">
      {/* خلفية بملء الشاشة */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBackground})` }}
        aria-hidden
      />
      {/* تدرج + تعتيم لقراءة النموذج */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-900/45 to-slate-950/65"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-[440px] flex-col gap-7">
        <NavLink
          to="/login"
          className="group flex flex-col items-center gap-3 text-center outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg shadow-black/20 ring-1 ring-white/25 backdrop-blur-md transition-transform duration-200 group-hover:scale-[1.02]">
            <Plane className="size-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <span className="block text-base font-semibold tracking-tight text-white drop-shadow-md">وكالة السفر</span>
            <span className="text-sm font-medium text-white/80 drop-shadow">لوحة المنظمة</span>
          </div>
        </NavLink>

        <Card className="rounded-2xl border-white/20 bg-white/92 shadow-2xl shadow-black/20 ring-1 ring-white/30 backdrop-blur-md">
          <CardHeader className="space-y-1 pb-2 pt-8 text-center">
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">تسجيل الدخول</CardTitle>
            <CardDescription className="text-[13px] text-slate-600">
              أدخل بياناتك للوصول إلى لوحة التحكم
            </CardDescription>
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
                  placeholder="name@company.com"
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-200/90 bg-white pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-teal-800 text-[15px] font-medium hover:bg-teal-900"
                disabled={loading}
              >
                {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
              <p className="text-center text-sm text-slate-500">
                لا تملك حساباً؟{" "}
                <Link
                  to="/become-partner"
                  className="font-medium text-teal-800 underline-offset-4 hover:underline"
                >
                  انضم كشريك
                </Link>
              </p>
              <p className="text-center text-xs text-slate-400">
                مدير النظام؟{" "}
                <Link to="/admin/login" className="font-medium text-amber-700 underline-offset-4 hover:underline">
                  تسجيل دخول المدير
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
