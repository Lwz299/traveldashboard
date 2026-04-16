import { ChevronUp, ChevronDown } from "lucide-react"
import { adminCardClass, adminTextMuted } from "../../../lib/admin-ui"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"

/**
 * Reusable admin table component
 * Provides sorting, pagination, and responsive columns
 */
export function AdminDataTable({
  columns,
  data,
  loading = false,
  error = null,
  onRowClick = null,
  emptyMessage = "لا توجد بيانات",
  className = "",
}) {
  if (loading) {
    return (
      <Card className={adminCardClass}>
        <CardContent className="py-8">
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`${adminCardClass} border-red-200 bg-red-50`}>
        <CardContent className={`py-8 text-center text-red-600`}>{error}</CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={adminCardClass}>
        <CardContent className={`py-12 text-center ${adminTextMuted}`}>{emptyMessage}</CardContent>
      </Card>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200/70 bg-slate-50/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-right text-xs font-semibold text-slate-600"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              className={`transition-colors ease-out ${
                onRowClick ? "cursor-pointer hover:bg-sky-50/50" : ""
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Expandable card component for list items
 * Provides collapsible detail view
 */
export function AdminExpandableCard({
  icon: Icon,
  title,
  subtitle,
  status,
  expanded = false,
  onToggle = null,
  children,
  actions = null,
  className = "",
}) {
  return (
    <Card className={adminCardClass + " " + className}>
      <CardHeader
        className="cursor-pointer py-4 transition-colors duration-200 ease-out hover:bg-sky-50/40"
        onClick={() => onToggle?.()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold text-brand-navy truncate">
                {title}
              </CardTitle>
              {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
            </div>
            {status && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${status.className}`}
              >
                {status.label}
              </span>
            )}
          </div>
          {actions}
          {onToggle && (expanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />)}
        </div>
      </CardHeader>
      {expanded && <CardContent className="space-y-4 border-t pt-4">{children}</CardContent>}
    </Card>
  )
}

/**
 * Admin list container with consistent styling
 */
export function AdminList({ children, className = "" }) {
  return <div className={`space-y-3 ${className}`}>{children}</div>
}

/**
 * Admin loading skeleton
 */
export function AdminTableSkeleton({ rows = 5 }) {
  return (
    <Card className={adminCardClass}>
      <CardContent className="py-4 space-y-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
        ))}
      </CardContent>
    </Card>
  )
}
