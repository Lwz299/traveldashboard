import { normalizeStatus } from "./StatusBadge"

/**
 * مراحل دورة الحياة (يسار → يمين — dir=ltr على الحاوية)
 * القيم تُرسل للـ API بعد التحويل عبر toApiTicketStatus عند الحاجة
 */
export const TICKET_LIFECYCLE_STEPS = [
  { value: "Open", label: "Open" },
  { value: "Pending", label: "Pending" },
  { value: "InProgress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Closed", label: "Closed" },
]

/** تحويل خطوة الواجهة إلى قيمة يتوقعها الخادم (مثلاً Canceled بدل Closed) */
export function toApiTicketStatus(uiStep) {
  if (uiStep === "Closed") return "Canceled"
  return uiStep
}

export function getLifecycleStepIndex(status) {
  const s = normalizeStatus(status)
  const i = TICKET_LIFECYCLE_STEPS.findIndex((st) => st.value === s)
  return i >= 0 ? i : 0
}

/**
 * Chevron progress bar — شرائح متشابكة (يسار: مستقيم | يمين: سهم)، ترتيب z-index تصاعدي ليظهر كل سهم فوق السابق.
 */
export function TicketLifecyclePipeline({ status, onSelectStep, disabled, busy, heading = "Ticket lifecycle" }) {
  const normalized = normalizeStatus(status)
  const current = getLifecycleStepIndex(normalized)
  const steps = TICKET_LIFECYCLE_STEPS
  const isInteractive = !disabled && !busy

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
        {heading}
      </p>
      <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="mx-auto flex h-14 min-w-[min(100%,720px)] max-w-5xl items-stretch overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/70 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
          dir="ltr"
          role="group"
          aria-label="Chevron progress bar — ticket status"
        >
          {steps.map((step, idx) => {
            const isDone = idx < current
            const isCurrent = idx === current
            const isFirst = idx === 0
            const isLast = idx === steps.length - 1

            const shapeClass = isFirst ? "chevron-clip-first" : isLast ? "chevron-clip-last" : "chevron-clip"
            const overlapClass = isFirst ? "" : "-ml-[18px]"
            const zClass = isCurrent ? "relative z-20" : isDone ? "relative z-10" : "relative z-[1]"

            const colorClass = isCurrent
              ? "active-gradient text-white"
              : isDone
              ? "bg-sky-600 text-white"
              : "bg-slate-200 text-slate-700"

            return (
              <button
                key={step.value}
                type="button"
                disabled={!isInteractive}
                aria-current={isCurrent ? "step" : undefined}
                title={step.label}
                onClick={() => onSelectStep?.(step.value)}
                className={[
                  "flex flex-1 items-center px-6 text-left font-semibold transition-all duration-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]",
                  "min-w-[128px] sm:min-w-[120px]",
                  shapeClass,
                  overlapClass,
                  zClass,
                  colorClass,
                  isInteractive ? "cursor-pointer hover:brightness-[1.03]" : "cursor-not-allowed opacity-95",
                ].join(" ")}
              >
                <span className="truncate">{step.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-400 sm:text-[11px]">
        مفتوحة ← معلّقة ← قيد التنفيذ ← محلولة ← مغلقة
      </p>
      {busy && <p className="mt-2 text-center text-[11px] text-slate-500">جارٍ تحديث الحالة...</p>}
    </div>
  )
}
