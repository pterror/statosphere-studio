<template>
  <div class="border-t border-gray-800 bg-gray-950 shrink-0" :class="fullscreen ? 'fixed inset-0 z-50 flex flex-col' : ''">
    <!-- Collapsed preview bar -->
    <div
      class="flex items-center gap-2 px-3 py-1 bg-gray-900 cursor-pointer select-none"
      @click="!fullscreen && (open = !open)"
    >
      <span class="text-xs text-gray-400">
        {{ open || fullscreen ? (fullscreen ? '↙' : '▼') : '▶' }} JSON
      </span>
      <span v-if="!open && !fullscreen" class="text-xs text-gray-600 font-mono truncate max-w-xs">{{ preview }}</span>
      <span v-if="parseError" class="text-xs text-red-400 ml-1">{{ parseError }}</span>
      <span v-if="!parseError && !open && !fullscreen" class="text-xs text-gray-600 ml-1">{{ sizeLabel }}</span>
      <div class="ml-auto flex gap-2">
        <button v-if="open || fullscreen" class="text-xs text-gray-400 hover:text-gray-200" @click.stop="fullscreen = !fullscreen">
          {{ fullscreen ? 'exit fullscreen' : 'fullscreen' }}
        </button>
        <button v-if="fullscreen" class="text-xs text-gray-400 hover:text-gray-200" @click.stop="open = false; fullscreen = false">collapse</button>
      </div>
    </div>
    <div v-if="open || fullscreen" class="flex flex-col flex-1 min-h-0">
      <textarea
        class="flex-1 w-full bg-gray-950 text-green-300 font-mono text-xs p-3 resize-none outline-none min-h-48"
        :value="draft"
        spellcheck="false"
        @input="onInput"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '../stores/config'

const store = useConfigStore()
const open = ref(false)
const fullscreen = ref(false)
const draft = ref(store.json)
const parseError = ref<string | null>(null)

watch(() => store.json, (val) => {
  if (!parseError.value) draft.value = val
})

const preview = computed(() => {
  const j = store.json
  return j.length > 60 ? j.slice(0, 57) + '…' : j
})

const sizeLabel = computed(() => {
  const bytes = new TextEncoder().encode(store.json).length
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
})

function onInput(e: Event) {
  const raw = (e.target as HTMLTextAreaElement).value
  draft.value = raw
  const err = store.loadJson(raw)
  parseError.value = err
}
</script>
