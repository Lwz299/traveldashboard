/**
 * Admin UI Constants
 * Status mappings, colors, and styling
 */

export const STATUS_LABELS = {
  Pending: "معلق",
  Approved: "معتمد",
  Approved_Verified: "معتمد مؤكد",
  Rejected: "مرفوض",
  Draft: "مسودة",
  Published: "منشور",
  Cancelled: "ملغي",
  Active: "نشط",
  Inactive: "غير نشط",
  Completed: "مكتمل",
  InProgress: "جاري",
  Open: "مفتوح",
  Closed: "مغلق",
}

export const STATUS_COLORS = {
  Pending: "bg-amber-50 text-amber-900 ring-amber-200/80",
  Approved: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  Approved_Verified: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  Rejected: "bg-red-50 text-red-800 ring-red-200/80",
  Draft: "bg-slate-100 text-slate-700 ring-slate-200/80",
  Published: "bg-blue-50 text-blue-800 ring-blue-200/80",
  Cancelled: "bg-red-50 text-red-800 ring-red-200/80",
  Active: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  Inactive: "bg-slate-100 text-slate-700 ring-slate-200/80",
  Completed: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  InProgress: "bg-sky-50 text-sky-900 ring-sky-200/80",
  Open: "bg-blue-50 text-blue-800 ring-blue-200/80",
  Closed: "bg-slate-100 text-slate-700 ring-slate-200/80",
}

/**
 * Get status badge class
 */
export function getStatusClass(status, colorMap = STATUS_COLORS) {
  return colorMap[status] || "bg-slate-50 text-slate-700 ring-slate-200/80"
}

/**
 * Get status label
 */
export function getStatusLabel(status, labelMap = STATUS_LABELS) {
  return labelMap[status] || status
}

/**
 * Navigation items for admin sidebar
 */
export const ADMIN_NAV_ITEMS = [
  { to: "/admin", icon: "LayoutDashboard", label: "لوحة التحكم", end: true },
  { to: "/admin/partners", icon: "Building2", label: "طلبات الشركاء", end: false },
  { to: "/admin/organizations", icon: "Users", label: "المنظمات", end: false },
  { to: "/admin/events", icon: "Calendar", label: "الفعاليات", end: false },
  { to: "/admin/categories", icon: "FolderTree", label: "التصنيفات", end: false },
  { to: "/admin/reports", icon: "BarChart3", label: "التقارير", end: false },
  { to: "/admin/finance", icon: "Landmark", label: "المالية", end: false },
  { to: "/admin/payouts", icon: "Wallet", label: "طلبات السحب", end: false },
  { to: "/admin/notifications", icon: "Megaphone", label: "إشعار جماعي", end: false },
  { to: "/admin/support", icon: "LifeBuoy", label: "الدعم الفني", end: false },
]

/**
 * Page title mapping for breadcrumbs
 */
export const ROUTE_TITLES = {
  "/admin": "لوحة التحكم",
  "/admin/partners": "طلبات الشركاء",
  "/admin/organizations": "المنظمات",
  "/admin/events": "الفعاليات",
  "/admin/categories": "التصنيفات",
  "/admin/reports": "التقارير",
  "/admin/finance": "المالية",
  "/admin/payouts": "طلبات السحب",
  "/admin/notifications": "إشعار جماعي",
  "/admin/support": "الدعم الفني",
}

/**
 * Default filters for admin lists
 */
export const DEFAULT_FILTERS = {
  events: {
    search: "",
    status: "all",
    dateRange: "all",
  },
  organizations: {
    search: "",
    status: "all",
  },
  supportTickets: {
    search: "",
    status: "all",
    priority: "all",
  },
  partners: {
    search: "",
    status: "all",
  },
}
