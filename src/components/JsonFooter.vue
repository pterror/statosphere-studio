<template>
  <div class="border-t border-gray-800 bg-gray-950 shrink-0" :class="fullscreen ? 'fixed inset-0 z-50 flex flex-col' : ''">
    <div class="flex items-center gap-2 px-3 py-1 bg-gray-900">
      <button class="text-xs text-gray-400 hover:text-gray-200" @click="open = !open">
        {{ open ? 'v' : '>' }} JSON
      </button>
      <span v-if="parseError" class="text-xs text-red-400 ml-2">{{ parseError }}</span>
      <div class="ml-auto flex gap-2">
        <button v-if="open" class="text-xs text-gray-400 hover:text-gray-200" @click="fullscreen = !fullscreen">
          {{ fullscreen ? 'exit fullscreen' : 'fullscreen' }}
        </button>
      </div>
    </div>
    <div v-if="open" class="flex flex-col flex-1 min-h-0">
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
import { ref, watch } from 'vue'
import { useConfigStore } from '../stores/config'

const store = useConfigStore()
const open = ref(false)
const fullscreen = ref(false)
const draft = ref(store.json)
const parseError = ref<string | null>(null)

watch(() => store.json, (val) => {
  if (!parseError.value) draft.value = val
})

function onInput(e: Event) {
  const raw = (e.target as HTMLTextAreaElement).value
  draft.value = raw
  const err = store.loadJson(raw)
  parseError.value = err
}
</script>
