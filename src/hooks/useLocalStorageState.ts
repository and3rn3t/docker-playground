import { useState, useCallback } from 'react'

/**
 * Drop-in replacement for `useKV` from `@github/spark/hooks`.
 * Persists state to localStorage with the same API:
 *   [value, setter, deleter]
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): readonly [T, (newValue: T | ((oldValue?: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (newValue: T | ((oldValue?: T) => T)) => {
      setStoredValue((prev) => {
        const resolved =
          typeof newValue === 'function'
            ? (newValue as (oldValue?: T) => T)(prev)
            : newValue
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // localStorage full or unavailable — state still updates in memory
        }
        return resolved
      })
    },
    [key]
  )

  const deleteValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    setStoredValue(initialValue)
  }, [key, initialValue])

  return [storedValue, setValue, deleteValue] as const
}
