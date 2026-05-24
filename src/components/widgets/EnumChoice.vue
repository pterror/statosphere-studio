<template>
  <div class="flex flex-col gap-1">
    <select :value="modelValue" :aria-label="ariaLabel" class="field-input" @change="onChange">
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >{{ opt.label }}</option>
    </select>
    <p v-if="selectedDescription" class="text-xs text-gray-500">{{ selectedDescription }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface EnumOption {
  value: string
  label: string
  description?: string
}

const props = defineProps<{
  modelValue: string
  options: EnumOption[]
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedDescription = computed(() => {
  const opt = props.options.find((o) => o.value === props.modelValue)
  return opt?.description ?? null
})

function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value)
}
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
