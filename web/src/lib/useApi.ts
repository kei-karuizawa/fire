import { useCallback, useEffect, useRef, useState } from "react"
import { api, ApiError } from "./api"

// Results are cached per profile and path so returning to a page shows the
// last data at once while it refreshes.
const cache = new Map<string, unknown>()
let cacheScope = ""

export function setCacheScope(scope: string) {
  if (scope !== cacheScope) cache.clear()
  cacheScope = scope
}

export function clearCache() {
  cache.clear()
}

export function useApi<T>(path: string | null) {
  const [data, setDataState] = useState<T | undefined>(() => (path ? (cache.get(path) as T | undefined) : undefined))
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const current = useRef(path)
  current.current = path

  const load = useCallback(async () => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const result = await api<T>(path)
      if (current.current !== path) return
      cache.set(path, result)
      setDataState(result)
    } catch (caught) {
      if (current.current !== path) return
      setError(caught instanceof ApiError ? caught : new ApiError(0, "unknown", String(caught)))
    } finally {
      if (current.current === path) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    setDataState(path ? (cache.get(path) as T | undefined) : undefined)
    void load()
  }, [path, load])

  const setData = useCallback(
    (value: T) => {
      if (path) cache.set(path, value)
      setDataState(value)
    },
    [path],
  )

  return { data, error, loading, reload: load, setData }
}
