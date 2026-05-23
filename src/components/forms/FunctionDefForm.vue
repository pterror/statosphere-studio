<template>
  <div class="flex flex-col gap-3">
    <!-- Header row -->
    <div class="flex gap-2 items-end">
      <div class="flex flex-col gap-0.5 flex-1">
        <label class="text-xs text-gray-500">Name</label>
        <input v-model="item.name" class="field-input" @input="emit('change')" />
      </div>
      <div class="flex flex-col gap-0.5 flex-1">
        <label class="text-xs text-gray-500">Parameters</label>
        <input v-model="item.parameters" class="field-input" @input="emit('change')" />
      </div>
      <button class="text-xs text-gray-500 hover:text-gray-300 px-1 shrink-0" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '▲ less' : '▼ more' }}</button>
    </div>

    <FieldRow label="Function Body" section="functions" field="body">
      <textarea v-model="item.body" class="field-input font-mono" :rows="showAdvanced ? 8 : 4" @input="emit('change')" />
    </FieldRow>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FunctionDef } from '../../stores/config'
import FieldRow from '../sections/FieldRow.vue'
import { useSettingsStore } from '../../stores/settings'

defineProps<{ item: FunctionDef }>()
const emit = defineEmits<{ change: [] }>()
const showAdvanced = ref(useSettingsStore().defaultExpandAdvanced)
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
