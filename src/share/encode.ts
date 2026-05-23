import { gzipSync, gunzipSync } from 'fflate'
import type { ConfigTree } from '../stores/config'

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodeBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((str.length * 3) % 4 === 0 ? 0 : (4 - ((str.length * 3) % 4)))
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function encodeConfig(config: ConfigTree): string {
  const json = JSON.stringify(config)
  const encoded = new TextEncoder().encode(json)
  const compressed = gzipSync(encoded)
  return encodeBase64Url(compressed)
}

export function decodeConfig(hash: string): ConfigTree {
  const bytes = decodeBase64Url(hash)
  const decompressed = gunzipSync(bytes)
  const json = new TextDecoder().decode(decompressed)
  return JSON.parse(json) as ConfigTree
}
