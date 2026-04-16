import { useState, useCallback } from "react"
import { Building2, Pencil } from "lucide-react"
import { useAdminOrganizations } from "../hooks"
import { organizationService } from "../services/organizationService"
import {
  AdminExpandableCard,
  AdminList,
  ErrorState,
  LoadingSkeletons,
} from "../components"
import { MotionSection, MotionSurface, StaggerList, StaggerItem } from "../../../components/motion"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Card, CardContent } from "../../../components/ui/card"
import { adminPageError } from "../../../lib/admin-ui"
import { safeGet, getStatusClass } from "../utils"
import { STATUS_LABELS, STATUS_COLORS } from "../constants"

/**
 * Reusable organization item edit form
 */
function OrganizationEditForm({ organization, onSave, onCancel, isSaving = false }) {
  const [formData, setFormData] = useState({
    name: organization.name ?? organization.organizationName ?? "",
    description: organization.description ?? organization.organizationDescription ?? "",
    email: organization.email ?? organization.organizationEmail ?? "",
    phone: organization.phone ?? organization.organizationPhone ?? "",
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>اسم المنظمة</Label>
          <Input value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>البريد</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>الوصف</Label>
          <Input
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>الهاتف</Label>
          <Input value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving} className="rounded-xl bg-sky-600 hover:bg-sky-700">
          {isSaving ? "جاري الحفظ..." : "حفظ"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}

/**
 * Organization list item with expand/edit capability
 */
function OrganizationItem({ organization, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async (formData) => {
    setSaving(true)
    setError(null)
    try {
      await organizationService.updateOrganization(organization.id, formData)
      setEditing(false)
      onRefresh()
    } catch (err) {
      setError(err.response?.data?.message ?? "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const status = {
    label: STATUS_LABELS[organization.verificationStatus] ?? organization.verificationStatus,
    className: getStatusClass(organization.verificationStatus, STATUS_COLORS),
  }

  return (
    <MotionSurface>
      <Card className="border border-slate-200/70 bg-white shadow-sm rounded-2xl">
        <AdminExpandableCard
          icon={Building2}
          title={safeGet.name(organization)}
          subtitle={safeGet.email(organization)}
          status={status}
          expanded={expanded || editing}
          onToggle={() => !editing && setExpanded(!expanded)}
          actions={
            !editing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="rounded-lg h-8 px-2"
              >
                <Pencil className="size-4" />
              </Button>
            )
          }
        >
          {error && <div className={adminPageError}>{error}</div>}

          {editing ? (
            <OrganizationEditForm
              organization={organization}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              isSaving={saving}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">الوصف:</span> {safeGet.description(organization)}
              </div>
              <div>
                <span className="text-slate-500">الهاتف:</span> {safeGet.phone(organization)}
              </div>
            </div>
          )}
        </AdminExpandableCard>
      </Card>
    </MotionSurface>
  )
}

/**
 * Organizations admin page
 * Displays list of organizations with edit capability
 */
export default function AdminOrganizationsPage() {
  const { data: organizations, loading, error, refetch } = useAdminOrganizations()

  if (error) {
    return <ErrorState message={error} action={<Button onClick={() => refetch()}>إعادة محاولة</Button>} />
  }

  if (loading) {
    return <LoadingSkeletons type="cards" count={6} className="space-y-3" />
  }

  return (
    <div className="space-y-6">
      <MotionSection delay={0.06} aria-label="قائمة المنظمات">
        <AdminList className="space-y-3">
          <StaggerList className="space-y-3">
            {organizations?.map((org) => (
              <StaggerItem key={org.id}>
                <OrganizationItem organization={org} onRefresh={() => refetch(true)} />
              </StaggerItem>
            ))}
          </StaggerList>
        </AdminList>
      </MotionSection>
    </div>
  )
}
