import { useEffect, useState } from "react"
import {
  fetchSuperAdminMe,
  updateSuperAdminMe,
  changeSuperAdminPassword,
  uploadSuperAdminAvatar,
  deleteSuperAdminAvatar,
  normalizeSuperAdminProfile,
} from "../../api/superAdmin"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { User, Shield, KeyRound, ImageIcon } from "lucide-react"
import { resolveApiAssetUrl } from "../../utils/apiAssetUrl"
import { MotionSection, MotionSurface } from "../../components/motion"
import { AdminCardsSkeleton } from "../../components/motion/AdminSkeletons"
import { adminCardClass, adminPageError, adminBtnPrimary, adminTextMuted } from "../../lib/admin-ui"

export default function AdminProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [displayName, setDisplayName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  const [avatarUploading, setAvatarUploading] = useState(false)

  const loadProfile = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchSuperAdminMe()
      const normalized = normalizeSuperAdminProfile(data) ?? data
      setProfile(normalized)
      setDisplayName(normalized?.displayName ?? "")
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تحميل الملف الشخصي")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setError("")
    setSuccess("")
    try {
      await updateSuperAdminMe({ displayName: displayName.trim() })
      setSuccess("تم حفظ الاسم المعروض.")
      await loadProfile()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر حفظ البيانات")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة غير متطابقة.")
      return
    }
    setSavingPassword(true)
    setError("")
    setSuccess("")
    try {
      await changeSuperAdminPassword({
        currentPassword,
        newPassword,
      })
      setSuccess("تم تغيير كلمة المرور.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر تغيير كلمة المرور")
    } finally {
      setSavingPassword(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setError("")
    try {
      await uploadSuperAdminAvatar(file)
      setSuccess("تم تحديث الصورة.")
      await loadProfile()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر رفع الصورة")
    } finally {
      setAvatarUploading(false)
      e.target.value = ""
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm("حذف صورة الملف الشخصي؟")) return
    setAvatarUploading(true)
    try {
      await deleteSuperAdminAvatar()
      setSuccess("تم حذف الصورة.")
      await loadProfile()
    } catch (err) {
      setError(err.response?.data?.message ?? "تعذر الحذف")
    } finally {
      setAvatarUploading(false)
    }
  }

  if (loading) {
    return <AdminCardsSkeleton count={2} gridClassName="grid gap-4 max-w-2xl" />
  }

  const avatarUrl = resolveApiAssetUrl(profile?.avatarUrl)

  return (
    <div className="mx-auto max-w-2xl space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">ملفي — Super Admin</h1>
        <p className={`mt-1 text-sm ${adminTextMuted}`}>
          GET/PUT <code className="text-xs">/api/super-admin/me</code>
        </p>
      </div>

      {error && <div className={adminPageError}>{error}</div>}
      {success && (
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      )}

      <MotionSection delay={0.04}>
        <MotionSurface>
          <Card className={adminCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-navy">
                <User className="size-5" />
                البيانات الأساسية
              </CardTitle>
              <CardDescription>{profile?.email ?? "—"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-8 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Label className="cursor-pointer">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={avatarUploading}
                      onChange={handleAvatarUpload}
                    />
                    <span
                      className={`inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium ${avatarUploading ? "opacity-50" : "hover:bg-slate-50"}`}
                    >
                      {avatarUploading ? "جاري الرفع…" : "رفع أفاتار"}
                    </span>
                  </Label>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={avatarUploading}
                      onClick={handleRemoveAvatar}
                    >
                      حذف الصورة
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم المعروض</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <Button type="submit" disabled={savingProfile} className={adminBtnPrimary}>
                  {savingProfile ? "جاري الحفظ…" : "حفظ الاسم"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </MotionSurface>
      </MotionSection>

      <MotionSection delay={0.06}>
        <MotionSurface>
          <Card className={adminCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-navy">
                <KeyRound className="size-5" />
                تغيير كلمة المرور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>كلمة المرور الحالية</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-11 rounded-xl"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 rounded-xl"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 rounded-xl"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" disabled={savingPassword} variant="outline" className="rounded-xl">
                  {savingPassword ? "جاري التحديث…" : "تحديث كلمة المرور"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </MotionSurface>
      </MotionSection>

      <p className={`flex items-center gap-2 text-xs ${adminTextMuted}`}>
        <Shield className="size-3.5" />
        الدور: SuperAdmin — جميع مسارات /api/super-admin/*
      </p>
    </div>
  )
}
