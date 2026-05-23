<template>
  <div class="flex flex-1 min-h-0">
    <ElementList
      label="Content Rules"
      :items="store.config.contentRules.map((r) => r.category || '(rule)')"
      :selected="selected"
      @add="add"
      @select="selected = $event"
    />
    <div class="flex-1 min-w-0 overflow-y-auto p-4" v-if="item">
      <div class="flex flex-col gap-3 max-w-2xl">
        <FieldRow label="Category" desc="Category of content to modify with this rule.">
          <select v-model="item.category" class="field-input" @change="store.markDirty()">
            <option>Input</option>
            <option>Post Input</option>
            <option>Stage Direction</option>
            <option>Response</option>
            <option>Post Response</option>
          </select>
        </FieldRow>
        <FieldRow label="Condition" desc="Requirement for inclusion.">
          <input v-model="item.condition" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Modification" desc="This content category will be set to this value; use {{content}} to embed or reference the current content.">
          <textarea v-model="item.modification" class="field-input" rows="6" @input="store.markDirty()" />
        </FieldRow>
        <div v-if="fieldErrors.length" class="text-xs text-red-400">
          <div v-for="e in fieldErrors" :key="e">{{ e }}</div>
        </div>
        <button class="btn-danger self-start" @click="remove">Remove Rule</button>
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center text-gray-600 text-sm" v-else>
      Select or add a content rule
    </div>
    <HelpRail />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore, type ContentRule } from '../../stores/config'
import ElementList from '../ElementList.vue'
import HelpRail from '../HelpRail.vue'
import FieldRow from './FieldRow.vue'

const store = useConfigStore()
const selected = ref<number | null>(null)

const item = computed<ContentRule | null>(() =>
  selected.value !== null ? store.config.contentRules[selected.value] ?? null : null
)

const fieldErrors = computed(() =>
  store.errors.contentRules.filter((e) =>
    selected.value !== null && e.startsWith(`/${selected.value}`)
  )
)

function add() {
  store.config.contentRules.push({ category: 'Input', condition: '', modification: '' })
  selected.value = store.config.contentRules.length - 1
  store.markDirty()
}

function remove() {
  if (selected.value === null) return
  store.config.contentRules.splice(selected.value, 1)
  selected.value = store.config.contentRules.length === 0 ? null : Math.min(selected.value, store.config.contentRules.length - 1)
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
