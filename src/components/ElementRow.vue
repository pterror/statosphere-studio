<template>
  <div class="flex flex-col element-row-wrap" :data-element-section="elementType" :data-element-name="displayName">
    <div
      class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded cursor-pointer element-row"
      @click="toggleExpanded"
    >
      <span
        v-if="dragSource"
        class="drag-handle cursor-grab active:cursor-grabbing shrink-0 select-none text-xs outline-none"
        title="Drag to move to another block"
        role="button"
        tabindex="0"
        aria-label="Move element to another block"
        v-bind="dragSource"
        @click.stop
        @keydown="onDragHandleKeydown"
      >⠿</span>
      <span v-else class="w-3 shrink-0"></span>
      <span class="text-xs text-gray-500 w-20 shrink-0">{{ typeLabel }}</span>
      <span class="text-sm text-gray-200 truncate flex-1">{{ displayName }}</span>
      <!-- Pin affordance: shown for recipe-derived rows (has instanceId but may not yet be pinned) -->
      <button
        v-if="instanceId"
        class="pin-btn shrink-0 outline-none"
        :class="isPinned ? 'pin-btn--active' : 'pin-btn--idle'"
        :title="isPinned ? 'Pinned — click to revert to recipe' : 'Pin to customize independently from recipe'"
        :aria-label="isPinned ? 'Unpin element' : 'Pin element'"
        tabindex="0"
        @click.stop="togglePin"
        @keydown.enter.stop="togglePin"
        @keydown.space.prevent.stop="togglePin"
      >📌</button>
      <span v-if="isPinned" class="text-xs text-amber-400 shrink-0 pin-label" title="Edited manually — survives recipe param changes">pinned ●</span>
      <span class="text-gray-600 text-xs ml-auto">{{ expanded ? '▲' : '▼' }}</span>
    </div>
    <div v-if="expanded" class="px-3 pb-3">
      <div class="border border-gray-700 rounded bg-gray-900 p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between text-xs text-gray-500 -mt-1 mb-1">
          <span v-if="isPinned" class="text-amber-400">pinned override</span>
          <span v-else class="text-gray-600">from recipe</span>
          <button
            v-if="isPinned && instanceId"
            class="text-gray-500 hover:text-red-400 transition-colors"
            title="Unpin (revert to recipe)"
            @click.stop="unpin"
          >⋯ Unpin</button>
        </div>
        <VariableForm v-if="elementType === 'variables'" :item="element" @change="onEdit" />
        <ClassifierForm v-else-if="elementType === 'classifiers'" :item="element" @change="onEdit" />
        <GeneratorForm v-else-if="elementType === 'generators'" :item="element" @change="onEdit" />
        <ContentRuleForm v-else-if="elementType === 'contentRules'" :item="element" @change="onEdit" />
        <FunctionDefForm v-else-if="elementType === 'functions'" :item="element" @change="onEdit" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ElementType } from '../recipes/types'
import { useRecipesStore } from '../stores/recipes'
import VariableForm from './forms/VariableForm.vue'
import ClassifierForm from './forms/ClassifierForm.vue'
import GeneratorForm from './forms/GeneratorForm.vue'
import ContentRuleForm from './forms/ContentRuleForm.vue'
import FunctionDefForm from './forms/FunctionDefForm.vue'
import { makeDragSource } from '../composables/use-dnd'

const props = defineProps<{
  elementType: ElementType
  element: any
  instanceId?: string
  initialExpanded?: boolean
  extrasIndex?: number
  extrasPath?: string
}>()
const emit = defineEmits<{ change: [] }>()

const recipesStore = useRecipesStore()
const expanded = ref(props.initialExpanded ?? false)

const elementName = computed(() => props.element?.name ?? props.element?.category ?? '')

const dragSource = computed(() => {
  if (!props.instanceId || !elementName.value) return null
  return makeDragSource({
    kind: 'element',
    instanceId: props.instanceId,
    elementType: props.elementType,
    elementName: elementName.value,
  })
})

const TYPE_LABELS: Record<ElementType, string> = {
  variables: 'var',
  classifiers: 'classifier',
  generators: 'generator',
  contentRules: 'rule',
  functions: 'function',
}

const typeLabel = TYPE_LABELS[props.elementType]
const displayName = computed(() => props.element?.name ?? props.element?.category ?? '(unnamed)')


const isPinned = computed(() => {
  if (!props.instanceId) return false
  const inst = recipesStore.instances.find(i => i.id === props.instanceId)
  return inst?.pinned.some(p => p.elementType === props.elementType && p.elementName === elementName.value) ?? false
})

function toggleExpanded() {
  expanded.value = !expanded.value
}

function onEdit() {
  if (props.instanceId && !isPinned.value && elementName.value) {
    recipesStore.pinElement(props.instanceId, props.elementType, elementName.value)
  } else if (props.instanceId && isPinned.value && elementName.value) {
    recipesStore.updatePinnedElement(props.instanceId, props.elementType, elementName.value, structuredClone(props.element))
  }
  emit('change')
}

function unpin() {
  if (props.instanceId && elementName.value) {
    recipesStore.unpinElement(props.instanceId, props.elementType, elementName.value)
    emit('change')
  }
}

function togglePin() {
  if (!props.instanceId || !elementName.value) return
  if (isPinned.value) {
    recipesStore.unpinElement(props.instanceId, props.elementType, elementName.value)
  } else {
    recipesStore.pinElement(props.instanceId, props.elementType, elementName.value)
  }
  emit('change')
}

function onDragHandleKeydown(e: KeyboardEvent) {
  if (!(e.metaKey || e.ctrlKey)) return
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  if (!props.instanceId || props.extrasIndex === undefined) return
  e.preventDefault()
  e.stopPropagation()
  const delta = e.key === 'ArrowUp' ? -1 : 1
  recipesStore.reorderElement(props.instanceId, props.extrasPath ?? '', props.elementType, props.extrasIndex, props.extrasIndex + delta)
}

defineExpose({ expand: () => { expanded.value = true } })
</script>

<style scoped>
/* Drag handle: visible at rest in muted color, brightens on row hover + focus */
.drag-handle {
  color: rgba(156, 163, 175, 0.35); /* muted gray at rest */
  transition: color 120ms ease;
}
.element-row:hover .drag-handle,
.drag-handle:focus {
  color: rgba(209, 213, 219, 0.85);
}
.drag-handle:focus-visible {
  box-shadow: 0 0 0 2px var(--accent-soft);
  border-radius: 2px;
}

/* Pin button */
.pin-btn {
  font-size: 0.7rem;
  line-height: 1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  border-radius: 3px;
  transition: opacity 120ms ease, filter 120ms ease;
}
.pin-btn--idle {
  opacity: 0;
  filter: grayscale(1);
}
.element-row:hover .pin-btn--idle,
.pin-btn--idle:focus {
  opacity: 0.5;
}
.pin-btn--idle:hover {
  opacity: 0.85 !important;
  filter: none;
}
.pin-btn--active {
  opacity: 1;
  filter: none;
}
.pin-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--accent-soft);
}

/* Hide redundant "pinned ●" label when pin icon is visible */
.pin-btn--active + .pin-label {
  display: none;
}
</style>
