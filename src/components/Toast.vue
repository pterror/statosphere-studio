<template>
  <Teleport to="body">
    <div
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
      aria-live="polite"
    >
      <TransitionGroup
        :name="settingsStore.reducedMotion ? '' : 'toast'"
        tag="div"
        class="flex flex-col items-center gap-2"
      >
        <div
          v-for="item in toastStore.items"
          :key="item.id"
          class="toast-item glass-panel flex items-center gap-3 text-sm px-4 py-2 pointer-events-auto min-w-[220px]"
          style="color: var(--text-primary)"
        >
          <span>{{ item.message }}</span>
          <button
            v-if="item.action"
            class="text-indigo-400 hover:text-indigo-300 font-medium shrink-0"
            @click="onAction(item)"
          >{{ item.action.label }}</button>
          <button
            class="text-gray-500 hover:text-gray-200 shrink-0 ml-1"
            aria-label="Dismiss"
            @click="toastStore.dismiss(item.id)"
          >×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast'
import { useSettingsStore } from '../stores/settings'
import type { ToastItem } from '../stores/toast'

const toastStore = useToastStore()
const settingsStore = useSettingsStore()

function onAction(item: ToastItem) {
  item.action?.onClick()
  toastStore.dismiss(item.id)
}
</script>

<style scoped>
.toast-item {
  max-width: min(480px, calc(100vw - 32px));
  overflow-wrap: break-word;
  word-break: break-word;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
