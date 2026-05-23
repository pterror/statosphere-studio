<template>
  <div class="flex flex-1 min-h-0">
    <ElementList
      label="Generators"
      :items="store.config.generators.map((g) => g.name)"
      :selected="selected"
      :lint-counts="lintCounts"
      @add="add"
      @select="selected = $event"
    />
    <div class="flex-1 min-w-0 overflow-y-auto p-4" v-if="item">
      <div class="flex flex-col gap-3 max-w-2xl">
        <LintWarnings :lints="selectedLints" @apply-fix="store.replace($event)" />
        <FieldRow label="Name" section="generators" field="name">
          <input v-model="item.name" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Type" section="generators" field="type">
          <EnumChoice
            v-model="item.type"
            :options="typeOptions"
            @update:model-value="store.markDirty()"
          />
        </FieldRow>
        <FieldRow label="Phase" section="generators" field="phase">
          <EnumChoice
            v-model="item.phase"
            :options="phaseOptions"
            @update:model-value="store.markDirty()"
          />
        </FieldRow>
        <FieldRow label="Lazy" section="generators" field="lazy">
          <input type="checkbox" v-model="item.lazy" @change="store.markDirty()" class="w-4 h-4" />
        </FieldRow>
        <FieldRow label="Condition" section="generators" field="condition">
          <ExpressionField v-model="item.condition" :rows="2" @update:model-value="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Dependencies" section="generators" field="dependencies">
          <input v-model="item.dependencies" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Prompt" section="generators" field="prompt">
          <ExpressionField v-model="item.prompt" :rows="5" @update:model-value="store.markDirty()" />
        </FieldRow>

        <template v-if="item.type === 'Text'">
          <FieldRow label="Include History" section="generators" field="includeHistory">
            <input type="checkbox" v-model="item.includeHistory" @change="store.markDirty()" class="w-4 h-4" />
          </FieldRow>
          <FieldRow label="History Context Size" section="generators" field="historyContextSize">
            <input type="number" v-model.number="item.historyContextSize" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Minimum Response Tokens" section="generators" field="minTokens">
            <input v-model="item.minTokens" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Maximum Response Tokens" section="generators" field="maxTokens">
            <input v-model="item.maxTokens" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Retry Condition" section="generators" field="retryCondition">
            <ExpressionField :model-value="item.retryCondition ?? ''" :rows="2" @update:model-value="item.retryCondition = $event; store.markDirty()" />
          </FieldRow>
          <FieldRow label="Stopping Strings" section="generators" field="stoppingStrings">
            <input v-model="item.stoppingStrings" class="field-input" @input="store.markDirty()" />
          </FieldRow>
        </template>

        <template v-if="item.type === 'Image'">
          <FieldRow label="Negative Prompt" section="generators" field="negativePrompt">
            <input v-model="item.negativePrompt" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Remove Background" section="generators" field="removeBackground">
            <input type="checkbox" v-model="item.removeBackground" @change="store.markDirty()" class="w-4 h-4" />
          </FieldRow>
          <FieldRow label="Aspect Ratio" section="generators" field="aspectRatio">
            <EnumChoice
              :model-value="item.aspectRatio ?? ''"
              :options="aspectRatioOptions"
              @update:model-value="item.aspectRatio = $event || undefined; store.markDirty()"
            />
          </FieldRow>
        </template>

        <template v-if="item.type === 'Image-to-Image'">
          <FieldRow label="Remove Background" section="generators" field="removeBackground">
            <input type="checkbox" v-model="item.removeBackground" @change="store.markDirty()" class="w-4 h-4" />
          </FieldRow>
          <FieldRow label="Source Image URL" section="generators" field="sourceImageUrl">
            <ExpressionField :model-value="item.sourceImageUrl ?? ''" :rows="2" @update:model-value="item.sourceImageUrl = $event; store.markDirty()" />
          </FieldRow>
          <FieldRow label="Image-to-Image Type" section="generators" field="imageToImageType">
            <EnumChoice
              :model-value="item.imageToImageType ?? 'edit'"
              :options="imageToImageTypeOptions"
              @update:model-value="item.imageToImageType = $event; store.markDirty()"
            />
          </FieldRow>
        </template>

        <div class="border-t border-gray-800 pt-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Updates</span>
          </div>
          <FieldRow label="Updates" section="generators" field="updates">
            <KeyValueList
              :model-value="item.updates"
              variable-placeholder="variable"
              value-placeholder="set to"
              @update:model-value="item.updates = $event; store.markDirty()"
            />
          </FieldRow>
        </div>

        <div v-if="fieldErrors.length" class="text-xs text-red-400">
          <div v-for="e in fieldErrors" :key="e">{{ e }}</div>
        </div>
        <button class="btn-danger self-start" @click="remove">Remove Generator</button>
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center text-gray-600 text-sm" v-else>
      Select or add a generator
    </div>
    <HelpRail />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore, type Generator } from '../../stores/config'
import { useLintsStore } from '../../stores/lints'
import ElementList from '../ElementList.vue'
import HelpRail from '../HelpRail.vue'
import LintWarnings from '../LintWarnings.vue'
import FieldRow from './FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'
import EnumChoice from '../widgets/EnumChoice.vue'
import KeyValueList from '../widgets/KeyValueList.vue'

const store = useConfigStore()
const lintsStore = useLintsStore()
const selected = ref<number | null>(null)

const lintCounts = computed(() => {
  const counts: Record<number, number> = {}
  for (const r of lintsStore.results) {
    if (r.section === 'generators') {
      counts[r.elementIndex] = (counts[r.elementIndex] ?? 0) + 1
    }
  }
  return counts
})

const selectedLints = computed(() =>
  selected.value !== null
    ? lintsStore.results.filter((r) => r.section === 'generators' && r.elementIndex === selected.value)
    : []
)

const typeOptions = [
  { value: 'Text', label: 'Text', description: 'Sends a prompt to the LLM and stores the reply.' },
  { value: 'Image', label: 'Image', description: 'Generates an image from a text prompt.' },
  { value: 'Image-to-Image', label: 'Image-to-Image', description: 'Transforms an existing image using a source URL.' },
]

const phaseOptions = [
  { value: 'On Input', label: 'On Input', description: 'Fires after the user sends a message, before the bot replies.' },
  { value: 'On Response', label: 'On Response', description: 'Fires after the bot replies.' },
]

const aspectRatioOptions = [
  { value: '', label: '— none —' },
  { value: '21:9', label: 'Cinematic Horizontal (21:9)' },
  { value: '16:9', label: 'Widescreen Horizontal (16:9)' },
  { value: '3:2', label: 'Photo Horizontal (3:2)' },
  { value: '5:4', label: 'Post Horizontal (5:4)' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:5', label: 'Post Vertical (4:5)' },
  { value: '2:3', label: 'Photo Vertical (2:3)' },
  { value: '9:16', label: 'Widescreen Vertical (9:16)' },
  { value: '9:21', label: 'Cinematic Vertical (9:21)' },
]

const imageToImageTypeOptions = [
  { value: 'edit', label: 'Edit (Qwen)', description: 'General-purpose image editing from a text prompt.' },
  { value: 'canny', label: 'Canny (Flux)', description: 'Edge-guided generation following the source image structure.' },
  { value: 'face', label: 'Face (Flux)', description: 'Face-swap style transfer.' },
]

const item = computed<Generator | null>(() =>
  selected.value !== null ? store.config.generators[selected.value] ?? null : null
)

const fieldErrors = computed(() =>
  store.errors.generators.filter((e) =>
    selected.value !== null && e.startsWith(`/${selected.value}`)
  )
)

function add() {
  store.config.generators.push({
    name: '',
    type: 'Text',
    phase: 'On Input',
    lazy: false,
    condition: '',
    dependencies: '',
    prompt: '',
    updates: [],
    includeHistory: false,
    historyContextSize: 0,
    minTokens: '50',
    maxTokens: '250',
    retryCondition: '',
    stoppingStrings: '',
  })
  selected.value = store.config.generators.length - 1
  store.markDirty()
}

function remove() {
  if (selected.value === null) return
  store.config.generators.splice(selected.value, 1)
  selected.value = store.config.generators.length === 0 ? null : Math.min(selected.value, store.config.generators.length - 1)
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
