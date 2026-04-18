/**
 * استخراج أخطاء الـ API المنظّمة (camelCase) كما في ASP.NET ProblemDetails / رموز العمل.
 */

function pickStr(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

/**
 * فعالية غير متاحة للعرض العام (محذوفة ناعماً) — GET /api/events/{id} → 404
 * @param {unknown} err خطأ Axios
 * @returns {{ notAvailable: true, code: string, message: string, hint: string } | null}
 */
export function parseEventNotAvailableError(err) {
  const status = err?.response?.status
  if (status !== 404) return null
  const d = err?.response?.data
  if (!d || typeof d !== "object") return null
  const code = pickStr(d.code, d.Code)
  if (code !== "EVENT_NOT_AVAILABLE") return null
  return {
    notAvailable: true,
    code,
    message: pickStr(d.message, d.Message, d.title, d.Title) || "هذه الفعالية لم تعد متاحة.",
    hint: pickStr(d.hint, d.Hint) || "يمكنك العودة للصفحة الرئيسية أو تصفح الفعاليات الأخرى.",
  }
}

/**
 * تعارض عند الحذف (مبيعات/تذاكر) — 409
 * @param {unknown} err
 * @returns {{ conflict: true, code: string, message: string, suggestedAction?: string, hint?: string, auditHint?: string, confirmQuery?: boolean } | null}
 */
export function parseConflictError(err) {
  const status = err?.response?.status
  if (status !== 409) return null
  const d = err?.response?.data
  if (!d || typeof d !== "object") {
    return {
      conflict: true,
      code: "",
      message: typeof err?.response?.data === "string" ? err.response.data : "تعارض مع حالة الخادم.",
    }
  }
  return {
    conflict: true,
    code: pickStr(d.code, d.Code),
    message: pickStr(d.message, d.Message, d.title, d.Title) || "لا يمكن إتمام العملية.",
    suggestedAction: pickStr(d.suggestedAction, d.SuggestedAction) || undefined,
    hint: pickStr(d.hint, d.Hint) || undefined,
    auditHint: pickStr(d.auditHint, d.AuditHint) || undefined,
    confirmQuery: Boolean(d.confirmQuery ?? d.ConfirmQuery ?? d.confirmFinancialDeletion),
  }
}
