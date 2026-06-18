import { createHash } from 'node:crypto'
import type { Provider, Kind } from './types.js'

export function makeStructuredId(provider: Provider, kind: Kind, key: string): string {
  return `${provider}:${kind}:${key}`
}

export function makeHashId(provider: Provider, url: string, title: string): string {
  const hash = createHash('sha256')
    .update(provider + url + title)
    .digest('hex')
    .slice(0, 12)
  return `${provider}:hash:${hash}`
}

export function parseProvider(id: string): Provider {
  return id.split(':')[0] as Provider
}

export function isHashId(id: string): boolean {
  return id.includes(':hash:')
}
