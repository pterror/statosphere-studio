<template>
  <div class="flex flex-col gap-1">
    <div
      v-for="(row, i) in modelValue"
      :key="i"
      class="flex gap-2 items-center"
    >
      <input
        :value="row.variable"
        class="field-input"
        :placeholder="variablePlaceholder"
        @input="updateRow(i, 'variable', ($event.target as HTMLInputElement).value)"
      />
      <span class="text-gray-600 text-xs shrink-0">=</span>
      <input
        :value="row.setTo"
        class="field-input font-mono"
        :placeholder="valuePlaceholder"
        @input="updateRow(i, 'setTo', ($event.target as HTMLInputElement).value)"
      />
      <button
        class="text-xs text-red-400 hover:text-red-300 shrink-0"
        type="button"
        aria-label="Remove row"
        @click="remove(i)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <button
      class="text-xs text-indigo-400 hover:text-indigo-300 self-start mt-0.5"
      type="button"
      @click="add"
    >+ Add</button>
  </div>
</template>

<script setup lang="ts">
export interface KVRow {
  variable: string
  setTo: string
}

const props = defineProps<{
  modelValue: KVRow[]
  variablePlaceholder?: string
  valuePlaceholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: KVRow[]]
}>()

function updateRow(i: number, key: keyof KVRow, value: string) {
  const next = props.modelValue.map((r, idx) => idx === i ? { ...r, [key]: value } : r)
  emit('update:modelValue', next)
}

function remove(i: number) {
  emit('update:modelValue', props.modelValue.filter((_, idx) => idx !== i))
}

function add() {
  emit('update:modelValue', [...props.modelValue, { variable: '', setTo: '' }])
}
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
