<template>
  <div class="flex flex-col gap-3">
    <FieldRow label="Name" section="functions" field="name">
      <input v-model="item.name" class="field-input" @input="emit('change')" />
    </FieldRow>
    <FieldRow label="Parameters" section="functions" field="parameters">
      <input v-model="item.parameters" class="field-input" @input="emit('change')" />
    </FieldRow>
    <FieldRow label="Function Body" section="functions" field="body">
      <textarea v-model="item.body" class="field-input font-mono" rows="8" @input="emit('change')" />
    </FieldRow>
  </div>
</template>

<script setup lang="ts">
import type { FunctionDef } from '../../stores/config'
import FieldRow from '../sections/FieldRow.vue'

defineProps<{ item: FunctionDef }>()
const emit = defineEmits<{ change: [] }>()
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
