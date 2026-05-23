<template>
  <div class="flex flex-1 min-h-0">
    <ElementList
      label="Classifiers"
      :items="store.config.classifiers.map((c) => c.name)"
      :selected="selected"
      @add="add"
      @select="selected = $event"
    />
    <div class="flex-1 min-w-0 overflow-y-auto p-4" v-if="item">
      <div class="flex flex-col gap-3 max-w-2xl">
        <FieldRow label="Name" section="classifiers" field="name">
          <input v-model="item.name" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Condition" section="classifiers" field="condition">
          <ExpressionField v-model="item.condition" :rows="2" @update:model-value="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Dependencies" section="classifiers" field="dependencies">
          <input v-model="item.dependencies" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Input Template" section="classifiers" field="inputTemplate">
          <textarea v-model="item.inputTemplate" class="field-input" rows="3" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Input Hypothesis Template" section="classifiers" field="inputHypothesis">
          <HypothesisField
            v-model="item.inputHypothesis"
            :labels="item.classifications.map((c) => c.label)"
            @update:model-value="store.markDirty()"
          />
        </FieldRow>
        <FieldRow label="Response Template" section="classifiers" field="responseTemplate">
          <textarea v-model="item.responseTemplate" class="field-input" rows="3" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Response Hypothesis Template" section="classifiers" field="responseHypothesis">
          <HypothesisField
            v-model="item.responseHypothesis"
            :labels="item.classifications.map((c) => c.label)"
            @update:model-value="store.markDirty()"
          />
        </FieldRow>
        <FieldRow label="Use LLM" section="classifiers" field="useLlm">
          <input type="checkbox" v-model="item.useLlm" @change="store.markDirty()" class="w-4 h-4" />
        </FieldRow>
        <FieldRow label="Use Chat History" section="classifiers" field="useHistory">
          <input type="checkbox" v-model="item.useHistory" @change="store.markDirty()" class="w-4 h-4" />
        </FieldRow>
        <FieldRow label="History Context Size" section="classifiers" field="historyContextSize">
          <input type="number" v-model.number="item.historyContextSize" class="field-input" @input="store.markDirty()" />
        </FieldRow>

        <div class="border-t border-gray-800 pt-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Classifications</span>
            <button class="text-xs text-indigo-400 hover:text-indigo-300" @click="addClassification">+ Add</button>
          </div>
          <div v-for="(cls, ci) in item.classifications" :key="ci" class="mb-4 pl-3 border-l border-gray-700 flex flex-col gap-2">
            <FieldRow label="Label" section="classifiers" field="label">
              <input v-model="cls.label" class="field-input" @input="store.markDirty()" />
            </FieldRow>
            <FieldRow label="Condition" section="classifiers" field="labelCondition">
              <ExpressionField v-model="cls.condition" :rows="2" @update:model-value="store.markDirty()" />
            </FieldRow>
            <FieldRow label="Category" section="classifiers" field="category">
              <input v-model="cls.category" class="field-input" @input="store.markDirty()" />
            </FieldRow>
            <FieldRow label="Threshold" section="classifiers" field="threshold">
              <input type="number" v-model.number="cls.threshold" min="0" max="1" step="0.01" class="field-input" @input="store.markDirty()" />
            </FieldRow>
            <FieldRow label="Dynamic" section="classifiers" field="dynamic">
              <input type="checkbox" v-model="cls.dynamic" @change="store.markDirty()" class="w-4 h-4" />
            </FieldRow>
            <FieldRow label="Updates" section="classifiers" field="updates">
              <KeyValueList
                :model-value="cls.updates"
                variable-placeholder="variable"
                value-placeholder="set to"
                @update:model-value="cls.updates = $event; store.markDirty()"
              />
            </FieldRow>
            <button class="text-xs text-red-400 hover:text-red-300 self-start" @click="item.classifications.splice(ci, 1); store.markDirty()">Remove classification</button>
          </div>
        </div>

        <div v-if="fieldErrors.length" class="text-xs text-red-400">
          <div v-for="e in fieldErrors" :key="e">{{ e }}</div>
        </div>
        <button class="btn-danger self-start" @click="remove">Remove Classifier</button>
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center text-gray-600 text-sm" v-else>
      Select or add a classifier
    </div>
    <HelpRail />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore, type Classifier } from '../../stores/config'
import ElementList from '../ElementList.vue'
import HelpRail from '../HelpRail.vue'
import FieldRow from './FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'
import HypothesisField from '../widgets/HypothesisField.vue'
import KeyValueList from '../widgets/KeyValueList.vue'

const store = useConfigStore()
const selected = ref<number | null>(null)

const item = computed<Classifier | null>(() =>
  selected.value !== null ? store.config.classifiers[selected.value] ?? null : null
)

const fieldErrors = computed(() =>
  store.errors.classifiers.filter((e) =>
    selected.value !== null && e.startsWith(`/${selected.value}`)
  )
)

function add() {
  store.config.classifiers.push({
    name: '',
    condition: '',
    dependencies: '',
    inputTemplate: '',
    inputHypothesis: '',
    responseTemplate: '',
    responseHypothesis: '',
    useLlm: false,
    useHistory: false,
    historyContextSize: 0,
    classifications: [],
  })
  selected.value = store.config.classifiers.length - 1
  store.markDirty()
}

function remove() {
  if (selected.value === null) return
  store.config.classifiers.splice(selected.value, 1)
  selected.value = store.config.classifiers.length === 0 ? null : Math.min(selected.value, store.config.classifiers.length - 1)
  store.markDirty()
}

function addClassification() {
  if (!item.value) return
  item.value.classifications.push({ label: '', condition: '', category: '', threshold: 0.7, dynamic: false, updates: [] })
  store.markDirty()
}
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
.btn-danger {
  @apply px-3 py-1 text-sm rounded bg-red-900 text-red-200 hover:bg-red-800;
}
</style>
