import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { formatDateTimeEn } from "../../utils/formatEn"
import StatusBadge, { normalizeStatus } from "./StatusBadge"
import PriorityBadge from "./PriorityBadge"
import { toApiTicketStatus } from "./TicketLifecyclePipeline"

function MetaRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value || "—"}</span>
    </div>
  )
}

const STATUS_STEPS = [
  { value: "Open", label: "مفتوحة" },
  { value: "Pending", label: "معلّقة" },
  { value: "InProgress", label: "قيد التنفيذ" },
  { value: "Resolved", label: "محلولة" },
  { value: "Closed", label: "مغلقة" },
]

export default function TicketSidebar({
  ownerName,
  identityType,
  createdAt,
  lastReplyAt,
  status,
  priority,
  onStatusChange,
  onClose,
  statusBusy,
  closeBusy,
  disabled,
}) {
  const normalized = normalizeStatus(status)
  const currentStep = Math.max(
    0,
    STATUS_STEPS.findIndex((step) => step.value === normalized)
  )
  const progressPercent = STATUS_STEPS.length > 1 ? (currentStep / (STATUS_STEPS.length - 1)) * 100 : 0

  return (
    <Card className="sticky top-4 rounded-2xl border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/[0.04]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-brand-navy">بيانات التذكرة</CardTitle>
        <CardDescription className="text-[13px]">شريط الحالة بالأعلى ثم تفاصيل التذكرة بشكل مرتب.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Progress الحالة</p>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-teal-700/80 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            <div className="grid grid-cols-5">
              {STATUS_STEPS.map((step, idx) => {
                const isActive = idx === currentStep
                const isPassed = idx <= currentStep
                return (
                  <button
                    key={step.value}
                    type="button"
                    disabled={disabled || statusBusy}
                    onClick={() => onStatusChange?.(toApiTicketStatus(step.value))}
                    className={`min-h-10 border-slate-200/80 px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors disabled:opacity-60 sm:px-2 sm:text-[11px] ${
                      idx !== STATUS_STEPS.length - 1 ? "border-e" : ""
                    } ${
                      isActive
                        ? "bg-teal-700/10 text-teal-900"
                        : isPassed
                          ? "bg-slate-50/80 text-slate-700"
                          : "bg-white text-slate-500"
                    }`}
                  >
                    {step.label}
                  </button>
                )
              })}
            </div>
          </div>
          {statusBusy && <p className="mt-2 text-[11px] text-slate-500">جارٍ تحديث الحالة...</p>}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
          <div className="grid gap-2">
            <MetaRow label="المالك" value={ownerName} />
            <MetaRow label="نوع الهوية" value={identityType} />
            <MetaRow label="تاريخ الإنشاء" value={createdAt ? formatDateTimeEn(createdAt) : "—"} />
            <MetaRow label="آخر رد" value={lastReplyAt ? formatDateTimeEn(lastReplyAt) : "—"} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={status} />
            <PriorityBadge priority={priority} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={disabled || closeBusy}
              onClick={onClose}
              className="rounded-xl"
            >
              {closeBusy ? "جارٍ الإغلاق..." : "إغلاق التذكرة"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
