<template>
  <Teleport to="body">
    <Transition :name="reducedMotion ? '' : 'confirm-popover'">
      <div
        v-if="open"
        ref="popoverEl"
        class="confirm-popover"
        :class="{ 'is-danger': tone === 'danger' }"
        :style="style"
        role="dialog"
        aria-modal="true"
        @keydown.esc.stop="cancel"
        @keydown.enter.stop="confirm"
      >
        <p class="prompt">{{ prompt }}</p>
        <div class="actions">
          <button class="btn-cancel" @click="cancel">{{ cancelLabel }}</button>
          <button
            v-if="extraAction"
            class="btn-extra"
            @click="() => { extraAction!.onClick(); emit('cancel') }"
          >{{ extraAction.label }}</button>
          <button ref="confirmBtn" class="btn-confirm" :class="{ danger: tone === 'danger' }" @click="confirm">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useSettingsStore } from '../stores/settings'

const props = withDefaults(defineProps<{
  anchor: HTMLElement | null
  open: boolean
  prompt: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'normal'
  extraAction?: { label: string; onClick: () => void }
}>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'normal',
})

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const settings = useSettingsStore()
const reducedMotion = computed(() => settings.reducedMotion)

const popoverEl = ref<HTMLElement | null>(null)
const confirmBtn = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })

const POPOVER_WIDTH = 260

function reposition() {
  if (!props.anchor) return
  const rect = props.anchor.getBoundingClientRect()
  const popoverHeight = popoverEl.value?.offsetHeight ?? 100
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow >= popoverHeight + 4
    ? rect.bottom + 4
    : rect.top - popoverHeight - 4
  const left = Math.min(rect.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 8)
  pos.value = { top: Math.max(8, top), left: Math.max(8, left) }
}

const style = computed(() => ({
  position: 'fixed' as const,
  top: `${pos.value.top}px`,
  left: `${pos.value.left}px`,
  width: `${POPOVER_WIDTH}px`,
  zIndex: 9999,
}))

function onScroll() {
  if (props.open) emit('update:open', false)
}

function onResize() {
  if (props.open) reposition()
}

function onClickOutside(e: MouseEvent) {
  if (!props.open) return
  if (popoverEl.value && !popoverEl.value.contains(e.target as Node)) {
    cancel()
  }
}

watch(() => props.open, async (v) => {
  if (v) {
    await nextTick()
    reposition()
    await nextTick()
    confirmBtn.value?.focus()
  }
})

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, { capture: true, passive: true })
  document.addEventListener('mousedown', onClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll, { capture: true })
  document.removeEventListener('mousedown', onClickOutside)
})

function confirm() {
  emit('update:open', false)
  emit('confirm')
}

function cancel() {
  emit('update:open', false)
  emit('cancel')
}
</script>

<style scoped>
.confirm-popover {
  @apply rounded-lg p-3;
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-top-color: var(--glass-border-light);
  box-shadow: var(--glass-shadow);
}

.confirm-popover.is-danger {
  border-color: rgba(185, 28, 28, 0.5);
}

.prompt {
  @apply text-xs mb-3 leading-relaxed;
  color: var(--text-secondary);
}

.actions {
  @apply flex gap-2 justify-end flex-wrap;
}

.btn-cancel {
  @apply px-2.5 py-1 rounded text-xs transition-colors;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
}
.btn-cancel:hover {
  background: var(--glass-bg-hover);
}

.btn-extra {
  @apply px-2.5 py-1 rounded text-xs transition-colors;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-light);
  color: var(--text-secondary);
}
.btn-extra:hover {
  background: var(--glass-bg-hover);
}

.btn-confirm {
  @apply px-2.5 py-1 rounded text-xs transition-colors;
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  color: var(--accent);
}
.btn-confirm:hover {
  background: var(--glass-bg-hover);
}

.btn-confirm.danger {
  background: rgba(127, 29, 29, 0.5);
  border-color: rgba(185, 28, 28, 0.7);
  color: #fca5a5;
}
.btn-confirm.danger:hover {
  background: rgba(127, 29, 29, 0.7);
}

.confirm-popover-enter-active,
.confirm-popover-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.confirm-popover-enter-from,
.confirm-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
