import { Ticket } from "lucide-react"
import { formatDateTimeEn } from "../../utils/formatEn"
import StatusBadge from "./StatusBadge"
import PriorityBadge from "./PriorityBadge"

export default function TicketHeader({
  ticketNumber,
  subject,
  status,
  priority,
  createdAt,
  ownerLabel,
  identityTypeLabel,
}) {
  return (
    <header className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">تذكرة الدعم #{ticketNumber || "—"}</p>
          <h1 className="mt-1 truncate text-xl font-semibold text-slate-900 md:text-2xl">{subject || "بدون عنوان"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Ticket className="size-3.5" aria-hidden />
              {identityTypeLabel || "—"}
            </span>
            <span>•</span>
            <span>{ownerLabel || "—"}</span>
            <span>•</span>
            <span>{createdAt ? formatDateTimeEn(createdAt) : "—"}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <PriorityBadge priority={priority} />
        </div>
      </div>
    </header>
  )
}
