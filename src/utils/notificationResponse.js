/** تنسيق ردود API الإشعارات (camelCase أو PascalCase من ASP.NET) */
export function formatNotifyResponse(data) {
  if (!data || typeof data !== "object") return ""
  const msg = data.message ?? data.Message
  const n = data.usersNotified ?? data.UsersNotified
  const bid = data.broadcastId ?? data.BroadcastId
  const parts = []
  if (msg) parts.push(String(msg))
  if (n != null && Number.isFinite(Number(n))) parts.push(`أُبلِغ ${Number(n)} مستخدماً`)
  if (bid != null && bid !== "") parts.push(`سجل البث: #${bid}`)
  return parts.join(" — ") || "تم الإرسال"
}
