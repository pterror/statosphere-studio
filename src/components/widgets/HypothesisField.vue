<template>
  <div class="flex flex-col gap-1">
    <input
      :value="modelValue"
      class="field-input"
      @input="onInput"
    />
    <div v-if="previews.length" class="flex flex-col gap-0.5 mt-0.5">
      <div
        v-for="p in previews"
        :key="p"
        class="text-xs text-gray-500 font-mono px-1"
      >{{ p }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  labels: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const previews = computed(() => {
  if (!props.modelValue || !props.labels.length) return []
  return props.labels
    .filter((l) => l.trim())
    .map((l) => props.modelValue.replace('{}', `[${l}]`))
})

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
