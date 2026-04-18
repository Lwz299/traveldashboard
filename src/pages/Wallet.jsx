import { useEffect, useMemo, useState, useCallback } from "react"
import api from "../api/api"
import {
  fetchWalletTransactions,
  fetchOrganizationPayoutHistory,
  fetchTicketEarnings,
  formatWalletTransactionsError,
} from "../api/financial"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  Layers,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Search,
  X,
  Copy,
  Filter,
} from "lucide-react"
import { formatCountEn, formatMoneyEn, formatDateTimeEn } from "../utils/formatEn"
import { mergeFinancialActivity, normalizePayoutHistoryRow, normalizeWalletTransaction } from "../utils/financialActivity"
import FinancialActivityTable from "../components/financial/FinancialActivityTable"
import {
  MotionSection,
  MotionSurface,
  DashboardPageSkeleton,
  StackedRowsSkeleton,
} from "../components/motion"
import { orgCardClassSubtle } from "../lib/org-ui"

const PAGE_SIZE = 50

function pickNum(...vals) {
  for (const v of vals) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickStr(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v)
  }
  return "—"
}

/** قيمة نصية بدون افتراضي «—» — لحقول الحالة من الـ API */
function rawStr(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

const LISTING_UNAVAILABLE_LABEL = "الفعالية غير متاحة في القائمة"

/** شارة عرض لـ eventListingState / eventIsDeleted (GET /api/tickets/my-tickets وأشباهها في تقارير المنظمة) */
function ticketEventListingBadge(r) {
  const deleted = Boolean(r.eventIsDeleted ?? r.EventIsDeleted)
  if (deleted) {
    return {
      label: LISTING_UNAVAILABLE_LABEL,
      className: "border-slate-300/80 bg-slate-200/90 text-slate-900 ring-slate-400/30",
    }
  }
  const state = rawStr(r.eventListingState, r.EventListingState)
  if (state === "Removed") {
    return {
      label: LISTING_UNAVAILABLE_LABEL,
      className: "border-slate-200/90 bg-slate-100 text-slate-800 ring-slate-300/50",
    }
  }
  if (state === "Cancelled") {
    return {
      label: "ملغاة",
      className: "border-amber-200/90 bg-amber-50 text-amber-950 ring-amber-400/25",
    }
  }
  if (state === "Active") {
    return {
      label: "نشطة",
      className: "border-emerald-200/90 bg-emerald-50 text-emerald-950 ring-emerald-400/20",
    }
  }
  if (state && state !== "Unknown") {
    return {
      label: state,
      className: "border-slate-200/80 bg-slate-50 text-slate-700 ring-slate-300/40",
    }
  }
  const evSt = rawStr(r.eventStatus, r.EventStatus)
  if (evSt) {
    return {
      label: evSt,
      className: "border-slate-200/80 bg-white text-slate-600 ring-slate-200/60",
    }
  }
  return null
}

/**
 * اسم نوع التذكرة للعرض — يطابق أولوية الـ API: الحقل المسطّح `ticketTypeName` (camelCase)،
 * ثم Ticket.TicketType، ثم OrderItem.TicketType (عند غياب التعبئة من مسار التذكرة).
 */
function resolveTicketTypeLabel(r) {
  const oi = r?.orderItem ?? r?.OrderItem ?? r?.order_item
  const ttFromTicket = r?.ticketType ?? r?.TicketType
  const ttFromOrderItem = oi?.ticketType ?? oi?.TicketType
  return pickStr(
    r?.ticketTypeName,
    r?.TicketTypeName,
    r?.ticket_type_name,
    ttFromTicket?.name,
    ttFromTicket?.Name,
    ttFromTicket?.title,
    ttFromTicket?.Title,
    ttFromOrderItem?.name,
    ttFromOrderItem?.Name,
    ttFromOrderItem?.title,
    ttFromOrderItem?.Title,
    oi?.ticketTypeName,
    oi?.TicketTypeName,
    r?.ticketName,
    r?.TicketName,
    oi?.ticketName,
    oi?.TicketName
  )
}

function resolveTicketTypeIdNum(r) {
  const oi = r?.orderItem ?? r?.OrderItem ?? r?.order_item
  const ttFromTicket = r?.ticketType ?? r?.TicketType
  const ttFromOrderItem = oi?.ticketType ?? oi?.TicketType
  return pickNum(
    r?.ticketTypeId,
    r?.TicketTypeId,
    ttFromTicket?.id,
    ttFromTicket?.Id,
    ttFromOrderItem?.id,
    ttFromOrderItem?.Id,
    oi?.ticketTypeId,
    oi?.TicketTypeId
  )
}

function formatCommissionRateAsPercent(rate01) {
  if (rate01 == null || !Number.isFinite(rate01)) return "—"
  if (rate01 >= 0 && rate01 <= 1) {
    const p = rate01 * 100
    const rounded = Math.abs(p % 1) < 1e-9 ? String(Math.round(p)) : p.toFixed(1)
    return `${rounded}٪`
  }
  return `${rate01}٪`
}

/** يفضّل `commissionPercent` (= rate×100) للعرض كـ «3٪»؛ وإلا `commissionRate` (0–1). */
function formatCommissionDisplay(r) {
  const pct = pickNum(r.commissionPercent, r.CommissionPercent)
  if (pct != null && Number.isFinite(pct)) {
    const rounded = Math.abs(pct % 1) < 1e-9 ? String(Math.round(pct)) : pct.toFixed(1)
    return `${rounded}٪`
  }
  const rate = pickNum(r.commissionRate, r.CommissionRate)
  return formatCommissionRateAsPercent(rate)
}

function resolveCommissionRate01(r) {
  const rate = pickNum(r.commissionRate, r.CommissionRate)
  if (rate != null && rate >= 0 && rate <= 1) return rate
  const pct = pickNum(r.commissionPercent, r.CommissionPercent)
  if (pct != null && Number.isFinite(pct)) return pct / 100
  return null
}

function buildTicketEarningDisplay(r) {
  const eventTitle = pickStr(r.eventTitle, r.EventTitle)
  const ticketTypeId = resolveTicketTypeIdNum(r)
  let ticketTypeName = resolveTicketTypeLabel(r)
  if (ticketTypeName === "—" && ticketTypeId != null) {
    ticketTypeName = `نوع تذكرة #${ticketTypeId}`
  }
  if (ticketTypeName === "—") {
    ticketTypeName = "غير محدد"
  }
  const eventId = pickNum(r.eventId, r.EventId)
  const platformFeePerTicket = pickNum(r.platformFeePerTicket, r.PlatformFeePerTicket)
  const organizerNetPerTicket = pickNum(r.organizerNetPerTicket, r.OrganizerNetPerTicket)
  const usedFallbackUnitPrice = Boolean(r.usedFallbackUnitPrice ?? r.UsedFallbackUnitPrice)
  const rate01 = resolveCommissionRate01(r)

  let grossPerTicket = pickNum(r.grossPerTicket, r.GrossPerTicket)
  let inferredGross = false

  const grossMissing =
    grossPerTicket == null || grossPerTicket === 0 || (typeof grossPerTicket === "number" && Math.abs(grossPerTicket) < 1e-9)

  if (grossMissing) {
    if (
      organizerNetPerTicket != null &&
      organizerNetPerTicket > 0 &&
      rate01 != null &&
      rate01 > 0 &&
      rate01 < 1
    ) {
      grossPerTicket = organizerNetPerTicket / (1 - rate01)
      inferredGross = true
    } else if (
      platformFeePerTicket != null &&
      organizerNetPerTicket != null &&
      platformFeePerTicket + organizerNetPerTicket > 0
    ) {
      grossPerTicket = platformFeePerTicket + organizerNetPerTicket
      inferredGross = true
    }
  }

  return {
    eventTitle,
    ticketTypeName,
    eventId,
    ticketTypeId,
    grossPerTicket,
    inferredGross,
    rateLabel: formatCommissionDisplay(r),
    platformFeePerTicket,
    organizerNetPerTicket,
    usedFallbackUnitPrice,
    orderId: pickNum(r.orderId, r.OrderId),
    orderItemId: pickNum(r.orderItemId, r.OrderItemId),
    ticketId: pickNum(r.ticketId, r.TicketId),
    createdAt: r.createdAt ?? r.CreatedAt ?? null,
    eventListingState: rawStr(r.eventListingState, r.EventListingState) || null,
    eventIsDeleted: Boolean(r.eventIsDeleted ?? r.EventIsDeleted),
    eventStatus: rawStr(r.eventStatus, r.EventStatus) || null,
    listingBadge: ticketEventListingBadge(r),
  }
}

function matchesTicketEarningSearch(r, queryLower) {
  if (!queryLower) return true
  const tid = resolveTicketTypeIdNum(r)
  const ticketId = pickNum(r.ticketId, r.TicketId)
  const orderId = pickNum(r.orderId, r.OrderId)
  const orderItemId = pickNum(r.orderItemId, r.OrderItemId)
  const parts = [
    pickStr(r.eventTitle, r.EventTitle),
    resolveTicketTypeLabel(r),
    r.eventId != null ? String(r.eventId) : String(r.EventId ?? ""),
    tid != null ? String(tid) : "",
    ticketId != null ? String(ticketId) : "",
    orderId != null ? String(orderId) : "",
    orderItemId != null ? String(orderItemId) : "",
  ]
  return parts.some((p) => p && p.toLowerCase().includes(queryLower))
}

const teSelectClass =
  "h-11 w-full min-w-0 rounded-2xl border border-emerald-900/10 bg-white px-3 text-sm shadow-sm ring-1 ring-slate-900/[0.04] outline-none transition-[box-shadow,border-color] focus:border-emerald-600/35 focus:ring-2 focus:ring-emerald-600/20"

const tabBtn = (active) =>
  [
    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
    active
      ? "bg-white text-emerald-900 shadow-sm shadow-emerald-900/10 ring-1 ring-emerald-900/10"
      : "text-slate-600 hover:text-emerald-900",
  ].join(" ")

export default function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [walletTx, setWalletTx] = useState([])
  const [walletTotalCount, setWalletTotalCount] = useState(0)
  const [walletSkip, setWalletSkip] = useState(0)
  const [walletTypeFilter, setWalletTypeFilter] = useState("")
  const [payoutHistory, setPayoutHistory] = useState([])
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [walletLoading, setWalletLoading] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState("all")
  const [balanceLoadError, setBalanceLoadError] = useState(false)
  const [walletListError, setWalletListError] = useState(null)
  const [payoutError, setPayoutError] = useState(null)
  const [payoutSuccess, setPayoutSuccess] = useState(null)
  const [teRows, setTeRows] = useState([])
  const [teTotalCount, setTeTotalCount] = useState(0)
  const [teSkip, setTeSkip] = useState(0)
  const [teLoading, setTeLoading] = useState(false)
  const [teError, setTeError] = useState(null)
  const [teSearch, setTeSearch] = useState("")
  const [teFilterEventId, setTeFilterEventId] = useState("")
  const [teFilterTicketTypeId, setTeFilterTicketTypeId] = useState("")
  const [teCopiedTicketId, setTeCopiedTicketId] = useState(null)

  const loadWalletPage = useCallback(
    async (opts = {}) => {
      const skip = opts.skip != null ? opts.skip : walletSkip
      const type = opts.type !== undefined ? opts.type : walletTypeFilter
      setWalletLoading(true)
      try {
        const { items, totalCount, skip: sOut } = await fetchWalletTransactions({
          skip,
          take: PAGE_SIZE,
          type: type || undefined,
        })
        setWalletListError(null)
        setWalletTx(items)
        setWalletTotalCount(totalCount)
        setWalletSkip(sOut)
      } catch (err) {
        console.error(err)
        setWalletListError(formatWalletTransactionsError(err))
        setWalletTx([])
        setWalletTotalCount(0)
      } finally {
        setWalletLoading(false)
      }
    },
    [walletSkip, walletTypeFilter]
  )

  const loadTicketEarningsPage = useCallback(async (skip) => {
    setTeLoading(true)
    setTeError(null)
    try {
      const { items, totalCount, skip: sOut } = await fetchTicketEarnings({ skip, take: PAGE_SIZE })
      setTeRows(items)
      setTeTotalCount(totalCount)
      setTeSkip(sOut)
    } catch (err) {
      console.error(err)
      setTeError(formatWalletTransactionsError(err))
      setTeRows([])
      setTeTotalCount(0)
    } finally {
      setTeLoading(false)
    }
  }, [])

  const fetchPayoutAndBalance = useCallback(async () => {
    try {
      let walletFailed = false
      const walletRes = await api.get("/payouts/my-wallet").catch(() => {
        walletFailed = true
        return { data: null }
      })
      const ph = await fetchOrganizationPayoutHistory()
      setWallet(walletRes.data)
      setBalanceLoadError(walletFailed)
      setPayoutHistory(Array.isArray(ph) ? ph : [])
    } catch (err) {
      console.error(err)
      setBalanceLoadError(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      await fetchPayoutAndBalance()
      if (cancelled) return
      try {
        const { items, totalCount, skip: sOut } = await fetchWalletTransactions({
          skip: 0,
          take: PAGE_SIZE,
        })
        if (!cancelled) {
          setWalletListError(null)
          setWalletTx(items)
          setWalletTotalCount(totalCount)
          setWalletSkip(sOut)
        }
      } catch (e) {
        if (!cancelled) {
          setWalletListError(formatWalletTransactionsError(e))
          setWalletTx([])
          setWalletTotalCount(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [fetchPayoutAndBalance])

  useEffect(() => {
    if (loading) return
    loadTicketEarningsPage(0)
  }, [loading, loadTicketEarningsPage])

  const teEventFilterOptions = useMemo(() => {
    const map = new Map()
    for (const r of teRows ?? []) {
      const id = pickNum(r.eventId, r.EventId)
      if (id == null) continue
      const title = pickStr(r.eventTitle, r.EventTitle)
      if (!map.has(id)) map.set(id, title)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [teRows])

  const teTicketTypeFilterOptions = useMemo(() => {
    const map = new Map()
    for (const r of teRows ?? []) {
      const id = resolveTicketTypeIdNum(r)
      if (id == null) continue
      let label = resolveTicketTypeLabel(r)
      if (label === "—") label = `نوع #${id}`
      if (!map.has(id)) map.set(id, label)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [teRows])

  const teFilteredRows = useMemo(() => {
    let list = [...(teRows ?? [])]
    if (teFilterEventId !== "") {
      const want = Number(teFilterEventId)
      list = list.filter((r) => pickNum(r.eventId, r.EventId) === want)
    }
    if (teFilterTicketTypeId !== "") {
      const want = Number(teFilterTicketTypeId)
      list = list.filter((r) => resolveTicketTypeIdNum(r) === want)
    }
    const q = teSearch.trim().toLowerCase()
    if (q) list = list.filter((r) => matchesTicketEarningSearch(r, q))
    return list
  }, [teRows, teSearch, teFilterEventId, teFilterTicketTypeId])

  const teFiltersActive = teFilterEventId !== "" || teFilterTicketTypeId !== ""
  const teSearchOrFilterActive = teSearch.trim() !== "" || teFiltersActive

  const teDisplayRows = useMemo(
    () => teFilteredRows.map((r) => buildTicketEarningDisplay(r)),
    [teFilteredRows]
  )

  const teHasMore = teSkip + PAGE_SIZE < teTotalCount
  const teHasPrev = teSkip > 0
  const teWalletPages = Math.max(1, Math.ceil(teTotalCount / PAGE_SIZE) || 1)
  const tePageIndex = teTotalCount === 0 ? 0 : Math.floor(teSkip / PAGE_SIZE) + 1
  const teRangeLabel =
    teTotalCount === 0
      ? "0"
      : `${formatCountEn(teSkip + 1)}–${formatCountEn(Math.min(teSkip + PAGE_SIZE, teTotalCount))}`

  const mergedRows = useMemo(() => mergeFinancialActivity(walletTx, payoutHistory), [walletTx, payoutHistory])

  const walletOnlyRows = useMemo(
    () => (walletTx ?? []).map(normalizeWalletTransaction).filter(Boolean),
    [walletTx]
  )

  const payoutOnlyRows = useMemo(
    () => (payoutHistory ?? []).map(normalizePayoutHistoryRow).filter(Boolean),
    [payoutHistory]
  )

  const displayRows = useMemo(() => {
    if (tab === "wallet") return walletOnlyRows
    if (tab === "payout") return payoutOnlyRows
    return mergedRows
  }, [tab, mergedRows, walletOnlyRows, payoutOnlyRows])

  const walletHasMore = walletSkip + PAGE_SIZE < walletTotalCount
  const walletHasPrev = walletSkip > 0

  const handleWalletFilterChange = async (nextType) => {
    setWalletTypeFilter(nextType)
    setWalletSkip(0)
    await loadWalletPage({ skip: 0, type: nextType })
  }

  const handleWalletNext = () => {
    if (!walletHasMore) return
    const next = walletSkip + PAGE_SIZE
    loadWalletPage({ skip: next })
  }

  const handleWalletPrev = () => {
    if (!walletHasPrev) return
    const prev = Math.max(0, walletSkip - PAGE_SIZE)
    loadWalletPage({ skip: prev })
  }

  const requestPayout = async (e) => {
    e.preventDefault()
    setPayoutError(null)
    setPayoutSuccess(null)
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setPayoutError("أدخل مبلغاً صالحاً أكبر من صفر.")
      return
    }
    const bal = Number(wallet?.balance ?? wallet?.balanceAmount ?? wallet?.totalBalance)
    if (Number.isFinite(bal) && num > bal) {
      setPayoutError(`المبلغ يتجاوز الرصيد المتاح (${formatMoneyEn(bal, "")}).`)
      return
    }
    setRequesting(true)
    try {
      await api.post("/payouts/request", { amount: num })
      setAmount("")
      setPayoutSuccess("تم إرسال طلب السحب بنجاح. سيظهر في سجل السحوبات بعد المعالجة.")
      await fetchPayoutAndBalance()
      await loadWalletPage({ skip: walletSkip })
    } catch (err) {
      setPayoutError(err.response?.data?.message || "تعذر إرسال الطلب. حاول مرة أخرى.")
    } finally {
      setRequesting(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setWalletListError(null)
    try {
      await fetchPayoutAndBalance()
      await loadWalletPage({ skip: walletSkip })
      await loadTicketEarningsPage(teSkip)
    } finally {
      setRefreshing(false)
    }
  }

  const handleTeNext = () => {
    if (!teHasMore) return
    loadTicketEarningsPage(teSkip + PAGE_SIZE)
  }

  const handleTePrev = () => {
    if (!teHasPrev) return
    loadTicketEarningsPage(Math.max(0, teSkip - PAGE_SIZE))
  }

  const balanceMeta = useMemo(() => {
    const raw = wallet?.balance ?? wallet?.balanceAmount ?? wallet?.totalBalance
    const n = Number(raw)
    if (Number.isFinite(n)) {
      return { balanceNum: n, balanceDisplay: formatMoneyEn(n, ""), known: true }
    }
    if (raw !== undefined && raw !== null && raw !== "") {
      return { balanceNum: NaN, balanceDisplay: String(raw), known: false }
    }
    return { balanceNum: NaN, balanceDisplay: "—", known: false }
  }, [wallet])

  const walletTotalPages = Math.max(1, Math.ceil(walletTotalCount / PAGE_SIZE) || 1)
  const walletPageIndex = walletTotalCount === 0 ? 0 : Math.floor(walletSkip / PAGE_SIZE) + 1

  if (loading) {
    return <DashboardPageSkeleton />
  }

  const walletRangeLabel =
    walletTotalCount === 0
      ? "0"
      : `${formatCountEn(walletSkip + 1)}–${formatCountEn(Math.min(walletSkip + PAGE_SIZE, walletTotalCount))}`

  return (
    <div className="space-y-8">
      <MotionSection delay={0.04} aria-label="المحفظة">
        <MotionSurface>
          <Card className="w-full overflow-hidden rounded-2xl border-slate-200/80 bg-white/95 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-md">
            <CardHeader className="border-b border-slate-100/90 bg-gradient-to-l from-emerald-50/40 via-white to-white px-4 py-4 sm:px-6">
              <CardTitle className="org-heading flex items-center gap-2.5 text-lg font-semibold leading-tight text-slate-900">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-600/12 text-emerald-800 ring-1 ring-emerald-700/10">
                  <WalletIcon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                الرصيد وطلب السحب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
              {balanceLoadError && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-amber-200/90 bg-amber-50/70 px-3 py-2.5 text-[11px] leading-snug text-amber-950"
                  role="status"
                >
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-800" aria-hidden />
                  <span>تعذر تحديث الرصيد. جرّب «تحديث» في قسم النشاط المالي أو لاحقاً.</span>
                </div>
              )}
              {payoutError && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-rose-200/90 bg-rose-50/60 px-3 py-2.5 text-sm text-rose-950"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-700" aria-hidden />
                  <span>{payoutError}</span>
                </div>
              )}
              {payoutSuccess && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-teal-200/90 bg-teal-50/60 px-3 py-2.5 text-sm text-teal-950"
                  role="status"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />
                  <span>{payoutSuccess}</span>
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-6">
                <div className="flex flex-col justify-between rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 p-5 shadow-inner shadow-emerald-900/[0.03] ring-1 ring-white/80">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/70">الرصيد المتاح</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-[#006A6A] sm:text-4xl">
                      {balanceMeta.balanceDisplay}
                    </p>
                    {balanceMeta.known && (
                      <p className="mt-3 text-xs leading-relaxed text-slate-600">
                        يمكنك طلب تحويل حتى{" "}
                        <span className="font-semibold tabular-nums text-slate-800">{formatMoneyEn(balanceMeta.balanceNum, "")}</span>
                      </p>
                    )}
                  </div>
                </div>

                <form
                  onSubmit={requestPayout}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 ring-1 ring-slate-900/[0.02]"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="wallet-payout-amount" className="text-sm font-medium text-slate-700">
                      مبلغ السحب
                    </Label>
                    <p className="text-[11px] leading-snug text-slate-500">أدخل المبلغ المطلوب تحويله ثم اضغط طلب السحب.</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      id="wallet-payout-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={balanceMeta.known ? balanceMeta.balanceNum : undefined}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        setPayoutError(null)
                        setPayoutSuccess(null)
                      }}
                      disabled={requesting}
                      className="h-11 min-w-0 flex-1 rounded-xl border-slate-200 bg-white text-base tabular-nums shadow-sm sm:text-sm"
                      inputMode="decimal"
                    />
                    <Button
                      type="submit"
                      size="default"
                      disabled={requesting}
                      className="h-11 w-full shrink-0 gap-2 rounded-xl px-6 font-semibold shadow-sm sm:w-auto sm:min-w-[148px]"
                    >
                      <ArrowDownToLine className="size-4" aria-hidden />
                      {requesting ? "جاري الإرسال…" : "طلب سحب"}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </MotionSurface>
      </MotionSection>

      <MotionSection delay={0.05} aria-label="أرباح التذاكر">
        <Card className={`${orgCardClassSubtle} overflow-hidden`}>
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100/90 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="org-heading flex items-center gap-2 text-base font-semibold leading-none sm:text-lg">
                <Receipt className="size-5 text-emerald-800" strokeWidth={1.75} aria-hidden />
                تفصيل أرباح التذاكر
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="tabular-nums">
                  {formatCountEn(teTotalCount)} سجل · عرض {teRangeLabel}
                  {teTotalCount > 0 && (
                    <span className="mr-2 text-slate-500">
                      · صفحة {formatCountEn(tePageIndex)} من {formatCountEn(teWalletPages)}
                    </span>
                  )}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    disabled={!teHasPrev || teLoading}
                    onClick={handleTePrev}
                    aria-label="الصفحة السابقة لأرباح التذاكر"
                  >
                    <ChevronRight className="size-4" />
                    السابق
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    disabled={!teHasMore || teLoading}
                    onClick={handleTeNext}
                    aria-label="الصفحة التالية لأرباح التذاكر"
                  >
                    التالي
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div
              className="rounded-2xl border border-emerald-900/8 bg-emerald-50/25 px-3 py-3 sm:px-4"
              aria-label="فلترة أرباح التذاكر"
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-900/85">
                <Filter className="size-3.5 shrink-0 opacity-80" aria-hidden />
                فلترة حسب الصفحة الحالية
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="te-filter-event" className="text-xs text-slate-600">
                      الفعالية
                    </Label>
                    <select
                      id="te-filter-event"
                      className={teSelectClass}
                      value={teFilterEventId}
                      onChange={(e) => setTeFilterEventId(e.target.value)}
                      disabled={teLoading || teRows.length === 0}
                    >
                      <option value="">كل الفعاليات</option>
                      {teEventFilterOptions.map(([id, title]) => (
                        <option key={id} value={String(id)}>
                          {title} (#{formatCountEn(id)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="te-filter-tt" className="text-xs text-slate-600">
                      نوع التذكرة
                    </Label>
                    <select
                      id="te-filter-tt"
                      className={teSelectClass}
                      value={teFilterTicketTypeId}
                      onChange={(e) => setTeFilterTicketTypeId(e.target.value)}
                      disabled={teLoading || teRows.length === 0}
                    >
                      <option value="">كل الأنواع</option>
                      {teTicketTypeFilterOptions.map(([id, name]) => (
                        <option key={id} value={String(id)}>
                          {name} (#{formatCountEn(id)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {teFiltersActive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 shrink-0 rounded-xl border-emerald-900/15 bg-white px-4 text-xs font-medium"
                    onClick={() => {
                      setTeFilterEventId("")
                      setTeFilterTicketTypeId("")
                    }}
                  >
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-3">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute right-3 top-1/2 z-10 size-[18px] -translate-y-1/2 text-emerald-800/45"
                  strokeWidth={2}
                  aria-hidden
                />
                <Input
                  type="search"
                  value={teSearch}
                  onChange={(e) => setTeSearch(e.target.value)}
                  placeholder="بحث نصي: فعالية، نوع، معرّف تذكرة، طلب، بند…"
                  className={[
                    "h-11 w-full rounded-2xl border-emerald-900/10 bg-white text-sm shadow-sm ring-1 ring-slate-900/[0.04] transition-[box-shadow,border-color]",
                    "pr-11 placeholder:text-slate-400 focus-visible:border-emerald-600/35 focus-visible:ring-2 focus-visible:ring-emerald-600/20",
                    teSearch.trim() !== "" ? "pl-11" : "pl-3",
                  ].join(" ")}
                  aria-label="بحث في أرباح التذاكر"
                  autoComplete="off"
                />
                {teSearch.trim() !== "" && (
                  <button
                    type="button"
                    className="absolute left-2.5 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    onClick={() => setTeSearch("")}
                    aria-label="مسح البحث"
                  >
                    <X className="size-4" strokeWidth={2} />
                  </button>
                )}
              </div>
              {teSearchOrFilterActive && (
                <div className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-emerald-900/10 bg-emerald-50/60 px-3 py-2.5 text-[11px] font-medium text-emerald-950 sm:min-w-[158px] sm:py-2">
                  <span className="tabular-nums text-base font-bold leading-none text-emerald-900">
                    {formatCountEn(teFilteredRows.length)}
                  </span>
                  <span className="text-emerald-800/75">من أصل</span>
                  <span className="tabular-nums font-semibold text-emerald-900/90">
                    {formatCountEn(teRows.length)}
                  </span>
                </div>
              )}
            </div>
            {teSearchOrFilterActive && (
              <p className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                الفلاتر والبحث يطبّقان على <span className="font-semibold text-slate-800">الصفحة الحالية فقط</span> ({formatCountEn(teRows.length)} سجل محمّل).
                {teFilteredRows.length === 0 && teRows.length > 0 && (
                  <span className="mt-1 block text-amber-900">
                    لا توجد نتيجة مطابقة — عدّل الفلاتر أو البحث، أو انتقل لصفحة أخرى.
                  </span>
                )}
              </p>
            )}
          </CardHeader>
          <CardContent className="px-0 pb-4 pt-0 sm:px-0">
            {teError && (
              <div
                className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-rose-200/90 bg-rose-50/60 px-3 py-2 text-xs text-rose-950 sm:mx-5"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-700" aria-hidden />
                <span>{teError}</span>
              </div>
            )}
            {teLoading ? (
              <div className="px-4 py-6 sm:px-5" aria-busy="true">
                <StackedRowsSkeleton rows={5} />
              </div>
            ) : teRows.length === 0 && !teError ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500 sm:px-5">
                لا توجد بيانات أرباح تذاكر في هذه الصفحة. بعد إعادة نشر الـ API حدّث الصفحة؛ إن بقي عمود «—» راجع Network وتأكد أن الحقول موجودة في JSON.
              </p>
            ) : teDisplayRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-amber-900/90 sm:px-5">
                لا توجد نتيجة مطابقة للفلاتر أو البحث ضمن هذه الصفحة. جرّب تعديل الفلتر أو مسح النص، أو انتقل لصفحة أخرى.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-right text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="w-[1%] whitespace-nowrap px-3 py-2.5 sm:px-4">
                        <span className="block leading-tight">معرّف التذكرة</span>
                        <span className="block text-[10px] font-normal normal-case text-slate-400">(دعم فني)</span>
                      </th>
                      <th className="px-3 py-2.5 sm:px-4">الفعالية</th>
                      <th className="px-3 py-2.5 sm:px-4">نوع التذكرة</th>
                      <th className="max-w-[120px] px-3 py-2.5 sm:px-4">
                        <span className="block leading-tight">الإجمالي</span>
                        <span className="block text-[10px] font-normal normal-case text-slate-400">(سعر التذكرة)</span>
                      </th>
                      <th className="px-3 py-2.5 sm:px-4">
                        <span className="block leading-tight">العمولة</span>
                        <span className="block text-[10px] font-normal normal-case text-slate-400">(النسبة)</span>
                      </th>
                      <th className="px-3 py-2.5 sm:px-4">عمولة المنصة</th>
                      <th className="px-3 py-2.5 sm:px-4">صافي المنظمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teDisplayRows.map((row, idx) => {
                      const grossTitle = [
                        row.usedFallbackUnitPrice && "السعر من unitPrice في بند الطلب لأن priceAtPurchase كان صفراً",
                        row.inferredGross && "استُنبَط الإجمالي من صافي المنظمة ونسبة العمولة، أو من عمومة المنصة + الصافي",
                      ]
                        .filter(Boolean)
                        .join(" — ")
                      return (
                        <tr
                          key={`${row.ticketId ?? "t"}-${row.orderItemId ?? "oi"}-${row.orderId ?? "o"}-${idx}`}
                          className="border-b border-slate-100/90 last:border-0 hover:bg-emerald-50/30"
                        >
                          <td
                            className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums text-slate-800 sm:px-4"
                            data-field="ticketId"
                          >
                            {row.ticketId != null ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="font-semibold text-emerald-900">{formatCountEn(row.ticketId)}</span>
                                <button
                                  type="button"
                                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-emerald-100 hover:text-emerald-900"
                                  title="نسخ معرّف التذكرة"
                                  aria-label={`نسخ معرّف التذكرة ${row.ticketId}`}
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(String(row.ticketId))
                                      setTeCopiedTicketId(row.ticketId)
                                      window.setTimeout(() => setTeCopiedTicketId(null), 2000)
                                    } catch {
                                      /* ignore */
                                    }
                                  }}
                                >
                                  <Copy className="size-3.5" aria-hidden />
                                </button>
                                {teCopiedTicketId === row.ticketId && (
                                  <span className="text-[10px] font-medium text-emerald-700">تم النسخ</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="max-w-[220px] px-3 py-2.5 align-top text-slate-800 sm:px-4">
                            {row.listingBadge ? (
                              <span
                                className={`mb-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight ring-1 ${row.listingBadge.className}`}
                              >
                                {row.listingBadge.label}
                              </span>
                            ) : null}
                            <div className="font-medium text-slate-900">{row.eventTitle}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                              {row.eventId != null && (
                                <span className="tabular-nums">
                                  فعالية <span className="font-medium text-slate-600">#{formatCountEn(row.eventId)}</span>
                                </span>
                              )}
                              {row.orderId != null && (
                                <span className="tabular-nums">
                                  طلب <span className="font-medium text-slate-600">{formatCountEn(row.orderId)}</span>
                                </span>
                              )}
                              {row.createdAt && (
                                <span className="tabular-nums">{formatDateTimeEn(row.createdAt)}</span>
                              )}
                            </div>
                          </td>
                          <td
                            className="min-w-[140px] max-w-[220px] break-words px-3 py-2.5 align-top text-slate-800 sm:px-4"
                            data-field="ticketTypeName"
                          >
                            <div className="font-medium leading-snug">{row.ticketTypeName}</div>
                            {row.ticketTypeId != null && (
                              <div className="mt-1 text-[10px] text-slate-400 tabular-nums">
                                نوع <span className="font-medium text-slate-500">#{formatCountEn(row.ticketTypeId)}</span>
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums text-slate-800 sm:px-4">
                            <span
                              className="inline-flex items-center gap-1"
                              title={grossTitle || undefined}
                            >
                              {row.grossPerTicket != null ? formatMoneyEn(row.grossPerTicket, "") : "—"}
                              {row.usedFallbackUnitPrice && (
                                <span
                                  className="text-[10px] font-semibold text-amber-700"
                                  aria-label="سعر من unitPrice"
                                >
                                  *
                                </span>
                              )}
                              {row.inferredGross && (
                                <span className="text-[10px] font-semibold text-sky-700" aria-label="إجمالي مستنتج">
                                  ~
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums text-slate-700 sm:px-4">
                            {row.rateLabel}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums text-slate-800 sm:px-4">
                            {row.platformFeePerTicket != null ? formatMoneyEn(row.platformFeePerTicket, "") : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-top font-medium tabular-nums text-[#006A6A] sm:px-4">
                            {row.organizerNetPerTicket != null ? formatMoneyEn(row.organizerNetPerTicket, "") : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection delay={0.06} aria-label="النشاط المالي الموحّد">
        <Card className={`${orgCardClassSubtle} overflow-hidden`}>
          <CardHeader className="space-y-4 border-b border-emerald-900/[0.06] bg-gradient-to-b from-white/90 to-emerald-50/20 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="org-heading flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15">
                  <Layers className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                النشاط المالي
              </CardTitle>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 gap-2 rounded-xl border-emerald-900/12 bg-white/80 shadow-sm"
                  disabled={refreshing || walletLoading}
                  onClick={handleRefresh}
                  aria-label="تحديث الرصيد والجداول"
                >
                  <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
                  تحديث
                </Button>
                <div
                  className="inline-flex flex-wrap gap-1 rounded-xl border border-emerald-900/10 bg-slate-100/60 p-1 ring-1 ring-white/60"
                  role="tablist"
                  aria-label="تصفية النشاط"
                >
                  <button type="button" role="tab" aria-selected={tab === "all"} className={tabBtn(tab === "all")} onClick={() => setTab("all")}>
                    الكل
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "wallet"}
                    className={tabBtn(tab === "wallet")}
                    onClick={() => setTab("wallet")}
                  >
                    المحفظة
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "payout"}
                    className={tabBtn(tab === "payout")}
                    onClick={() => setTab("payout")}
                  >
                    السحوبات
                  </button>
                </div>
              </div>
            </div>

            {tab === "wallet" && (
              <div className="flex flex-col gap-3 border-t border-emerald-900/10 pt-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">نوع الحركة</Label>
                  <select
                    className="h-10 min-w-[220px] rounded-xl border border-emerald-900/12 bg-white/95 px-3 text-sm shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-emerald-600/35"
                    value={walletTypeFilter}
                    onChange={(e) => handleWalletFilterChange(e.target.value)}
                    disabled={walletLoading}
                  >
                    <option value="">الكل</option>
                    <option value="Credit">Credit — إيداع</option>
                    <option value="Debit">Debit — خصم</option>
                    <option value="Refund">Refund — استرداد</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="tabular-nums">
                    {formatCountEn(walletTotalCount)} حركة · عرض {walletRangeLabel}
                    {walletTotalCount > 0 && (
                      <span className="mr-2 text-slate-500">
                        · صفحة {formatCountEn(walletPageIndex)} من {formatCountEn(walletTotalPages)}
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg"
                      disabled={!walletHasPrev || walletLoading}
                      onClick={handleWalletPrev}
                      aria-label="الصفحة السابقة"
                    >
                      <ChevronRight className="size-4" />
                      السابق
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg"
                      disabled={!walletHasMore || walletLoading}
                      onClick={handleWalletNext}
                      aria-label="الصفحة التالية"
                    >
                      التالي
                      <ChevronLeft className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {walletListError && (tab === "wallet" || tab === "all") && (
              <div
                className="flex items-start gap-3 rounded-xl border border-rose-200/90 bg-rose-50/60 px-4 py-3 text-sm text-rose-950"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-700" aria-hidden />
                <div className="min-w-0 flex-1 space-y-2">
                  <p>{walletListError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => loadWalletPage({ skip: walletSkip })}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            )}

            {tab === "all" && (
              <p className="border-t border-emerald-900/10 pt-3 text-xs text-slate-500">
                في تبويب «الكل» تُعرض آخر {PAGE_SIZE} حركة محفظة مع سجل السحوبات — للتصفح الكامل لحركات المحفظة
                استخدم تبويب «المحفظة».
              </p>
            )}

            {tab === "payout" && (
              <p className="border-t border-emerald-900/10 pt-3 text-xs text-slate-500">
                يعرض هذا التبويب طلبات السحب المسجّلة. بعد الموافقة قد يستغرق التحويل وقتاً حسب الوسيلة البنكية.
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {walletLoading && tab === "wallet" ? (
              <div className="px-4 py-6 sm:px-6" aria-busy="true" aria-label="جاري تحميل حركات المحفظة">
                <StackedRowsSkeleton rows={6} />
              </div>
            ) : (
              <div className="px-3 pb-5 pt-1 sm:px-5 sm:pb-6">
                <FinancialActivityTable
                  rows={displayRows}
                  emptyLabel={
                    tab === "wallet"
                      ? "لا توجد حركات محفظة في هذه الصفحة."
                      : tab === "payout"
                        ? "لا توجد طلبات سحب في السجل."
                        : "لا يوجد نشاط مالي لعرضه."
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </MotionSection>
    </div>
  )
}
