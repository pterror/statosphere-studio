<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="popoverEl"
      :style="computedStyle"
      class="fixed z-50"
      @keydown="onKeydown"
    >
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  anchor: HTMLElement | null
  placement?: 'below-right' | 'below-left' | 'above-right' | 'above-left'
  roving?: boolean
}>(), {
  placement: 'below-right',
  roving: false,
})

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
}>()

const popoverEl = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })

const PADDING = 8

function reposition() {
  if (!props.anchor || !popoverEl.value) return
  const rect = props.anchor.getBoundingClientRect()
  const popW = popoverEl.value.offsetWidth || 0
  const popH = popoverEl.value.offsetHeight || 0
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Determine vertical: prefer placement, flip if needed
  let top: number
  const wantAbove = props.placement?.startsWith('above')
  const spaceBelow = vh - rect.bottom
  const spaceAbove = rect.top
  const useAbove = wantAbove ? (spaceAbove >= popH + 4 || spaceAbove > spaceBelow) : spaceBelow < popH + 4
  top = useAbove ? rect.top - popH - 4 : rect.bottom + 4

  // Determine horizontal: prefer placement, flip if needed
  let left: number
  const wantLeft = props.placement?.endsWith('left')
  if (wantLeft) {
    left = rect.right - popW
  } else {
    left = rect.left
  }
  // Clamp to viewport
  left = Math.max(PADDING, Math.min(left, vw - popW - PADDING))
  top = Math.max(PADDING, Math.min(top, vh - popH - PADDING))

  pos.value = { top, left }
}

const computedStyle = computed(() => ({
  top: `${pos.value.top}px`,
  left: `${pos.value.left}px`,
}))

watch(() => props.open, async (v) => {
  if (v) {
    await nextTick()
    reposition()
    await nextTick()
    // Focus first focusable descendant
    const focusable = popoverEl.value?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()
    addGlobalListeners()
  } else {
    removeGlobalListeners()
  }
})

function close() {
  emit('update:open', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (props.roving && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault()
    const items = Array.from(
      popoverEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"], button') ?? []
    )
    const idx = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') items[(idx + 1) % items.length]?.focus()
    else items[(idx - 1 + items.length) % items.length]?.focus()
  }
}

function onGlobalMousedown(e: MouseEvent) {
  const target = e.target as Node
  if (popoverEl.value && !popoverEl.value.contains(target) && !props.anchor?.contains(target)) {
    close()
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function onScroll() {
  if (props.open) close()
}

function onResize() {
  if (props.open) reposition()
}

function addGlobalListeners() {
  document.addEventListener('mousedown', onGlobalMousedown, true)
  document.addEventListener('keydown', onGlobalKeydown, true)
  window.addEventListener('scroll', onScroll, { capture: true, passive: true })
  window.addEventListener('resize', onResize)
}

function removeGlobalListeners() {
  document.removeEventListener('mousedown', onGlobalMousedown, true)
  document.removeEventListener('keydown', onGlobalKeydown, true)
  window.removeEventListener('scroll', onScroll, { capture: true })
  window.removeEventListener('resize', onResize)
}

onUnmounted(removeGlobalListeners)
</script>
