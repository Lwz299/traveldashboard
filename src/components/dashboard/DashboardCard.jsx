import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { cn } from "../../lib/utils.mjs"

export default function DashboardCard({
  title,
  description,
  icon: Icon,
  iconTone = "bg-slate-100 text-slate-700 ring-slate-200/80",
  className,
  contentClassName,
  headerClassName,
  children,
}) {
  return (
    <Card
      className={cn(
        "h-full rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.03]",
        className
      )}
    >
      {(title || description || Icon) && (
        <CardHeader className={cn("space-y-1.5 p-4 pb-2 sm:p-5 sm:pb-3", headerClassName)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <CardTitle className="truncate text-sm font-semibold text-slate-900">{title}</CardTitle>}
              {description && <CardDescription className="mt-1 text-xs text-slate-500">{description}</CardDescription>}
            </div>
            {Icon && (
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl ring-1", iconTone)}>
                <Icon className="size-4" strokeWidth={1.8} />
              </span>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("p-4 pt-0 sm:p-5 sm:pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  )
}
