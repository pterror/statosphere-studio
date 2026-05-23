import { decodeConfig } from './encode'
import { decodeRecipe } from './recipe-encode'
import type { ConfigTree } from '../stores/config'
import type { RecipeDef } from '../recipes/types'

export const DEFAULT_TRUSTED_PREFIXES = [
  'https://github.com/',
  'https://gist.github.com/',
  'https://raw.githubusercontent.com/',
  'https://gist.githubusercontent.com/',
]

export function transformUrl(url: string): string {
  // github.com/<user>/<repo>/blob/<rest> → raw.githubusercontent.com
  const blobMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/)
  if (blobMatch) {
    return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}`
  }
  // gist.github.com/<user>/<id> → gist.githubusercontent.com/<user>/<id>/raw
  const gistMatch = url.match(/^https:\/\/gist\.github\.com\/([^/]+)\/([^/?#]+)([?#].*)?$/)
  if (gistMatch) {
    return `https://gist.githubusercontent.com/${gistMatch[1]}/${gistMatch[2]}/raw`
  }
  return url
}

function isTrusted(url: string, prefixes: string[]): boolean {
  return prefixes.some((p) => url.startsWith(p))
}

function isConfig(obj: any): obj is ConfigTree {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    ['variables', 'classifiers', 'generators', 'contentRules', 'functions'].some((k) => Array.isArray(obj[k]))
  )
}

function isSerializedRecipe(obj: any): obj is RecipeDef {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.params) &&
    obj.source?.kind === 'template'
  )
}

export type ParsedPayload =
  | { kind: 'hash-config'; data: ConfigTree }
  | { kind: 'hash-recipe'; data: RecipeDef }
  | { kind: 'config'; data: ConfigTree }
  | { kind: 'recipe'; data: RecipeDef }

export async function fetchAndParse(
  url: string,
  opts: { allowUntrusted?: boolean; trustedPrefixes?: string[] } = {},
): Promise<ParsedPayload> {
  const prefixes = opts.trustedPrefixes ?? DEFAULT_TRUSTED_PREFIXES

  if (!opts.allowUntrusted && !isTrusted(url, prefixes)) {
    throw new Error('URL host not in trusted-prefix list')
  }

  // Check if URL contains a hash fragment we can decode directly.
  const hashIdx = url.indexOf('#')
  if (hashIdx !== -1) {
    const fragment = url.slice(hashIdx)
    const cfgMatch = fragment.match(/[#&]cfg=([^&]+)/)
    if (cfgMatch) {
      return { kind: 'hash-config', data: decodeConfig(cfgMatch[1]) }
    }
    const rcpMatch = fragment.match(/[#&]rcp=([^&]+)/)
    if (rcpMatch) {
      return { kind: 'hash-recipe', data: decodeRecipe(rcpMatch[1]) }
    }
  }

  const fetchUrl = transformUrl(url.split('#')[0])

  let text: string
  try {
    const res = await fetch(fetchUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    text = await res.text()
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(`Network error (possible CORS block): ${(e as Error).message}`)
    }
    throw e
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Response is not valid JSON')
  }

  if (isSerializedRecipe(parsed)) {
    parsed.id = `custom-${crypto.randomUUID()}`
    return { kind: 'recipe', data: parsed }
  }
  if (isConfig(parsed)) {
    return { kind: 'config', data: parsed as ConfigTree }
  }
  throw new Error('Could not detect payload: expected a config object or a serialized template recipe')
}
