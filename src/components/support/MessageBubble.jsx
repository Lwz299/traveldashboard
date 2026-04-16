import { User, Shield } from "lucide-react"
import { formatDateTimeEn } from "../../utils/formatEn"

export default function MessageBubble({ body, timestamp, isAdmin }) {
  return (
    <div className={`flex items-end gap-2 ${isAdmin ? "justify-start" : "justify-end"}`}>
      {isAdmin && (
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-slate-100 text-slate-600">
          <Shield className="size-4" aria-hidden />
        </span>
      )}

      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isAdmin
            ? "border-slate-200/80 bg-white text-slate-900"
            : "border-teal-200/80 bg-teal-50/70 text-slate-900"
        }`}
      >
        <p>{body || "—"}</p>
        <p className="mt-2 text-[11px] text-slate-500">{timestamp ? formatDateTimeEn(timestamp) : "—"}</p>
      </div>

      {!isAdmin && (
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-teal-200/80 bg-teal-50/70 text-teal-800">
          <User className="size-4" aria-hidden />
        </span>
      )}
    </div>
  )
}
