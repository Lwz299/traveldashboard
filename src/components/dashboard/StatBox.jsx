import DashboardCard from "./DashboardCard"
import AdminKpiValue from "../admin/AdminKpiValue"
import { cn } from "../../lib/utils.mjs"

export default function StatBox({ label, value, hint, icon, tone, className, valueClassName }) {
  return (
    <DashboardCard
      title={label}
      icon={icon}
      iconTone={tone}
      className={cn("transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md", className)}
      contentClassName="pt-0"
    >
      <div className="space-y-1">
        <AdminKpiValue value={value} size="compact" as="div" className={cn("w-full", valueClassName)} />
        {hint && <p className="line-clamp-1 text-xs text-slate-500">{hint}</p>}
      </div>
    </DashboardCard>
  )
}
