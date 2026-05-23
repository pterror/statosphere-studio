<template>
  <header class="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
    <span class="font-semibold text-indigo-400 mr-auto">Statosphere Studio</span>
    <button class="btn-action" @click="uiStore.activeTab = 'templates'">Templates</button>
    <button class="btn-action" @click="importOpen = true">Import</button>
    <ExportMenu />
    <button class="btn-action" @click="shareOpen = true">Share</button>
    <SaveMenu />
    <ShareDialog v-model:open="shareOpen" />
    <ImportDialog v-model:open="importOpen" />
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUiStore } from '../stores/ui'
import ShareDialog from './ShareDialog.vue'
import ImportDialog from './ImportDialog.vue'
import ExportMenu from './ExportMenu.vue'
import SaveMenu from './SaveMenu.vue'

const uiStore = useUiStore()
const shareOpen = ref(false)
const importOpen = ref(false)
</script>

<style scoped>
.btn-action {
  @apply px-3 py-1 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors;
}
</style>
