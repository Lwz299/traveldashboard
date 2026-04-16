import { useCallback, useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MessageCircle, Send, X, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "../ui/button"

const EASE = [0.4, 0, 0.2, 1]

const ORG_SUGGESTIONS = [
  "كيف أقرأ أرقام التقارير؟",
  "لماذا تظهر شرطات بدل الأرقام؟",
  "المحفظة وطلب السحب",
]

const ADMIN_SUGGESTIONS = ["التقارير المركزية", "مراجعة المنظمات", "طلبات السحب"]

function replyForMessage(text, variant) {
  const t = text.trim()
  if (/تقرير|ملخص|أرقام|مبيعات|أداء/i.test(t)) {
    return {
      body:
        "قسم التقارير يعرض ملخص منظمتك من الخادم. إذا ظهرت شرطات (—) فغالباً لا توجد بيانات بعد أو الحقل غير محسوب في الـ API. تأكد من وجود حجوزات وفعاليات منشورة. الأرقام تُحدَّث بعد تسجيل المبيعات والمسافرين.",
    }
  }
  if (/شرط|—|لا تظهر|فارغ|empty|dash/i.test(t)) {
    return {
      body:
        "الواجهة تعرض شرطاً عندما يكون الحقل غير متوفر أو صفراً غير مُرجَع من الخادم. جرّب تحديث الصفحة؛ إذا استمر الأمر، قد يستخدم الخادم أسماء حقول مختلفة — تمت معالجة ذلك تلقائياً قدر الإمكان.",
    }
  }
  if (/محفظ|سحب|payout|wallet/i.test(t)) {
    return {
      body:
        "من قائمة «المحفظة» يمكنك مراجعة الرصيد وطلب السحب حسب سياسة المنصة. حالة الطلب تظهر في سجل السحوبات.",
    }
  }
  if (/رحل|فعال|event|نشاط/i.test(t)) {
    return {
      body:
        "أنشئ الرحلات من «الرحلات»، ثم انشرها ليظهر الحجز للزبائن. بعد ذلك تظهر المبيعات والمسافرون في لوحة التحكم والتقارير.",
    }
  }
  if (/مستخدم|موظف|org-user|صلاح/i.test(t)) {
    return {
      body:
        variant === "admin"
          ? "من لوحة السوبر أدمن تدير المنظمات والتصنيفات والتقارير المركزية."
          : "من «مستخدمو المنظمة» يمكن لمدير المنظمة دعوة موظفين بصلاحيات محددة.",
    }
  }
  return {
    body:
      variant === "admin"
        ? "يمكنك استخدام القائمة الجانبية للوصول السريع إلى الشركاء، المنظمات، التقارير، والإشعارات الجماعية. للدعم الفني تواصل مع فريق المنصة."
        : "نحن هنا لمساعدتك في التنقل: التقارير، الرحلات، المبيعات، والمحفظة. للمسائل الفنية المتقدمة راسل فريق الدعم.",
  }
}

export default function SupportChat({ variant = "org" }) {
  const navigate = useNavigate()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      role: "assistant",
      text:
        variant === "admin"
          ? "مرحباً بك في غرفة التحكم. اسأل عن التقارير أو إدارة المنصة."
          : "مرحباً. اسأل عن التقارير، المحفظة، أو إدارة الرحلات — إجابات سريعة دون مغادرة الصفحة.",
    },
  ])
  const listRef = useRef(null)

  const accent =
    variant === "admin"
      ? {
          fab: "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800",
          panel: "border-slate-200/90 bg-white",
          bubbleUser: "bg-slate-900 text-white",
          bubbleBot: "bg-slate-50 text-slate-800 border border-slate-100",
          chip: "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50",
        }
      : {
          fab: "bg-teal-800 text-white shadow-lg shadow-teal-900/25 hover:bg-teal-900",
          panel: "border-teal-900/10 bg-white",
          bubbleUser: "bg-teal-800 text-white",
          bubbleBot: "bg-teal-50/80 text-slate-800 border border-teal-100/80",
          chip: "border-teal-200/80 bg-white text-teal-950 hover:bg-teal-50/90",
        }

  const suggestions = variant === "admin" ? ADMIN_SUGGESTIONS : ORG_SUGGESTIONS

  const scrollToEnd = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    scrollToEnd()
  }, [messages, open, scrollToEnd])

  const send = useCallback(
    (raw) => {
      const text = typeof raw === "string" ? raw : input.trim()
      if (!text) return
      const userMsg = { id: `u-${Date.now()}`, role: "user", text }
      setMessages((m) => [...m, userMsg])
      setInput("")
      const { body } = replyForMessage(text, variant)
      window.setTimeout(() => {
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: body }])
      }, 280)
    },
    [input, variant]
  )

  return (
    <div
      className={`pointer-events-none fixed bottom-0 end-0 z-[60] flex flex-col items-end p-4 md:p-6 ${
        variant === "org"
          ? "pb-[max(5rem,env(safe-area-inset-bottom))]"
          : "pb-[max(1rem,env(safe-area-inset-bottom))]"
      }`}
    >
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            id={`${id}-panel`}
            key="panel"
            role="dialog"
            aria-labelledby={`${id}-title`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className={`pointer-events-auto mb-3 flex max-h-[min(72vh,520px)] w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border shadow-2xl shadow-slate-900/10 ${accent.panel}`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100/90 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p id={`${id}-title`} className="text-sm font-semibold tracking-tight text-slate-900">
                    مساعد سريع
                  </p>
                  <p className="text-[11px] text-slate-500">إجابات فورية · واجهة خفيفة</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden rounded-xl text-slate-600 hover:text-slate-900 md:inline-flex"
                onClick={() => {
                  setOpen(false)
                  navigate(variant === "admin" ? "/admin/support" : "/support")
                }}
              >
                تذاكري
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-xl text-slate-500 hover:text-slate-900"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
              style={{ maxHeight: "min(52vh, 360px)" }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                      msg.role === "user" ? accent.bubbleUser : accent.bubbleBot
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100/90 px-3 py-2">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                اقتراحات
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200 ease-out ${accent.chip}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <form
              className="flex gap-2 border-t border-slate-100/90 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
            >
              <label htmlFor={`${id}-input`} className="sr-only">
                رسالة
              </label>
              <input
                id={`${id}-input`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك…"
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-800/25"
              />
              <Button
                type="submit"
                size="icon"
                className={`size-11 shrink-0 rounded-xl ${variant === "admin" ? "bg-slate-900 hover:bg-slate-800" : "bg-teal-800 hover:bg-teal-900"}`}
                aria-label="إرسال"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        layout
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={() => setOpen((o) => !o)}
        className={`pointer-events-auto flex size-14 items-center justify-center rounded-2xl md:size-12 ${accent.fab}`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label={open ? "إغلاق المساعد" : "فتح مساعد سريع"}
      >
        {open ? <X className="size-6 md:size-5" /> : <MessageCircle className="size-6 md:size-5" strokeWidth={1.75} />}
      </motion.button>
    </div>
  )
}
