import { useState, useMemo } from "react"

/**
 * Filter management hook for admin lists
 * Handles filtering, sorting, and search across lists
 */
export function useAdminListFilters(items, searchFields = [], initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters)

  const filtered = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      if (filters.search && filters.search.trim()) {
        const query = filters.search.toLowerCase()
        const matchesSearch = searchFields.some((field) => {
          const value = field(item)
          return value && value.toString().toLowerCase().includes(query)
        })
        if (!matchesSearch) return false
      }

      // Status filter
      if (filters.status && filters.status !== "all") {
        const itemStatus = item.status || item.verificationStatus || "unknown"
        if (itemStatus !== filters.status) return false
      }

      // Custom filters
      for (const [key, value] of Object.entries(filters)) {
        if (["search", "status", "page", "pageSize"].includes(key)) continue
        if (value && value !== "all") {
          if (item[key] !== value) return false
        }
      }

      return true
    })
  }, [items, filters, searchFields])

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters(initialFilters)
  }

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) =>
      value &&
      value !== "all" &&
      !["page", "pageSize"].includes(key) &&
      (typeof value === "string" ? value.trim() : value)
  )

  return {
    filters,
    filtered,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    setFilters,
  }
}

/**
 * Expandable item state hook
 */
export function useExpandableItem() {
  const [expanded, setExpanded] = useState(null)

  const toggle = (id) => {
    setExpanded(expanded === id ? null : id)
  }

  const isExpanded = (id) => expanded === id

  return { expanded, toggle, isExpanded, setExpanded }
}

/**
 * Modal/Dialog state hook
 */
export function useAdminModal(initialState = null) {
  const [modal, setModal] = useState(initialState)

  const open = (type) => setModal(type)
  const close = () => setModal(null)
  const isOpen = (type) => modal === type

  return { modal, open, close, isOpen, setModal }
}

/**
 * Async action handler with loading and error states
 */
export function useAdminAction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = async (asyncFn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      const message = err.response?.data?.message || err.message || "وجد خطأ"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setError(null)
    setLoading(false)
  }

  return { execute, loading, error, setError, clear }
}
