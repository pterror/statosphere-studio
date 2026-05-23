<template>
  <div class="flex flex-col gap-3">
    <FieldRow label="Category" section="contentRules" field="category">
      <EnumChoice v-model="item.category" :options="categoryOptions" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Condition" section="contentRules" field="condition">
      <ExpressionField v-model="item.condition" :rows="2" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Modification" section="contentRules" field="modification">
      <ExpressionField v-model="item.modification" :rows="6" @update:model-value="emit('change')" />
    </FieldRow>
  </div>
</template>

<script setup lang="ts">
import type { ContentRule } from '../../stores/config'
import FieldRow from '../sections/FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'
import EnumChoice from '../widgets/EnumChoice.vue'

defineProps<{ item: ContentRule }>()
const emit = defineEmits<{ change: [] }>()

const categoryOptions = [
  { value: 'Input', label: 'Input', description: 'Rewrites the user message before the bot sees it.' },
  { value: 'Post Input', label: 'Post Input', description: 'Adds a system note after input classifiers run.' },
  { value: 'Stage Direction', label: 'Stage Direction', description: 'Injects a hidden instruction block into the bot prompt.' },
  { value: 'Response', label: 'Response', description: 'Rewrites the bot reply before it is shown to the user.' },
  { value: 'Post Response', label: 'Post Response', description: 'Adds a system note after response classifiers run.' },
]
</script>
