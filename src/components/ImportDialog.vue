<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-black/60 z-40" />
      <DialogContent class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border border-gray-700 rounded-lg p-6 w-[560px] max-w-[90vw] shadow-xl">
        <DialogTitle class="text-gray-100 font-semibold mb-4">Import</DialogTitle>
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
import { useConfigStore } from '../stores/config'

const open = defineModel<boolean>('open', { default: false })
const configStore = useConfigStore()
const input = ref('')
const error = ref('')

function doImport() {
  error.value = ''
  const raw = input.value.trim()
  if (!raw) return
  try {
    let parsed: unknown
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
  @apply px-3 py-1.5 rounded text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors;
}
.btn-cancel {
  @apply px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors;
}
</style>
