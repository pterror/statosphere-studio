<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button class="btn-action">Export</button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="bg-gray-900 border border-gray-700 rounded shadow-xl z-50 py-1 min-w-[180px]" :side-offset="4">
        <DropdownMenuItem class="menu-item" @click="copyJson">Copy JSON to clipboard</DropdownMenuItem>
        <DropdownMenuItem class="menu-item" @click="downloadJson">Download .json</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup lang="ts">
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import { useConfigStore } from '../stores/config'

const configStore = useConfigStore()

async function copyJson() {
  if (typeof navigator === 'undefined') return
  await navigator.clipboard.writeText(configStore.json)
}

function downloadJson() {
  if (typeof document === 'undefined') return
  const blob = new Blob([configStore.json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'statosphere-config.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.btn-action {
  @apply px-3 py-1 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors;
}

.menu-item {
  @apply px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 cursor-pointer outline-none;
}
</style>
