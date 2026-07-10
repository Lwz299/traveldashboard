/**
 * حجوزات المنظمة (Booking v2) مع تراجع تلقائي إلى `/orders/organization` (v1).
 */
import api from "./api"
import {
  normalizeOrdersListPayload,
  normalizeOrderDetailPayload,
} from "../utils/orderNormalize"

function isNotFound(err) {
  const st = err?.response?.status
  return st === 404 || st === 405
}

/** @returns {Promise<unknown[]>} */
export async function fetchOrganizationBookings() {
  try {
    const { data } = await api.get("/bookings/organization")
    return normalizeOrdersListPayload(data)
  } catch (err) {
    if (!isNotFound(err)) throw err
    const { data } = await api.get("/orders/organization")
    return normalizeOrdersListPayload(data)
  }
}

/** @returns {Promise<object|null>} */
export async function fetchOrganizationBookingDetail(bookingId) {
  const id = bookingId != null ? String(bookingId) : ""
  if (!id) return null

  const paths = [`/bookings/organization/${id}`, `/orders/organization/${id}`]
  let lastErr = null
  for (const path of paths) {
    try {
      const { data } = await api.get(path)
      return normalizeOrderDetailPayload(data)
    } catch (err) {
      lastErr = err
      if (!isNotFound(err)) throw err
    }
  }
  if (lastErr) throw lastErr
  return null
}
