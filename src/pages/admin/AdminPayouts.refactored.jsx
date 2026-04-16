import { useState } from "react"
import { Landmark, CheckCircle, XCircle } from "lucide-react"
import { usePayoutRequests } from "../hooks"
import { financeService } from "../services/financeService"
import { AdminExpandableCard, AdminList, ErrorState, LoadingSkeletons } from "../components"
import { Button } from "../../../components/ui/button"
import { Card, CardContent } from "../../../components/ui/card"
import { MotionSection, MotionSurface, StaggerList, StaggerItem } from "../../../components/motion"
import { adminPageError } from "../../../lib/admin-ui"
import { STATUS_LABELS, STATUS_COLORS } from "../constants"
import { safeGet, getStatusClass } from "../utils"

/**
 * Payout request action button
 */
function PayoutActionButton({
  payout,
  action,
  isLoading,
  onSuccess,
}) {
  const [error, setError] = useState(null)

  const handleApprove = async () => {
    setError(null)
    try {
      await financeService.approvePayoutRequest(payout.id)
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message ?? "فشل الإجراء")
    }
  }

  const handleReject = async () => {
    const reason = prompt("أدخل سبب الرفض:")
    if (!reason) return
    setError(null)
    try {
      await financeService.rejectPayoutRequest(payout.id, { reason })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message ?? "فشل الإجراء")
    }
  }

  return (
    <>
      {error && <div className={adminPageError}>{error}</div>}
      <div className="flex gap-2">
        {action === "approve" && (
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 h-9"
            size="sm"
          >
            <CheckCircle className="size-4" />
            {isLoading ? "جاري..." : "اعتماد"}
          </Button>
        )}
        {action === "reject" && (
          <Button
            onClick={handleReject}
            disabled={isLoading}
            variant="outline"
            className="rounded-xl border-red-200/50 text-red-600 hover:bg-red-50"
            size="sm"
          >
            <XCircle className="size-4" />
            رفض
          </Button>
        )}
      </div>
    </>
  )
}

/**
 * Payout request item
 */
function PayoutRequestItem({ payout, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)

  const status = {
    label: STATUS_LABELS[payout.status] ?? payout.status,
    className: getStatusClass(payout.status, STATUS_COLORS),
  }

  const isPending = payout.status === "Pending"

  return (
    <MotionSurface>
      <Card className="border border-slate-200/70 bg-white shadow-sm rounded-2xl">
        <AdminExpandableCard
          icon={Landmark}
          title={`طلب سحب رقم ${payout.id}`}
          subtitle={`المنظمة: ${safeGet.name(payout)}`}
          status={status}
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        >
          <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
            <div>
              <span className="text-slate-500">المبلغ:</span>{" "}
              <span className="font-semibold">
                {payout.amount ? `${payout.amount.toLocaleString()} ر.س` : "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">طريقة التحويل:</span> {payout.method ?? "—"}
            </div>
            <div>
              <span className="text-slate-500">حساب البنك:</span> {payout.bankAccount ?? "—"}
            </div>
            <div>
              <span className="text-slate-500">التاريخ:</span> {payout.createdAt ?? "—"}
            </div>
          </div>

          {isPending && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">الإجراءات</h4>
              <div className="flex flex-wrap gap-2">
                <PayoutActionButton
                  payout={payout}
                  action="approve"
                  isLoading={processing}
                  onSuccess={() => {
                    setProcessing(false)
                    onRefresh()
                  }}
                />
                <PayoutActionButton
                  payout={payout}
                  action="reject"
                  isLoading={processing}
                  onSuccess={() => {
                    setProcessing(false)
                    onRefresh()
                  }}
                />
              </div>
            </div>
          )}
        </AdminExpandableCard>
      </Card>
    </MotionSurface>
  )
}

/**
 * Admin Payouts Management Page
 * Displays and manages payout requests
 */
export default function AdminPayoutsPage() {
  const { data: payouts, loading, error, refetch } = usePayoutRequests()

  if (error) {
    return <ErrorState message={error} action={<Button onClick={() => refetch()}>إعادة محاولة</Button>} />
  }

  if (loading) {
    return <LoadingSkeletons type="cards" count={6} className="space-y-3" />
  }

  // Separate pending and processed payouts
  const pendingPayouts = payouts?.filter((p) => p.status === "Pending") ?? []
  const processedPayouts = payouts?.filter((p) => p.status !== "Pending") ?? []

  return (
    <div className="space-y-8">
      {pendingPayouts.length > 0 && (
        <MotionSection delay={0.04} aria-label="طلبات السحب المعلقة">
          <h2 className="mb-4 text-sm font-semibold text-brand-navy">
            طلبات سحب معلقة ({pendingPayouts.length})
          </h2>
          <AdminList className="space-y-3">
            <StaggerList className="space-y-3">
              {pendingPayouts.map((payout) => (
                <StaggerItem key={payout.id}>
                  <PayoutRequestItem payout={payout} onRefresh={() => refetch(true)} />
                </StaggerItem>
              ))}
            </StaggerList>
          </AdminList>
        </MotionSection>
      )}

      {processedPayouts.length > 0 && (
        <MotionSection delay={0.06} aria-label="طلبات السحب المعالجة">
          <h2 className="mb-4 text-sm font-semibold text-slate-600">
            طلبات معالجة ({processedPayouts.length})
          </h2>
          <AdminList className="space-y-3">
            <StaggerList className="space-y-3">
              {processedPayouts.map((payout) => (
                <StaggerItem key={payout.id}>
                  <PayoutRequestItem payout={payout} onRefresh={() => refetch(true)} />
                </StaggerItem>
              ))}
            </StaggerList>
          </AdminList>
        </MotionSection>
      )}

      {payouts?.length === 0 && (
        <Card className="border border-slate-200/70 bg-slate-50 rounded-2xl">
          <CardContent className="py-12 text-center text-slate-500">
            لا توجد طلبات سحب
          </CardContent>
        </Card>
      )}
    </div>
  )
}
