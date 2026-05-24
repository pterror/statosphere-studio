<template>
  <div class="flex flex-col gap-1">
    <textarea
      :value="modelValue"
      :aria-label="ariaLabel"
      class="field-input font-mono"
      :rows="rows"
      @input="onInput"
    />
    <div v-if="referencedVars.length" class="flex flex-wrap gap-1 mt-0.5">
      <span
        v-for="v in referencedVars"
        :key="v"
        class="px-1.5 py-0.5 rounded text-xs font-mono"
        :class="undeclaredVars.has(v) ? 'bg-red-900/60 text-red-300 border border-red-700' : 'bg-indigo-900/60 text-indigo-300 border border-indigo-800'"
        :title="undeclaredVars.has(v) ? `'${v}' is not declared as a variable` : v"
      >{{ v }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../../stores/config'

const props = defineProps<{
  modelValue: string
  rows?: number
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const store = useConfigStore()

const VAR_RE = /\{\{(\w+)\}\}/g

const referencedVars = computed(() => {
  const matches = new Set<string>()
  for (const m of props.modelValue.matchAll(VAR_RE)) {
    matches.add(m[1])
  }
  return [...matches]
})

const declaredNames = computed(() =>
  new Set(store.config.variables.map((v) => v.name.toLowerCase()))
)

const undeclaredVars = computed(() => {
  const undeclared = new Set<string>()
  for (const v of referencedVars.value) {
    if (!declaredNames.value.has(v.toLowerCase())) {
      undeclared.add(v)
    }
  }
  return undeclared
})

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
