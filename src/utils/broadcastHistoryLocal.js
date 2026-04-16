/** نسخة احتياطية محلية لسجل البث عندما لا يتوفر GET من الخادم بعد */
const STORAGE_KEY = "dashboard.superAdmin.broadcasts.v1"
const MAX = 200

export function getLocalBroadcastHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/** يُستدعى بعد نجاح POST broadcast-all لضمان ظهور السجل في الجدول السفلي */
export function appendLocalBroadcastHistory({ title, body }) {
  const entry = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: String(title).trim(),
    body: String(body).trim(),
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
  }
  const prev = getLocalBroadcastHistory()
  const next = [entry, ...prev].slice(0, MAX)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return entry
}
