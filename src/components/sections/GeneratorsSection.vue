<template>
  <div class="flex flex-1 min-h-0">
    <ElementList
      label="Generators"
      :items="store.config.generators.map((g) => g.name)"
      :selected="selected"
      @add="add"
      @select="selected = $event"
    />
    <div class="flex-1 min-w-0 overflow-y-auto p-4" v-if="item">
      <div class="flex flex-col gap-3 max-w-2xl">
        <FieldRow label="Name" desc="A name for this generator. Used for internal reference and must be unique.">
          <input v-model="item.name" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Type" desc="The type of content this generator creates: text or images.">
          <select v-model="item.type" class="field-input" @change="store.markDirty()">
            <option>Text</option>
            <option>Image</option>
            <option>Image-to-Image</option>
          </select>
        </FieldRow>
        <FieldRow label="Phase" desc="The phase when this generator runs.">
          <select v-model="item.phase" class="field-input" @change="store.markDirty()">
            <option>On Input</option>
            <option>On Response</option>
          </select>
        </FieldRow>
        <FieldRow label="Lazy" desc="Lazy generators fire during their phase but don't hold up the chat.">
          <input type="checkbox" v-model="item.lazy" @change="store.markDirty()" class="w-4 h-4" />
        </FieldRow>
        <FieldRow label="Condition" desc="This generator only runs if this condition is met.">
          <input v-model="item.condition" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Dependencies" desc="A comma-delimited list of classifier or generator names that must run first.">
          <input v-model="item.dependencies" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Prompt" desc="The prompt to send to the LLM.">
          <textarea v-model="item.prompt" class="field-input" rows="5" @input="store.markDirty()" />
        </FieldRow>

        <template v-if="item.type === 'Text'">
          <FieldRow label="Include History" desc="When true, chat history will be included with the prompt.">
            <input type="checkbox" v-model="item.includeHistory" @change="store.markDirty()" class="w-4 h-4" />
          </FieldRow>
          <FieldRow label="History Context Size" desc="The context limit for this request (0 defers to preset size).">
            <input type="number" v-model.number="item.historyContextSize" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Minimum Response Tokens" desc="Minimum token size requested for this response.">
            <input v-model="item.minTokens" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Maximum Response Tokens" desc="Maximum token size requested for this response.">
            <input v-model="item.maxTokens" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Retry Condition" desc="If this resolves to true after the generator runs, the generator will be retried.">
            <input v-model="item.retryCondition" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Stopping Strings" desc="Comma-delimited stopping strings for the request.">
            <input v-model="item.stoppingStrings" class="field-input" @input="store.markDirty()" />
          </FieldRow>
        </template>

        <template v-if="item.type === 'Image'">
          <FieldRow label="Negative Prompt" desc="Content that is undesired in the final image.">
            <input v-model="item.negativePrompt" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Remove Background" desc="When true, an attempt will be made to remove the background from the generated image.">
            <input type="checkbox" v-model="item.removeBackground" @change="store.markDirty()" class="w-4 h-4" />
          </FieldRow>
          <FieldRow label="Aspect Ratio" desc="The desired aspect ratio for the generated image.">
            <select v-model="item.aspectRatio" class="field-input" @change="store.markDirty()">
              <option value="">— none —</option>
              <option value="21:9">Cinematic Horizontal (21:9)</option>
              <option value="16:9">Widescreen Horizontal (16:9)</option>
              <option value="3:2">Photo Horizontal (3:2)</option>
              <option value="5:4">Post Horizontal (5:4)</option>
              <option value="1:1">Square (1:1)</option>
              <option value="4:5">Post Vertical (4:5)</option>
              <option value="2:3">Photo Vertical (2:3)</option>
              <option value="9:16">Widescreen Vertical (9:16)</option>
              <option value="9:21">Cinematic Vertical (9:21)</option>
            </select>
          </FieldRow>
        </template>

        <template v-if="item.type === 'Image-to-Image'">
          <FieldRow label="Remove Background" desc="When true, an attempt will be made to remove the background from the generated image.">
            <input type="checkbox" v-model="item.removeBackground" @change="store.markDirty()" class="w-4 h-4" />
          </FieldRow>
          <FieldRow label="Source Image URL" desc="For image-to-image, this field should resolve to an image URL.">
            <input v-model="item.sourceImageUrl" class="field-input" @input="store.markDirty()" />
          </FieldRow>
          <FieldRow label="Image-to-Image Transfer Type" desc="The type of image-to-image transfer to perform.">
            <select v-model="item.imageToImageType" class="field-input" @change="store.markDirty()">
              <option value="edit">Edit (Qwen)</option>
              <option value="canny">Canny (Flux)</option>
              <option value="face">Face (Flux)</option>
            </select>
          </FieldRow>
        </template>

        <div class="border-t border-gray-800 pt-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Updates</span>
            <button class="text-xs text-indigo-400 hover:text-indigo-300" @click="addUpdate">+ Add</button>
          </div>
          <div v-for="(upd, ui) in item.updates" :key="ui" class="flex gap-2 items-center mb-1">
            <input v-model="upd.variable" class="field-input" placeholder="variable" @input="store.markDirty()" />
            <span class="text-gray-600 text-xs">=</span>
            <input v-model="upd.setTo" class="field-input" placeholder="set to" @input="store.markDirty()" />
            <button class="text-xs text-red-400 hover:text-red-300" @click="item.updates.splice(ui, 1); store.markDirty()">x</button>
          </div>
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
import ElementList from '../ElementList.vue'
import HelpRail from '../HelpRail.vue'
import FieldRow from './FieldRow.vue'

const store = useConfigStore()
const selected = ref<number | null>(null)

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

function addUpdate() {
  if (!item.value) return
  item.value.updates.push({ variable: '', setTo: '' })
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
