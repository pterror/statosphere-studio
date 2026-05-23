<template>
  <div class="flex flex-1 min-h-0">
    <ElementList
      label="Content Rules"
      :items="store.config.contentRules.map((r) => r.category || '(rule)')"
      :selected="selected"
      @add="add"
      @select="selected = $event"
    />
    <div class="flex-1 min-w-0 overflow-y-auto p-4" v-if="item">
      <div class="flex flex-col gap-3 max-w-2xl">
        <FieldRow label="Category" section="contentRules" field="category">
          <EnumChoice
            v-model="item.category"
            :options="categoryOptions"
            @update:model-value="store.markDirty()"
          />
        </FieldRow>
        <FieldRow label="Condition" section="contentRules" field="condition">
          <ExpressionField v-model="item.condition" :rows="2" @update:model-value="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Modification" section="contentRules" field="modification">
          <ExpressionField v-model="item.modification" :rows="6" @update:model-value="store.markDirty()" />
        </FieldRow>
        <div v-if="fieldErrors.length" class="text-xs text-red-400">
          <div v-for="e in fieldErrors" :key="e">{{ e }}</div>
        </div>
        <button class="btn-danger self-start" @click="remove">Remove Rule</button>
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center text-gray-600 text-sm" v-else>
      Select or add a content rule
    </div>
    <HelpRail />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore, type ContentRule } from '../../stores/config'
import ElementList from '../ElementList.vue'
import HelpRail from '../HelpRail.vue'
import FieldRow from './FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'
import EnumChoice from '../widgets/EnumChoice.vue'

const store = useConfigStore()
const selected = ref<number | null>(null)

const categoryOptions = [
  { value: 'Input', label: 'Input', description: 'Rewrites the user message before the bot sees it.' },
  { value: 'Post Input', label: 'Post Input', description: 'Adds a system note after input classifiers run.' },
  { value: 'Stage Direction', label: 'Stage Direction', description: 'Injects a hidden instruction block into the bot prompt.' },
  { value: 'Response', label: 'Response', description: 'Rewrites the bot reply before it is shown to the user.' },
  { value: 'Post Response', label: 'Post Response', description: 'Adds a system note after response classifiers run.' },
]

const item = computed<ContentRule | null>(() =>
  selected.value !== null ? store.config.contentRules[selected.value] ?? null : null
)

const fieldErrors = computed(() =>
  store.errors.contentRules.filter((e) =>
    selected.value !== null && e.startsWith(`/${selected.value}`)
  )
)

function add() {
  store.config.contentRules.push({ category: 'Input', condition: '', modification: '' })
  selected.value = store.config.contentRules.length - 1
  store.markDirty()
}

function remove() {
  if (selected.value === null) return
  store.config.contentRules.splice(selected.value, 1)
  selected.value = store.config.contentRules.length === 0 ? null : Math.min(selected.value, store.config.contentRules.length - 1)
  store.markDirty()
}
</script>

<style scoped>
.btn-danger {
  @apply px-3 py-1 text-sm rounded bg-red-900 text-red-200 hover:bg-red-800;
}
</style>
