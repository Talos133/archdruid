import type { Result } from './types.js'

const store = new Map<string, Result>()

export function cacheSet(result: Result): void {
  store.set(result.id, result)
}

export function cacheGet(id: string): Result | undefined {
  return store.get(id)
}

export function cacheGetByUrl(url: string): Result | undefined {
  for (const result of store.values()) {
    if (result.links.html === url) return result
  }
  return undefined
}

export function cacheClear(): void {
  store.clear()
}
