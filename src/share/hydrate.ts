import { useConfigStore } from '../stores/config'
import { useDraftsStore } from '../stores/drafts'
import { encodeConfig, decodeConfig } from './encode'

export function hydrateFromLocation(): void {
  if (typeof window === 'undefined') return
  const configStore = useConfigStore()
  const draftsStore = useDraftsStore()
  const hash = window.location.hash
  const match = hash.match(/[#&]cfg=([^&]+)/)
  if (match) {
    try {
      const decoded = decodeConfig(match[1])
      configStore.replace(decoded)
    } catch {
    }
    return
  }
  const scratch = draftsStore.loadScratch()
  if (scratch) {
    configStore.replace(scratch)
  }
}

export function buildShareUrl(): string {
  if (typeof window === 'undefined') return ''
  const configStore = useConfigStore()
  const encoded = encodeConfig(configStore.config)
  return `${window.location.origin}${window.location.pathname}#cfg=${encoded}`
}
