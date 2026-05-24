<template>
  <div class="relative">
    <button
      ref="triggerRef"
      class="btn-action"
      @click.stop="toggle"
    >{{ label }}</button>
    <Popover v-model:open="open" :anchor="triggerRef" placement="below-left" :roving="true">
      <div class="glass-panel py-1 min-w-[170px]" style="border-radius: 10px">
        <button
          v-for="item in ITEMS"
          :key="item.kind"
          role="menuitem"
          class="glass-row flex items-center justify-between w-full text-left px-4 py-2 text-sm transition-colors"
          style="color: var(--text-secondary)"
          @click="select(item.kind)"
        >
          <span>{{ item.label }}</span>
          <kbd class="text-xs text-gray-600 font-mono">{{ item.key }}</kbd>
        </button>
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ElementType } from '../recipes/types'
import Popover from './Popover.vue'

const ITEMS: { kind: ElementType; label: string; key: string }[] = [
  { kind: 'variables', label: 'Variable', key: 'V' },
  { kind: 'classifiers', label: 'Classifier', key: 'C' },
  { kind: 'generators', label: 'Generator', key: 'G' },
  { kind: 'contentRules', label: 'Content Rule', key: 'R' },
  { kind: 'functions', label: 'Function', key: 'F' },
]

defineProps<{ label: string }>()
const emit = defineEmits<{ select: [kind: ElementType] }>()

const open = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)

function toggle() {
  open.value = !open.value
}

function select(kind: ElementType) {
  open.value = false
  emit('select', kind)
}
</script>

<style scoped>
.btn-action {
  @apply px-3 py-1 rounded text-sm transition-colors;

  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
}

.btn-action:hover {
  background: var(--glass-bg-hover);
  color: var(--text-primary);
}
</style>
