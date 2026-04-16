import { adminTextMuted } from "../../../lib/admin-ui"
import { Card, CardContent } from "../../../components/ui/card"

/**
 * Empty state component for admin pages
 */
export function EmptyState({
  icon: Icon = null,
  title = "لا توجد بيانات",
  description = "",
  action = null,
  className = "",
}) {
  return (
    <Card className={`border border-slate-200/70 bg-slate-50/30 ${className}`}>
      <CardContent className="py-12 text-center">
        <div className="space-y-3">
          {Icon && (
            <div className="flex justify-center">
              <Icon className="size-10 text-slate-400" strokeWidth={1.5} />
            </div>
          )}
          <div>
            <h3 className="font-medium text-slate-800">{title}</h3>
            {description && <p className={`text-sm mt-1 ${adminTextMuted}`}>{description}</p>}
          </div>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Error state component for admin pages
 */
export function ErrorState({
  title = "حدث خطأ",
  message = "فشل تحميل البيانات",
  action = null,
  className = "",
}) {
  return (
    <Card className={`border border-red-200 bg-red-50/50 ${className}`}>
      <CardContent className="py-8 text-center">
        <div className="space-y-3">
          <h3 className="font-medium text-red-800">{title}</h3>
          <p className="text-sm text-red-600">{message}</p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton with customizable rows/cards
 */
export function LoadingSkeletons({ type = "cards", count = 6, className = "" }) {
  if (type === "cards") {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-gradient-to-r from-slate-100 to-slate-50"
          />
        ))}
      </div>
    )
  }

  if (type === "table") {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded bg-gradient-to-r from-slate-100 to-slate-50"
          />
        ))}
      </div>
    )
  }

  return null
}
