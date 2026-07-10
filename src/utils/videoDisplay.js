import { firstDefinedNonEmpty as pick } from "./firstDefined"

export const VIDEO_STATUS = {
  Draft: 0,
  PendingReview: 1,
  Published: 2,
  Suspended: 3,
  Archived: 4,
  Deleted: 5,
}

export const VIDEO_STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "0", label: "مسودة" },
  { value: "1", label: "بانتظار المراجعة" },
  { value: "2", label: "منشور" },
  { value: "3", label: "موقوف" },
  { value: "4", label: "مؤرشف" },
]

export const TARGET_TYPE_OPTIONS = [
  { value: "Trip", label: "رحلة" },
  { value: "Destination", label: "وجهة" },
  { value: "General", label: "عام" },
  { value: "Organization", label: "الشركة" },
]

export function extractVideosList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []
  return (
    data.items ??
    data.Items ??
    data.videos ??
    data.Videos ??
    data.data ??
    data.Data ??
    []
  )
}

export function normalizeVideo(row) {
  if (!row || typeof row !== "object") return null
  const rawStatus = pick(row, ["status", "Status", "videoStatus", "VideoStatus"])
  let statusNum = null
  if (typeof rawStatus === "number" && Number.isFinite(rawStatus)) statusNum = rawStatus
  else if (typeof rawStatus === "string" && rawStatus in VIDEO_STATUS) {
    statusNum = VIDEO_STATUS[rawStatus]
  } else if (typeof rawStatus === "string" && /^\d+$/.test(rawStatus)) {
    statusNum = Number(rawStatus)
  }

  return {
    ...row,
    id: pick(row, ["id", "Id"]),
    title: pick(row, ["title", "Title"], ""),
    description: pick(row, ["description", "Description"], ""),
    status: statusNum ?? rawStatus,
    statusName: videoStatusNameFromRaw(rawStatus),
    targetType: pick(row, ["targetType", "TargetType"], ""),
    targetId: pick(row, ["targetId", "TargetId"]),
    targetLabel: pick(row, ["targetLabel", "TargetLabel"], ""),
    organizationId: pick(row, ["organizationId", "OrganizationId"]),
    organizationName: pick(row, ["organizationName", "OrganizationName"], ""),
    url: pick(row, ["url", "Url", "videoUrl", "VideoUrl", "externalUrl", "ExternalUrl"], ""),
    thumbnailUrl: pick(row, ["thumbnailUrl", "ThumbnailUrl"], ""),
    createdAt: pick(row, ["createdAt", "CreatedAt"]),
    publishedAt: pick(row, ["publishedAt", "PublishedAt"]),
    suspendReason: pick(row, ["suspendReason", "SuspendReason"], ""),
  }
}

function videoStatusNameFromRaw(raw) {
  if (typeof raw === "string" && raw in VIDEO_STATUS) return raw
  if (typeof raw === "number") {
    const entry = Object.entries(VIDEO_STATUS).find(([, v]) => v === raw)
    return entry ? entry[0] : String(raw)
  }
  return raw != null ? String(raw) : ""
}

export function videoStatusLabelAr(raw) {
  const name = videoStatusNameFromRaw(raw)
  const s = String(name).toLowerCase()
  if (s === "draft" || raw === 0) return "مسودة"
  if (s === "pendingreview" || raw === 1) return "بانتظار المراجعة"
  if (s === "published" || raw === 2) return "منشور"
  if (s === "suspended" || raw === 3) return "موقوف"
  if (s === "archived" || raw === 4) return "مؤرشف"
  if (s === "deleted" || raw === 5) return "محذوف"
  return name || "—"
}

export function videoStatusBadgeClass(raw) {
  const name = videoStatusNameFromRaw(raw)
  const s = String(name).toLowerCase()
  if (s === "published" || raw === 2) return "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
  if (s === "pendingreview" || raw === 1) return "bg-amber-50 text-amber-900 ring-amber-200/80"
  if (s === "draft" || raw === 0) return "bg-slate-50 text-slate-800 ring-slate-200/80"
  if (s === "suspended" || raw === 3) return "bg-rose-50 text-rose-900 ring-rose-200/80"
  if (s === "archived" || raw === 4) return "bg-slate-100 text-slate-600 ring-slate-200/70"
  return "bg-slate-50 text-slate-700 ring-slate-200/70"
}

export function targetTypeLabelAr(raw) {
  const s = String(raw ?? "")
  if (s === "Trip") return "رحلة"
  if (s === "Destination") return "وجهة"
  if (s === "General") return "عام"
  if (s === "Organization") return "الشركة"
  return s || "—"
}
