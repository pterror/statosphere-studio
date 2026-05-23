<template>
  <div class="flex flex-1 min-h-0">
    <ElementList
      label="Functions"
      :items="store.config.functions.map((f) => f.name)"
      :selected="selected"
      @add="add"
      @select="selected = $event"
    />
    <div class="flex-1 min-w-0 overflow-y-auto p-4" v-if="item">
      <div class="flex flex-col gap-3 max-w-2xl">
        <FieldRow label="Name" section="functions" field="name">
          <input v-model="item.name" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Parameters" section="functions" field="parameters">
          <input v-model="item.parameters" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Function Body" section="functions" field="body">
          <textarea v-model="item.body" class="field-input font-mono" rows="8" @input="store.markDirty()" />
        </FieldRow>
        <div v-if="fieldErrors.length" class="text-xs text-red-400">
          <div v-for="e in fieldErrors" :key="e">{{ e }}</div>
        </div>
        <button class="btn-danger self-start" @click="remove">Remove</button>
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center text-gray-600 text-sm" v-else>
      Select or add a function
    </div>
    <HelpRail />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore, type FunctionDef } from '../../stores/config'
import ElementList from '../ElementList.vue'
import HelpRail from '../HelpRail.vue'
import FieldRow from './FieldRow.vue'

const store = useConfigStore()
const selected = ref<number | null>(null)

const item = computed<FunctionDef | null>(() =>
  selected.value !== null ? store.config.functions[selected.value] ?? null : null
)

const fieldErrors = computed(() =>
  store.errors.functions.filter((e) =>
    selected.value !== null && e.startsWith(`/${selected.value}`)
  )
)

function add() {
  store.config.functions.push({ name: '', parameters: '', body: '' })
  selected.value = store.config.functions.length - 1
  store.markDirty()
}

function remove() {
  if (selected.value === null) return
  store.config.functions.splice(selected.value, 1)
  selected.value = store.config.functions.length === 0 ? null : Math.min(selected.value, store.config.functions.length - 1)
  store.markDirty()
}
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
.btn-danger {
  @apply px-3 py-1 text-sm rounded bg-red-900 text-red-200 hover:bg-red-800;
}
</style>
