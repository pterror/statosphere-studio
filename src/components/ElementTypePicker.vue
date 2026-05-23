<template>
  <div class="relative">
    <button
      ref="triggerRef"
      class="btn-action"
      @click.stop="toggle"
    >{{ label }}</button>
    <Teleport to="body">
      <div
        v-if="open"
        ref="popoverRef"
        :style="popoverStyle"
        class="fixed z-50 glass-panel py-1 min-w-[170px]" style="border-radius: 10px"
        @keydown="onKeydown"
      >
        <button
          v-for="item in ITEMS"
          :key="item.kind"
          class="flex items-center justify-between w-full text-left px-4 py-2 text-sm transition-colors"
          style="color: var(--text-secondary)"
          @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--glass-bg-hover)'"
          @mouseleave="($event.currentTarget as HTMLElement).style.background = ''"
          @click="select(item.kind)"
        >
          <span>{{ item.label }}</span>
          <kbd class="text-xs text-gray-600 font-mono">{{ item.key }}</kbd>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import type { ElementType } from '../recipes/types'

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
const popoverRef = ref<HTMLElement | null>(null)
const popoverStyle = ref<Record<string, string>>({})

function toggle(e: MouseEvent) {
  if (open.value) {
    close()
    return
  }
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  popoverStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
  open.value = true
  nextTick(() => {
    addGlobalListeners()
    ;(popoverRef.value?.querySelector('button') as HTMLElement | null)?.focus()
  })
}

function close() {
  open.value = false
  removeGlobalListeners()
}

function select(kind: ElementType) {
  close()
  emit('select', kind)
}

function onKeydown(e: KeyboardEvent) {
  const items = Array.from(popoverRef.value?.querySelectorAll('button') ?? []) as HTMLElement[]
  const idx = items.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus() }
  else if (e.key === 'Escape') { close(); triggerRef.value?.focus() }
  else {
    const match = ITEMS.find(i => i.key === e.key.toUpperCase())
    if (match) { e.preventDefault(); select(match.kind) }
  }
}

function onGlobalMousedown(e: MouseEvent) {
  const target = e.target as Node
  if (!popoverRef.value?.contains(target) && !triggerRef.value?.contains(target)) close()
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (!open.value) return
  const match = ITEMS.find(i => i.key === e.key.toUpperCase())
  if (match && document.activeElement === document.body) { e.preventDefault(); select(match.kind) }
  if (e.key === 'Escape') close()
}

function addGlobalListeners() {
  document.addEventListener('mousedown', onGlobalMousedown, true)
  document.addEventListener('keydown', onGlobalKeydown, true)
}

function removeGlobalListeners() {
  document.removeEventListener('mousedown', onGlobalMousedown, true)
  document.removeEventListener('keydown', onGlobalKeydown, true)
}

onUnmounted(removeGlobalListeners)
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
