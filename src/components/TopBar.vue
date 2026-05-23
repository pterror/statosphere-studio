<template>
  <header class="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
    <span class="font-semibold text-indigo-400 mr-auto">Statosphere Studio</span>
    <button class="btn-action" @click="addRecipeOpen = true">+ Recipe</button>
    <button class="btn-action" @click="addElement">+ Element</button>
    <span
      :title="validityTitle"
      class="w-2 h-2 rounded-full shrink-0"
      :class="hasErrors ? 'bg-red-500' : 'bg-green-500'"
    />
    <DropdownMenuRoot>
      <DropdownMenuTrigger as-child>
        <button class="btn-action">⋯</button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent class="bg-gray-900 border border-gray-700 rounded shadow-xl z-50 py-1 min-w-[180px]" :side-offset="4">
          <DropdownMenuItem class="menu-item" @click="importOpen = true">Import</DropdownMenuItem>
          <DropdownMenuItem class="menu-item" @click="copyJson">Copy JSON</DropdownMenuItem>
          <DropdownMenuItem class="menu-item" @click="downloadJson">Download .json</DropdownMenuItem>
          <DropdownMenuItem class="menu-item" @click="shareOpen = true">Share</DropdownMenuItem>
          <DropdownMenuItem class="menu-item">
            <SaveMenu />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
    <button class="btn-action" title="Settings (coming in v2.4)" @click="onSettings">⚙</button>
    <ShareDialog v-model:open="shareOpen" />
    <ImportDialog v-model:open="importOpen" />
    <AddRecipeOverlay v-model:open="addRecipeOpen" />
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import ShareDialog from './ShareDialog.vue'
import ImportDialog from './ImportDialog.vue'
import SaveMenu from './SaveMenu.vue'
import AddRecipeOverlay from './AddRecipeOverlay.vue'
import { useConfigStore } from '../stores/config'
import { useRecipesStore } from '../stores/recipes'

const configStore = useConfigStore()
const recipesStore = useRecipesStore()

const shareOpen = ref(false)
const importOpen = ref(false)
const addRecipeOpen = ref(false)

const hasErrors = computed(() => {
  const e = configStore.errors
  return [e.variables, e.functions, e.classifiers, e.generators, e.contentRules].some((arr) => arr.length > 0)
})

const validityTitle = computed(() => hasErrors.value ? 'Config has validation errors' : 'Config is valid')

function addElement() {
  let customInst = recipesStore.instances.find((i) => i.recipeId === 'custom')
  if (!customInst) {
    recipesStore.addInstance('custom')
    customInst = recipesStore.instances.find((i) => i.recipeId === 'custom')
  }
  if (customInst) {
    recipesStore.addExtra(customInst.id, 'variables', {
      name: '',
      initialValue: '',
      perTurnUpdate: '',
      postInputUpdate: '',
      preResponseUpdate: '',
      postResponseUpdate: '',
    })
    configStore.markDirty()
  }
}

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

function onSettings() {
  // v2.4
}
</script>

<style scoped>
.btn-action {
  @apply px-3 py-1 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors;
}
.menu-item {
  @apply px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 cursor-pointer outline-none block w-full text-left;
}
</style>
