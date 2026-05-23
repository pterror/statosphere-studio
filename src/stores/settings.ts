import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { DEFAULT_TRUSTED_PREFIXES } from '../share/url-loader'

const SETTINGS_KEY = 'statosphere-studio-settings-v2'

interface SettingsState {
  theme: 'light' | 'dark' | 'auto'
  trustedPrefixes: string[]
  defaultExpandAdvanced: boolean
  stripPrefixOnExport: boolean
  reducedMotion: boolean
}

function load(): SettingsState {
  if (typeof window === 'undefined') {
    return { theme: 'auto', trustedPrefixes: [...DEFAULT_TRUSTED_PREFIXES], defaultExpandAdvanced: false, stripPrefixOnExport: false, reducedMotion: false }
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) throw new Error('empty')
    const parsed = JSON.parse(raw) as Partial<SettingsState>
    return {
      theme: parsed.theme ?? 'auto',
      trustedPrefixes: parsed.trustedPrefixes ?? [...DEFAULT_TRUSTED_PREFIXES],
      defaultExpandAdvanced: parsed.defaultExpandAdvanced ?? false,
      stripPrefixOnExport: parsed.stripPrefixOnExport ?? false,
      reducedMotion: parsed.reducedMotion ?? false,
    }
  } catch {
    return { theme: 'auto', trustedPrefixes: [...DEFAULT_TRUSTED_PREFIXES], defaultExpandAdvanced: false, stripPrefixOnExport: false, reducedMotion: false }
  }
}

function save(s: SettingsState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = load()
  const theme = ref<'light' | 'dark' | 'auto'>(initial.theme)
  const trustedPrefixes = ref<string[]>(initial.trustedPrefixes)
  const defaultExpandAdvanced = ref(initial.defaultExpandAdvanced)
  const stripPrefixOnExport = ref(initial.stripPrefixOnExport)
  const reducedMotion = ref(initial.reducedMotion)

  function persist() {
    save({ theme: theme.value, trustedPrefixes: trustedPrefixes.value, defaultExpandAdvanced: defaultExpandAdvanced.value, stripPrefixOnExport: stripPrefixOnExport.value, reducedMotion: reducedMotion.value })
  }

  watch([theme, trustedPrefixes, defaultExpandAdvanced, stripPrefixOnExport, reducedMotion], persist, { deep: true })

  function addTrustedPrefix(prefix: string) {
    if (prefix && !trustedPrefixes.value.includes(prefix)) {
      trustedPrefixes.value.push(prefix)
    }
  }

  function removeTrustedPrefix(prefix: string) {
    const idx = trustedPrefixes.value.indexOf(prefix)
    if (idx !== -1) trustedPrefixes.value.splice(idx, 1)
  }

  function setTheme(t: 'light' | 'dark' | 'auto') {
    theme.value = t
  }

  function togglePrefix() {
    stripPrefixOnExport.value = !stripPrefixOnExport.value
  }

  function clearScratchSlot() {
    if (typeof window === 'undefined') return
    localStorage.removeItem('statosphere-studio:scratch:v1')
  }

  function resetAll() {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('statosphere-studio')) keysToRemove.push(k)
    }
    for (const k of keysToRemove) localStorage.removeItem(k)
    window.location.reload()
  }

  return {
    theme,
    trustedPrefixes,
    defaultExpandAdvanced,
    stripPrefixOnExport,
    reducedMotion,
    addTrustedPrefix,
    removeTrustedPrefix,
    setTheme,
    togglePrefix,
    clearScratchSlot,
    resetAll,
  }
})
