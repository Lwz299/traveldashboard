import api from "./api"
import { extractVideosList, normalizeVideo } from "../utils/videoDisplay"

/**
 * GET /api/admin/videos
 * @param {{ page?: number, pageSize?: number, status?: string|number, organizationId?: number|string }} params
 */
export async function fetchVideos(params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20))
  const query = { page, pageSize }
  if (params.status != null && params.status !== "") query.status = params.status
  if (params.organizationId != null && params.organizationId !== "") {
    query.organizationId = params.organizationId
  }
  const { data } = await api.get("/admin/videos", { params: query })
  const items = extractVideosList(data).map(normalizeVideo).filter(Boolean)
  const totalCount =
    Number(data?.totalCount ?? data?.TotalCount ?? data?.total ?? data?.Total) || items.length
  return { items, totalCount, page, pageSize }
}

/** POST /api/admin/videos */
export async function createVideoDraft(payload) {
  const { data } = await api.post("/admin/videos", payload)
  return normalizeVideo(data?.video ?? data?.Video ?? data) ?? data
}

/** POST /api/admin/videos/{id}/upload — multipart field `file` */
export async function uploadVideoFile(videoId, file) {
  const fd = new FormData()
  fd.append("file", file)
  const { data } = await api.post(`/admin/videos/${videoId}/upload`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return normalizeVideo(data?.video ?? data?.Video ?? data) ?? data
}

/** POST /api/admin/videos/{id}/thumbnail */
export async function uploadVideoThumbnail(videoId, file) {
  const fd = new FormData()
  fd.append("file", file)
  const { data } = await api.post(`/admin/videos/${videoId}/thumbnail`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return normalizeVideo(data?.video ?? data?.Video ?? data) ?? data
}

export async function publishVideo(videoId) {
  const { data } = await api.patch(`/admin/videos/${videoId}/publish`)
  return data
}

export async function submitVideoReview(videoId) {
  const { data } = await api.patch(`/admin/videos/${videoId}/submit-review`)
  return data
}

export async function approveVideo(videoId) {
  const { data } = await api.patch(`/admin/videos/${videoId}/approve`)
  return data
}

export async function suspendVideo(videoId, reason) {
  const { data } = await api.patch(`/admin/videos/${videoId}/suspend`, { reason: reason || "" })
  return data
}

export async function archiveVideo(videoId) {
  const { data } = await api.patch(`/admin/videos/${videoId}/archive`)
  return data
}

export async function deleteVideo(videoId) {
  const { data } = await api.delete(`/admin/videos/${videoId}`)
  return data
}
