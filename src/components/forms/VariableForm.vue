<template>
  <div class="flex flex-col gap-2">
    <!-- Core: single row -->
    <div class="flex gap-2 items-end">
      <label class="flex flex-col gap-0.5 flex-1 min-w-0">
        <span class="text-xs text-gray-500">Name</span>
        <input v-model="item.name" class="field-input" placeholder="name" @input="emit('change')" />
      </label>
      <label class="flex flex-col gap-0.5 flex-1 min-w-0">
        <span class="text-xs text-gray-500">Initial value</span>
        <input v-model="item.initialValue" class="field-input" placeholder="initial value" @input="emit('change')" />
      </label>
      <label class="flex flex-col gap-0.5 flex-1 min-w-0">
        <span class="text-xs text-gray-500">Per-turn update</span>
        <input v-model="item.perTurnUpdate" class="field-input" placeholder="per-turn update" @input="emit('change')" />
      </label>
      <button class="text-xs text-gray-500 hover:text-gray-300 px-1 shrink-0" :title="showAdvanced ? 'Hide advanced' : 'Show advanced'" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '▲' : '▼' }}</button>
    </div>

    <!-- Advanced: collapsible -->
    <template v-if="showAdvanced">
      <FieldRow label="Final Input Update" section="variables" field="postInputUpdate">
        <ExpressionField v-model="item.postInputUpdate" :rows="2" @update:model-value="emit('change')" />
      </FieldRow>
      <FieldRow label="Initial Response Update" section="variables" field="preResponseUpdate">
        <ExpressionField v-model="item.preResponseUpdate" :rows="2" @update:model-value="emit('change')" />
      </FieldRow>
      <FieldRow label="Final Response Update" section="variables" field="postResponseUpdate">
        <ExpressionField v-model="item.postResponseUpdate" :rows="2" @update:model-value="emit('change')" />
      </FieldRow>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Variable } from '../../stores/config'
import FieldRow from '../sections/FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'
import { useSettingsStore } from '../../stores/settings'

defineProps<{ item: Variable }>()
const emit = defineEmits<{ change: [] }>()

const settings = useSettingsStore()
const showAdvanced = ref(settings.defaultExpandAdvanced)
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
