import api from "./api"

function pick(obj, keys, fallback = undefined) {
  if (!obj || typeof obj !== "object") return fallback
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k]
      if (v !== undefined && v !== null) return v
    }
  }
  return fallback
}

function extractItems(data) {
  if (Array.isArray(data)) return data
  const fromKeys = pick(data, ["items", "Items", "images", "Images", "data", "Data"])
  return Array.isArray(fromKeys) ? fromKeys : []
}

export function normalizeEventImage(row) {
  const url = pick(row, ["url", "Url", "imageUrl", "ImageUrl"])
  const id = pick(row, ["id", "Id", "imageId", "ImageId"])
  const isCover = Boolean(pick(row, ["isCover", "IsCover", "cover", "Cover"], false))
  const sortOrder = pick(row, ["sortOrder", "SortOrder"])
  return {
    ...row,
    id,
    url: url != null ? String(url) : "",
    isCover,
    sortOrder: sortOrder != null && Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : undefined,
  }
}

/**
 * POST /api/events/{eventId}/images/upload — multipart: `file`, `isCover`, `sortOrder` (دليل لوحة المنظمة).
 * يُرفع ملفاً واحداً لكل طلب؛ عدة ملفات = عدة طلبات متسلسلة.
 */
export async function uploadEventImages(eventId, files, coverIndex = 0) {
  const list = Array.from(files ?? []).filter(Boolean)
  if (!eventId || list.length === 0) return []
  const uploaded = []
  for (let i = 0; i < list.length; i += 1) {
    const fd = new FormData()
    fd.append("file", list[i])
    fd.append("isCover", String(i === coverIndex))
    fd.append("sortOrder", String(i))
    const { data } = await api.post(`/events/${eventId}/images/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    const rows = extractItems(data).map(normalizeEventImage)
    uploaded.push(...rows)
  }
  return uploaded
}

/** PUT /api/events/{id}/images/{imageId} — استبدال ملف الصورة */
export async function replaceEventImageFile(eventId, imageId, file) {
  if (!eventId || !imageId || !file) return
  const fd = new FormData()
  fd.append("file", file)
  await api.put(`/events/${eventId}/images/${imageId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  })
}

/**
 * PATCH /api/events/{id}/images/{imageId} — JSON: `sortOrder` و/أو `isCover` (دون رفع ملف).
 * يجب أن يُمرَّر حقل واحد على الأقل من جهة الخادم.
 */
export async function patchEventImage(eventId, imageId, body) {
  if (!eventId || !imageId || !body || typeof body !== "object") return
  await api.patch(`/events/${eventId}/images/${imageId}`, body)
}

/**
 * حذف صورة فعالية.
 * يُفضّل: `DELETE /api/events/images/by-id/{imageId}` — يحتاج فقط `imageId` من `GET /api/events/{id}` → `images[].id`.
 * احتياطي: `DELETE /api/events/{eventId}/images/{imageId}` إن لم يكن المسار الجديد منشوراً.
 *
 * @param {string|number} imageId — من `images[].id` (ليس sortOrder ولا ترتيب العرض)
 * @param {string|number} [eventId] — للمسار الاحتياطي فقط
 */
export async function deleteEventImage(imageId, eventId) {
  if (imageId == null || imageId === "") return
  const sid = encodeURIComponent(String(imageId))
  try {
    await api.delete(`/events/images/by-id/${sid}`)
  } catch (err) {
    const status = err.response?.status
    if (eventId != null && eventId !== "" && (status === 404 || status === 405)) {
      await api.delete(`/events/${eventId}/images/${sid}`)
      return
    }
    throw err
  }
}
