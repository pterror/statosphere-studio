<template>
  <div class="flex flex-col gap-3">
    <FieldRow label="Name" section="variables" field="name">
      <input v-model="item.name" class="field-input" @input="emit('change')" />
    </FieldRow>
    <FieldRow label="Initial Value" section="variables" field="initialValue">
      <ExpressionField v-model="item.initialValue" :rows="2" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Initial Input Update" section="variables" field="perTurnUpdate">
      <ExpressionField v-model="item.perTurnUpdate" :rows="2" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Final Input Update" section="variables" field="postInputUpdate">
      <ExpressionField v-model="item.postInputUpdate" :rows="2" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Initial Response Update" section="variables" field="preResponseUpdate">
      <ExpressionField v-model="item.preResponseUpdate" :rows="2" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Final Response Update" section="variables" field="postResponseUpdate">
      <ExpressionField v-model="item.postResponseUpdate" :rows="2" @update:model-value="emit('change')" />
    </FieldRow>
  </div>
</template>

<script setup lang="ts">
import type { Variable } from '../../stores/config'
import FieldRow from '../sections/FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'

defineProps<{ item: Variable }>()
const emit = defineEmits<{ change: [] }>()
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
