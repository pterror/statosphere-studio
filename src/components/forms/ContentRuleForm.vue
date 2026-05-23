<template>
  <div class="flex flex-col gap-3">
    <!-- Header row -->
    <div class="flex gap-2 items-end">
      <div class="flex flex-col gap-0.5 flex-1">
        <label class="text-xs text-gray-500">Category</label>
        <EnumChoice v-model="item.category" :options="categoryOptions" @update:model-value="emit('change')" />
      </div>
      <button class="text-xs text-gray-500 hover:text-gray-300 px-1 shrink-0" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '▲ less' : '▼ more' }}</button>
    </div>

    <template v-if="showAdvanced">
      <FieldRow label="Condition" section="contentRules" field="condition">
        <ExpressionField v-model="item.condition" :rows="2" @update:model-value="emit('change')" />
      </FieldRow>
      <FieldRow label="Modification" section="contentRules" field="modification">
        <ExpressionField v-model="item.modification" :rows="6" @update:model-value="emit('change')" />
      </FieldRow>
    </template>
    <template v-else>
      <FieldRow label="Modification" section="contentRules" field="modification">
        <ExpressionField v-model="item.modification" :rows="3" @update:model-value="emit('change')" />
      </FieldRow>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ContentRule } from '../../stores/config'
import FieldRow from '../sections/FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'
import EnumChoice from '../widgets/EnumChoice.vue'
import { useSettingsStore } from '../../stores/settings'

defineProps<{ item: ContentRule }>()
const emit = defineEmits<{ change: [] }>()
const showAdvanced = ref(useSettingsStore().defaultExpandAdvanced)

const categoryOptions = [
  { value: 'Input', label: 'Input', description: 'Rewrites the user message before the bot sees it.' },
  { value: 'Post Input', label: 'Post Input', description: 'Adds a system note after input classifiers run.' },
  { value: 'Stage Direction', label: 'Stage Direction', description: 'Injects a hidden instruction block into the bot prompt.' },
  { value: 'Response', label: 'Response', description: 'Rewrites the bot reply before it is shown to the user.' },
  { value: 'Post Response', label: 'Post Response', description: 'Adds a system note after response classifiers run.' },
]
</script>
