<template>
  <div class="flex flex-col">
    <div
      class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded cursor-pointer"
      @click="expanded = !expanded"
    >
      <span class="text-xs text-gray-500 w-20 shrink-0">{{ typeLabel }}</span>
      <span class="text-sm text-gray-200 truncate flex-1">{{ displayName }}</span>
      <span class="text-gray-600 text-xs ml-auto">{{ expanded ? '▲' : '▼' }}</span>
    </div>
    <div v-if="expanded" class="px-3 pb-3">
      <ElementDrawer :element-type="elementType" :element="element" @change="emit('change')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ElementType } from '../recipes/types'
import ElementDrawer from './ElementDrawer.vue'

const props = defineProps<{
  elementType: ElementType
  element: any
}>()
const emit = defineEmits<{ change: [] }>()

const expanded = ref(false)

const TYPE_LABELS: Record<ElementType, string> = {
  variables: 'var',
  classifiers: 'classifier',
  generators: 'generator',
  contentRules: 'rule',
  functions: 'function',
}

const typeLabel = TYPE_LABELS[props.elementType]

const displayName = props.element?.name ?? props.element?.category ?? '(unnamed)'
</script>
