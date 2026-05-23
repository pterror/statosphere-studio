<template>
  <div class="flex flex-col gap-3">
    <!-- Header row -->
    <div class="flex gap-2 items-end">
      <div class="flex flex-col gap-0.5 flex-1">
        <label class="text-xs text-gray-500">Name</label>
        <input v-model="item.name" class="field-input" @input="emit('change')" />
      </div>
      <button class="text-xs text-gray-500 hover:text-gray-300 px-1 shrink-0" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '▲ less' : '▼ more' }}</button>
    </div>

    <template v-if="showAdvanced">
    <FieldRow label="Condition" section="classifiers" field="condition">
      <ExpressionField v-model="item.condition" :rows="2" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Dependencies" section="classifiers" field="dependencies">
      <input v-model="item.dependencies" class="field-input" @input="emit('change')" />
    </FieldRow>
    <FieldRow label="Input Template" section="classifiers" field="inputTemplate">
      <textarea v-model="item.inputTemplate" class="field-input" rows="3" @input="emit('change')" />
    </FieldRow>
    <FieldRow label="Input Hypothesis Template" section="classifiers" field="inputHypothesis">
      <HypothesisField
        v-model="item.inputHypothesis"
        :labels="item.classifications.map((c) => c.label)"
        @update:model-value="emit('change')"
      />
    </FieldRow>
    <FieldRow label="Response Template" section="classifiers" field="responseTemplate">
      <textarea v-model="item.responseTemplate" class="field-input" rows="3" @input="emit('change')" />
    </FieldRow>
    <FieldRow label="Response Hypothesis Template" section="classifiers" field="responseHypothesis">
      <HypothesisField
        v-model="item.responseHypothesis"
        :labels="item.classifications.map((c) => c.label)"
        @update:model-value="emit('change')"
      />
    </FieldRow>
    <FieldRow label="Use LLM" section="classifiers" field="useLlm">
      <input type="checkbox" v-model="item.useLlm" @change="emit('change')" class="w-4 h-4" />
    </FieldRow>
    <FieldRow label="Use Chat History" section="classifiers" field="useHistory">
      <input type="checkbox" v-model="item.useHistory" @change="emit('change')" class="w-4 h-4" />
    </FieldRow>
    <FieldRow label="History Context Size" section="classifiers" field="historyContextSize">
      <input type="number" v-model.number="item.historyContextSize" class="field-input" @input="emit('change')" />
    </FieldRow>
    </template>

    <div class="border-t border-gray-800 pt-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Classifications</span>
        <button class="text-xs text-indigo-400 hover:text-indigo-300" @click="addClassification">+ Add</button>
      </div>
      <div v-for="(cls, ci) in item.classifications" :key="ci" class="mb-4 pl-3 border-l border-gray-700 flex flex-col gap-2">
        <FieldRow label="Label" section="classifiers" field="label">
          <input v-model="cls.label" class="field-input" @input="emit('change')" />
        </FieldRow>
        <FieldRow label="Condition" section="classifiers" field="labelCondition">
          <ExpressionField v-model="cls.condition" :rows="2" @update:model-value="emit('change')" />
        </FieldRow>
        <FieldRow label="Category" section="classifiers" field="category">
          <input v-model="cls.category" class="field-input" @input="emit('change')" />
        </FieldRow>
        <FieldRow label="Threshold" section="classifiers" field="threshold">
          <input type="number" v-model.number="cls.threshold" min="0" max="1" step="0.01" class="field-input" @input="emit('change')" />
        </FieldRow>
        <FieldRow label="Dynamic" section="classifiers" field="dynamic">
          <input type="checkbox" v-model="cls.dynamic" @change="emit('change')" class="w-4 h-4" />
        </FieldRow>
        <FieldRow label="Updates" section="classifiers" field="updates">
          <KeyValueList
            :model-value="cls.updates"
            variable-placeholder="variable"
            value-placeholder="set to"
            @update:model-value="cls.updates = $event; emit('change')"
          />
        </FieldRow>
        <button class="text-xs text-red-400 hover:text-red-300 self-start" @click="item.classifications.splice(ci, 1); emit('change')">Remove classification</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Classifier } from '../../stores/config'
import FieldRow from '../sections/FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'
import HypothesisField from '../widgets/HypothesisField.vue'
import KeyValueList from '../widgets/KeyValueList.vue'
import { useSettingsStore } from '../../stores/settings'

const props = defineProps<{ item: Classifier }>()
const emit = defineEmits<{ change: [] }>()
const showAdvanced = ref(useSettingsStore().defaultExpandAdvanced)

function addClassification() {
  props.item.classifications.push({ label: '', condition: '', category: '', threshold: 0.7, dynamic: false, updates: [] })
  emit('change')
}
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
