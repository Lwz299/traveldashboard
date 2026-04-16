import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"

/**
 * Reusable confirmation dialog for admin actions
 */
export function ConfirmDialog({
  open = false,
  title = "تأكيد الإجراء",
  description = "هل أنت متأكد من هذا الإجراء؟",
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isLoading = false,
  isDangerous = false,
  onConfirm = null,
  onCancel = null,
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={isDangerous ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {isLoading ? "جاري..." : confirmText}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Hook for managing confirmation dialog state
 */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [config, setConfig] = useState({
    title: "تأكيد الإجراء",
    description: "هل أنت متأكد من هذا الإجراء؟",
    confirmText: "تأكيد",
    cancelText: "إلغاء",
    isDangerous: false,
    onConfirm: null,
  })

  const confirm = async (newConfig) => {
    setConfig(newConfig)
    setOpen(true)
    return new Promise((resolve) => {
      setConfig((prev) => ({
        ...prev,
        ...newConfig,
        onConfirm: async () => {
          setPending(true)
          try {
            await newConfig.onConfirm?.()
            setOpen(false)
            resolve(true)
          } catch (err) {
            console.error("Confirmation action failed:", err)
            resolve(false)
          } finally {
            setPending(false)
          }
        },
      }))
    })
  }

  const close = () => {
    setOpen(false)
    setPending(false)
  }

  return {
    open,
    confirm,
    close,
    config: { ...config, isLoading: pending },
  }
}
