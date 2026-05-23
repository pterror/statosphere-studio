<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-black/60 z-40" />
      <DialogContent class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border border-gray-700 rounded-lg p-6 w-[480px] max-w-[90vw] shadow-xl">
        <DialogTitle class="text-gray-100 font-semibold mb-4">Share</DialogTitle>
        <div class="flex gap-2 mb-2">
          <input
            readonly
            :value="shareUrl"
            class="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 font-mono overflow-ellipsis"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <button class="btn-action" @click="copy">{{ copyLabel }}</button>
        </div>
        <p class="text-xs text-gray-500">{{ byteSize }} bytes — fits in most chat apps</p>
        <DialogClose class="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
import { buildShareUrl } from '../share/hydrate'

const open = defineModel<boolean>('open', { default: false })

const shareUrl = computed(() => buildShareUrl())
const byteSize = computed(() => new TextEncoder().encode(shareUrl.value).length)
const copyLabel = ref('Copy')

async function copy() {
  if (typeof navigator === 'undefined') return
  await navigator.clipboard.writeText(shareUrl.value)
  copyLabel.value = 'Copied!'
  setTimeout(() => { copyLabel.value = 'Copy' }, 2000)
}
</script>

<style scoped>
.btn-action {
  @apply px-3 py-1.5 rounded text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shrink-0;
}
</style>
