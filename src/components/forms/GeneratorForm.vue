<template>
  <div class="flex flex-col gap-3">
    <FieldRow label="Name" section="generators" field="name">
      <input v-model="item.name" class="field-input" @input="emit('change')" />
    </FieldRow>
    <FieldRow label="Type" section="generators" field="type">
      <EnumChoice v-model="item.type" :options="typeOptions" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Phase" section="generators" field="phase">
      <EnumChoice v-model="item.phase" :options="phaseOptions" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Lazy" section="generators" field="lazy">
      <input type="checkbox" v-model="item.lazy" @change="emit('change')" class="w-4 h-4" />
    </FieldRow>
    <FieldRow label="Condition" section="generators" field="condition">
      <ExpressionField v-model="item.condition" :rows="2" @update:model-value="emit('change')" />
    </FieldRow>
    <FieldRow label="Dependencies" section="generators" field="dependencies">
      <input v-model="item.dependencies" class="field-input" @input="emit('change')" />
    </FieldRow>
    <FieldRow label="Prompt" section="generators" field="prompt">
      <ExpressionField v-model="item.prompt" :rows="5" @update:model-value="emit('change')" />
    </FieldRow>

    <template v-if="item.type === 'Text'">
      <FieldRow label="Include History" section="generators" field="includeHistory">
        <input type="checkbox" v-model="item.includeHistory" @change="emit('change')" class="w-4 h-4" />
      </FieldRow>
      <FieldRow label="History Context Size" section="generators" field="historyContextSize">
        <input type="number" v-model.number="item.historyContextSize" class="field-input" @input="emit('change')" />
      </FieldRow>
      <FieldRow label="Minimum Response Tokens" section="generators" field="minTokens">
        <input v-model="item.minTokens" class="field-input" @input="emit('change')" />
      </FieldRow>
      <FieldRow label="Maximum Response Tokens" section="generators" field="maxTokens">
        <input v-model="item.maxTokens" class="field-input" @input="emit('change')" />
      </FieldRow>
      <FieldRow label="Retry Condition" section="generators" field="retryCondition">
        <ExpressionField :model-value="item.retryCondition ?? ''" :rows="2" @update:model-value="item.retryCondition = $event; emit('change')" />
      </FieldRow>
      <FieldRow label="Stopping Strings" section="generators" field="stoppingStrings">
        <input v-model="item.stoppingStrings" class="field-input" @input="emit('change')" />
      </FieldRow>
    </template>

    <template v-if="item.type === 'Image'">
      <FieldRow label="Negative Prompt" section="generators" field="negativePrompt">
        <input v-model="item.negativePrompt" class="field-input" @input="emit('change')" />
      </FieldRow>
      <FieldRow label="Remove Background" section="generators" field="removeBackground">
        <input type="checkbox" v-model="item.removeBackground" @change="emit('change')" class="w-4 h-4" />
      </FieldRow>
      <FieldRow label="Aspect Ratio" section="generators" field="aspectRatio">
        <EnumChoice
          :model-value="item.aspectRatio ?? ''"
          :options="aspectRatioOptions"
          @update:model-value="item.aspectRatio = $event || undefined; emit('change')"
        />
      </FieldRow>
    </template>

    <template v-if="item.type === 'Image-to-Image'">
      <FieldRow label="Remove Background" section="generators" field="removeBackground">
        <input type="checkbox" v-model="item.removeBackground" @change="emit('change')" class="w-4 h-4" />
      </FieldRow>
      <FieldRow label="Source Image URL" section="generators" field="sourceImageUrl">
        <ExpressionField :model-value="item.sourceImageUrl ?? ''" :rows="2" @update:model-value="item.sourceImageUrl = $event; emit('change')" />
      </FieldRow>
      <FieldRow label="Image-to-Image Type" section="generators" field="imageToImageType">
        <EnumChoice
          :model-value="item.imageToImageType ?? 'edit'"
          :options="imageToImageTypeOptions"
          @update:model-value="item.imageToImageType = $event; emit('change')"
        />
      </FieldRow>
    </template>

    <div class="border-t border-gray-800 pt-3">
      <FieldRow label="Updates" section="generators" field="updates">
        <KeyValueList
          :model-value="item.updates"
          variable-placeholder="variable"
          value-placeholder="set to"
          @update:model-value="item.updates = $event; emit('change')"
        />
      </FieldRow>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Generator } from '../../stores/config'
import FieldRow from '../sections/FieldRow.vue'
import ExpressionField from '../widgets/ExpressionField.vue'
import EnumChoice from '../widgets/EnumChoice.vue'
import KeyValueList from '../widgets/KeyValueList.vue'

defineProps<{ item: Generator }>()
const emit = defineEmits<{ change: [] }>()

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
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
</style>
