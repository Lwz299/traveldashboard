import { useState, useEffect, useCallback } from "react"

/**
 * Generic hook for fetching data with loading and error handling
 * @param {function} fetchFn - Async function that fetches data
 * @param {array} dependencies - Dependencies for useEffect
 * @returns {object} { data, loading, error, refetch }
 */
export function useFetch(fetchFn, dependencies = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
    } catch (err) {
      setError(err.response?.data?.message || err.message || "وجد خطأ")
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => {
    refetch()
  }, dependencies)

  return { data, loading, error, refetch }
}

/**
 * Hook for managing form state and submission
 * @param {object} initialValues
 * @param {function} onSubmit - Async submit handler
 * @returns {object}
 */
export function useForm(initialValues, onSubmit) {
  const [values, setValues] = useState(initialValues)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }, [])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setLoading(true)
      setError(null)
      try {
        await onSubmit(values)
      } catch (err) {
        setError(err.response?.data?.message || err.message || "وجد خطأ")
      } finally {
        setLoading(false)
      }
    },
    [values, onSubmit]
  )

  const reset = useCallback(() => {
    setValues(initialValues)
    setError(null)
  }, [initialValues])

  return {
    values,
    setValues,
    loading,
    error,
    setError,
    handleChange,
    handleSubmit,
    reset,
  }
}

/**
 * Hook for managing list state with filtering and pagination
 * @param {array} items
 * @param {function} filterFn - Filter function
 * @returns {object}
 */
export function usePaginatedList(items, filterFn = (item) => true) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")

  const filtered = items.filter(filterFn)

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const startIdx = (page - 1) * pageSize
  const endIdx = startIdx + pageSize
  const current = filtered.slice(startIdx, endIdx)

  const goToPage = useCallback((p) => {
    setPage(Math.max(1, Math.min(p, totalPages)))
  }, [totalPages])

  const nextPage = useCallback(() => goToPage(page + 1), [page, goToPage])
  const prevPage = useCallback(() => goToPage(page - 1), [page, goToPage])

  return {
    items: current,
    page,
    pageSize,
    total,
    totalPages,
    setPage: goToPage,
    nextPage,
    prevPage,
    setPageSize,
    search,
    setSearch,
  }
}

/**
 * Hook for managing CRUD operations with notification
 * @param {object} service - Service object with CRUD methods
 * @returns {object}
 */
export function useCrud(service) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const create = useCallback(
    async (data) => {
      setLoading(true)
      setError(null)
      try {
        const result = await service.create(data)
        return result
      } catch (err) {
        const message = err.response?.data?.message || err.message || "فشل الإنشاء"
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [service]
  )

  const update = useCallback(
    async (id, data) => {
      setLoading(true)
      setError(null)
      try {
        const result = await service.update(id, data)
        return result
      } catch (err) {
        const message = err.response?.data?.message || err.message || "فشل التحديث"
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [service]
  )

  const delete_ = useCallback(
    async (id) => {
      setLoading(true)
      setError(null)
      try {
        const result = await service.delete(id)
        return result
      } catch (err) {
        const message = err.response?.data?.message || err.message || "فشل الحذف"
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [service]
  )

  return {
    create,
    update,
    delete: delete_,
    loading,
    error,
    setError,
  }
}
