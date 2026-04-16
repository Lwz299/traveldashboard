/**
 * استخراج رسالة خطأ من استجابة Axios/API للوحة المنظمة.
 * يدعم ProblemDetails و FluentValidation (`errors`).
 */
export function orgApiErrorMessage(err, fallback = "حدث خطأ. تحقق من الحقول أو الاتصال بالخادم.") {
  const d = err?.response?.data
  const status = err?.response?.status
  if (typeof d === "string" && d.trim()) return d.trim()
  if (d && typeof d === "object") {
    const msg = d.message ?? d.Message ?? d.title ?? d.Title ?? d.detail ?? d.error
    if (msg != null && String(msg).trim()) return String(msg).trim()
    const errs = d.errors ?? d.Errors
    if (errs && typeof errs === "object") {
      const parts = []
      for (const [key, val] of Object.entries(errs)) {
        const v = Array.isArray(val) ? val.join(" ") : String(val)
        parts.push(`${key}: ${v}`)
      }
      if (parts.length) return parts.join("\n")
    }
  }
  if (err?.message && err.message !== "Network Error") return err.message
  if (status === 413) return "حجم الطلب كبير جداً."
  if (status === 400 || status === 422) return fallback
  return fallback
}
