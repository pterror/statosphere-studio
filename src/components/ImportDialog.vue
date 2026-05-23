<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-black/60 z-40" />
      <DialogContent class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border border-gray-700 rounded-lg p-6 w-[560px] max-w-[90vw] shadow-xl">
        <DialogTitle class="text-gray-100 font-semibold mb-4">Import</DialogTitle>

        <!-- URL import -->
        <p class="text-xs text-gray-400 mb-1">Import from URL</p>
        <div class="flex gap-2 mb-1">
          <input
            v-model="urlInput"
            class="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
            placeholder="https://gist.github.com/user/abc123"
          />
          <button class="btn-action" :disabled="urlLoading" @click="doUrlImport">
            {{ urlLoading ? 'Loading…' : 'Import' }}
          </button>
        </div>
        <label v-if="urlUntrustedWarning" class="flex items-center gap-2 text-xs text-yellow-400 mb-1 cursor-pointer">
          <input v-model="bypassTrust" type="checkbox" class="accent-yellow-400" />
          URL host not in trusted-prefix list — check to bypass for this import
        </label>
        <p v-if="urlError" class="text-xs text-red-400 mb-2">{{ urlError }}</p>
        <p v-if="urlSuccess" class="text-xs text-green-400 mb-2">{{ urlSuccess }}</p>

        <div class="border-t border-gray-800 my-4" />

        <!-- JSON paste -->
        <p class="text-xs text-gray-400 mb-2">Paste a share URL or raw JSON.</p>
        <textarea
          v-model="input"
          class="w-full h-40 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-indigo-500"
          placeholder="https://...#cfg=... or { &quot;variables&quot;: [] ... }"
        />
        <p v-if="error" class="text-xs text-red-400 mt-1">{{ error }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <DialogClose class="btn-cancel">Cancel</DialogClose>
          <button class="btn-action" @click="doImport">Load</button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
import { decodeConfig } from '../share/encode'
import { decodeRecipe } from '../share/recipe-encode'
import { fetchAndParse } from '../share/url-loader'
import { useConfigStore } from '../stores/config'
import { useRecipesStore } from '../stores/recipes'
import { useSettingsStore } from '../stores/settings'

const open = defineModel<boolean>('open', { default: false })
const configStore = useConfigStore()
const recipesStore = useRecipesStore()
const settingsStore = useSettingsStore()
const input = ref('')
const error = ref('')

// URL import state
const urlInput = ref('')
const urlLoading = ref(false)
const urlError = ref('')
const urlSuccess = ref('')
const urlUntrustedWarning = ref(false)
const bypassTrust = ref(false)

async function doUrlImport() {
  urlError.value = ''
  urlSuccess.value = ''
  urlUntrustedWarning.value = false
  const url = urlInput.value.trim()
  if (!url) return

  // Pre-check trust before attempting fetch
  const trusted = settingsStore.trustedPrefixes.some((p) => url.startsWith(p))
  if (!trusted && !bypassTrust.value) {
    urlUntrustedWarning.value = true
    urlError.value = 'URL host not in trusted-prefix list'
    return
  }

  urlLoading.value = true
  try {
    const result = await fetchAndParse(url, { allowUntrusted: bypassTrust.value || trusted, trustedPrefixes: settingsStore.trustedPrefixes })
    if (result.kind === 'config' || result.kind === 'hash-config') {
      configStore.replace(result.data)
      urlSuccess.value = 'Config loaded.'
      open.value = false
    } else if (result.kind === 'recipe' || result.kind === 'hash-recipe') {
      recipesStore.addCustomRecipe(result.data)
      urlSuccess.value = `Recipe "${result.data.name}" added to your library.`
      urlInput.value = ''
    }
  } catch (e) {
    urlError.value = (e as Error).message
  } finally {
    urlLoading.value = false
  }
}

function doImport() {
  error.value = ''
  const raw = input.value.trim()
  if (!raw) return
  try {
    let parsed: unknown
    const rcpMatch = raw.match(/[#&]rcp=([^&\s]+)/)
    if (rcpMatch) {
      const def = decodeRecipe(rcpMatch[1])
      recipesStore.addCustomRecipe(def)
      open.value = false
      input.value = ''
      return
    }
    const cfgMatch = raw.match(/[#&]cfg=([^&\s]+)/)
    if (cfgMatch) {
      parsed = decodeConfig(cfgMatch[1])
    } else {
      parsed = JSON.parse(raw)
    }
    if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid config')
    configStore.replace(parsed as Parameters<typeof configStore.replace>[0])
    open.value = false
    input.value = ''
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<style scoped>
.btn-action {
  @apply px-3 py-1.5 rounded text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-cancel {
  @apply px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors;
}
</style>
