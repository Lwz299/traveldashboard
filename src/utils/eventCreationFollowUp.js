/**
 * بعد POST /events — إضافة أجندة وأنواع تذاكر عبر نفس واجهات صفحة تفاصيل الفعالية.
 */

/**
 * @param {Array<{ title?: string, time?: string, description?: string }>} agendaRows
 * @param {Array<{ name?: string, description?: string, price?: string|number, capacity?: string|number, userSegmentId?: string }>} ticketRows
 */
export function validateEventCreationAgendaAndTickets(agendaRows, ticketRows) {
  const agenda = (agendaRows ?? [])
    .map((r) => ({
      title: (r.title ?? "").trim(),
      time: (r.time ?? "").trim(),
      description: (r.description ?? "").trim(),
    }))
    .filter((r) => r.title.length > 0)

  if (agenda.length === 0) {
    return {
      ok: false,
      message: "أضف بنداً واحداً على الأقل في الأجندة (عنوان البند مطلوب).",
    }
  }

  const namedTickets = (ticketRows ?? []).filter((r) => (r.name ?? "").trim().length > 0)
  if (namedTickets.length === 0) {
    return {
      ok: false,
      message: "أضف نوع تذكرة واحداً على الأقل (اسم النوع والسعر والسعة مطلوبة).",
    }
  }

  const tickets = []
  for (let i = 0; i < namedTickets.length; i++) {
    const r = namedTickets[i]
    const name = (r.name ?? "").trim()
    const price = Number(r.price)
    const capacity = Number(r.capacity)
    if (!Number.isFinite(price) || price < 0) {
      return {
        ok: false,
        message: `أدخل سعراً صحيحاً (≥ 0) لنوع التذكرة «${name || `#${i + 1}`}».`,
      }
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return {
        ok: false,
        message: `أدخل سعة صحيحة أكبر من صفر لنوع التذكرة «${name}».`,
      }
    }
    let userSegmentId = null
    if (r.userSegmentId !== "" && r.userSegmentId != null) {
      const n = Number(r.userSegmentId)
      if (Number.isFinite(n)) userSegmentId = n
    }
    tickets.push({
      name,
      description: (r.description ?? "").trim(),
      price,
      capacity: Math.floor(capacity),
      userSegmentId,
    })
  }

  return { ok: true, agenda, tickets }
}

/**
 * @param {{ post: (url: string, body?: object) => Promise<unknown> }} api
 * @param {string|number} eventId
 * @param {Array<{ title: string, time: string, description: string }>} agenda
 * @param {Array<{ name: string, description: string, price: number, capacity: number, userSegmentId: number|null }>} tickets
 */
export async function applyAgendaAndTicketsAfterEventCreate(api, eventId, agenda, tickets) {
  const id = Number(eventId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("معرّف الفعالية غير صالح بعد الإنشاء")
  }

  for (const row of agenda) {
    await api.post(`/events/${id}/agenda`, {
      title: row.title,
      time: row.time,
      description: row.description,
    })
  }

  for (const t of tickets) {
    await api.post("/ticket-types", {
      eventId: id,
      name: t.name,
      description: t.description || undefined,
      price: t.price,
      capacity: t.capacity,
      userSegmentId: t.userSegmentId,
    })
  }
}

export function defaultAgendaRow() {
  return { title: "", time: "", description: "" }
}

export function defaultTicketTypeRow() {
  return { name: "", description: "", price: "", capacity: "100", userSegmentId: "" }
}
