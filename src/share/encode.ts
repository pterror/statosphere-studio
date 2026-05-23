import { gzipSync, gunzipSync } from 'fflate'
import type { ConfigTree } from '../stores/config'
import type { RecipeDef, RecipeInstance } from '../recipes/types'

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

// Wire format for #cfg= hash (v2.5+):
//   With sidecar:  { config: ConfigTree, sidecar: { instances: RecipeInstance[], customLibrary: RecipeDef[] } }
//   Plain-config:  ConfigTree (legacy v1 exports, no sidecar key — treated as raw import, wrapped as Custom recipe)
//
// Encoding: JSON → TextEncoder → gzipSync → base64url

export interface StudioSidecar {
  instances: RecipeInstance[]
  customLibrary: RecipeDef[]
}

export interface EncodedPayload {
  config: ConfigTree
  sidecar: StudioSidecar
}

function compressJson(value: unknown): string {
  const json = JSON.stringify(value)
  const encoded = new TextEncoder().encode(json)
  const compressed = gzipSync(encoded)
  return encodeBase64Url(compressed)
}

function decompressJson(hash: string): unknown {
  const bytes = decodeBase64Url(hash)
  const decompressed = gunzipSync(bytes)
  const json = new TextDecoder().decode(decompressed)
  return JSON.parse(json)
}

/** Encode config + studio sidecar (instances + customLibrary) into a #cfg= hash. */
export function encodeConfig(config: ConfigTree, sidecar?: StudioSidecar): string {
  if (sidecar) {
    const payload: EncodedPayload = { config, sidecar }
    return compressJson(payload)
  }
  // Plain-config mode (legacy/external callers that pass no sidecar)
  return compressJson(config)
}

export interface DecodeConfigResult {
  config: ConfigTree
  sidecar?: StudioSidecar
}

/** Decode a #cfg= hash. Returns config and optional sidecar. */
export function decodeConfig(hash: string): DecodeConfigResult {
  const raw = decompressJson(hash)
  if (raw && typeof raw === 'object' && 'sidecar' in (raw as object)) {
    const payload = raw as EncodedPayload
    return { config: payload.config, sidecar: payload.sidecar }
  }
  // Legacy plain-config payload — no sidecar; caller wraps as Custom recipe
  return { config: raw as ConfigTree }
}
