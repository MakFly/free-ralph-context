/**
 * SSR-safe localStorage wrapper for Zustand persist middleware
 * Returns a no-op storage when localStorage is unavailable (SSR, tests, private browsing)
 */
import type { StateStorage } from 'zustand/middleware'

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const test = '__zustand_storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

export function getSafeStorage(): StateStorage {
  return isLocalStorageAvailable() ? localStorage : noopStorage
}
