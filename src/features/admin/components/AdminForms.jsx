/**
 * Admin Form Components & Patterns
 * Reusable form components for admin CRUD operations
 */

import { Label } from "../../../components/ui/label"
import { Input } from "../../../components/ui/input"
import { Button } from "../../../components/ui/button"

/**
 * Form group wrapper
 */
export function FormGroup({ label, children, required = false, error = null }) {
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

/**
 * Form input field
 */
export function FormInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
  required = false,
  error = null,
  className = "",
}) {
  return (
    <FormGroup label={label} required={required} error={error}>
      <Input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`rounded-xl border-slate-200/90 ${className}`}
      />
    </FormGroup>
  )
}

/**
 * Form select field
 */
export function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  error = null,
  placeholder = "-- اختر --",
}) {
  return (
    <FormGroup label={label} required={required} error={error}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-400/40"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormGroup>
  )
}

/**
 * Form textarea field
 */
export function FormTextarea({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  rows = 4,
  disabled = false,
  required = false,
  error = null,
}) {
  return (
    <FormGroup label={label} required={required} error={error}>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-400/40"
      />
    </FormGroup>
  )
}

/**
 * Form actions bar
 */
export function FormActions({
  submitLabel = "حفظ",
  cancelLabel = "إلغاء",
  onSubmit = null,
  onCancel = null,
  isLoading = false,
  isDisabled = false,
  isDangerous = false,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={onSubmit}
        disabled={isLoading || isDisabled}
        className={`rounded-xl h-11 px-5 ${
          isDangerous
            ? "bg-red-600 hover:bg-red-700"
            : "bg-sky-600 hover:bg-sky-700"
        }`}
      >
        {isLoading ? "جاري..." : submitLabel}
      </Button>
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
        className="rounded-xl h-11"
      >
        {cancelLabel}
      </Button>
    </div>
  )
}
