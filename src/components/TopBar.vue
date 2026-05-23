<template>
  <header class="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
    <span class="font-semibold text-indigo-400 mr-auto">Statosphere Studio</span>
    <button class="btn-action" @click="uiStore.activeTab = 'templates'">Templates</button>
    <button disabled class="btn-stub">Import</button>
    <button disabled class="btn-stub">Export</button>
    <button disabled class="btn-stub">Share</button>
    <button disabled class="btn-stub">Save</button>
  </header>
</template>

<script setup lang="ts">
import { useUiStore } from '../stores/ui'
const uiStore = useUiStore()
</script>

<style scoped>
.btn-stub {
  @apply px-3 py-1 rounded text-sm bg-gray-800 text-gray-400 cursor-not-allowed opacity-60;
}
.btn-action {
  @apply px-3 py-1 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors;
}
</style>
