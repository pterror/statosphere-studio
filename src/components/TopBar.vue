<template>
  <header class="glass-bar flex items-center gap-2 px-4 py-2 shrink-0">
    <span class="font-semibold text-indigo-400 mr-auto">Statosphere Studio</span>
    <button class="btn-action" @click="emit('toggle-browse')">Browse ▾</button>
    <button
      class="btn-action"
      :class="!undoStore.canUndo ? 'opacity-40 cursor-not-allowed' : ''"
      :disabled="!undoStore.canUndo"
      title="Undo (⌘Z)"
      @click="undoStore.undo()"
    >↶</button>
    <button
      class="btn-action"
      :class="!undoStore.canRedo ? 'opacity-40 cursor-not-allowed' : ''"
      :disabled="!undoStore.canRedo"
      title="Redo (⌘⇧Z)"
      @click="undoStore.redo()"
    >↷</button>
    <ElementTypePicker label="+ Element ▾" @select="addElement" />
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
        <DropdownMenuContent class="glass-panel z-50 py-1 min-w-[180px]" style="border-radius: 10px" :side-offset="4">
          <DropdownMenuItem class="menu-item" @click="importOpen = true">Import</DropdownMenuItem>
          <DropdownMenuItem class="menu-item" @click="copyJson">Copy JSON</DropdownMenuItem>
          <DropdownMenuItem class="menu-item" @click="downloadJson">Download .json</DropdownMenuItem>
          <DropdownMenuItem class="menu-item" @click="shareOpen = true">Share</DropdownMenuItem>
          <DropdownMenuItem class="menu-item" @click="graphOpen = true">Graph</DropdownMenuItem>
          <DropdownMenuItem class="menu-item">
            <SaveMenu />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
    <button class="btn-action" title="Settings" @click="settingsOpen = true">⚙</button>
    <ShareDialog v-model:open="shareOpen" />
    <ImportDialog v-model:open="importOpen" />
    <SettingsModal v-model:open="settingsOpen" />
    <GraphModal v-model:open="graphOpen" />
  </header>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
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
import SettingsModal from './SettingsModal.vue'
import GraphModal from './GraphModal.vue'
import ElementTypePicker from './ElementTypePicker.vue'
import { useConfigStore } from '../stores/config'
import { useRecipesStore } from '../stores/recipes'
import { useUndoStore } from '../stores/undo'
import type { ElementType } from '../recipes/types'
import { emptyElement } from '../recipes/empty-element'

const emit = defineEmits<{
  (e: 'toggle-browse'): void
  (e: 'open-library-modal'): void
}>()

const configStore = useConfigStore()
const recipesStore = useRecipesStore()
const undoStore = useUndoStore()

const shareOpen = ref(false)
const importOpen = ref(false)
const settingsOpen = ref(false)
const graphOpen = ref(false)

const hasErrors = computed(() => {
  const e = configStore.errors
  return [e.variables, e.functions, e.classifiers, e.generators, e.contentRules].some((arr) => arr.length > 0)
})

const validityTitle = computed(() => hasErrors.value ? 'Config has validation errors' : 'Config is valid')

async function addElement(et: ElementType) {
  let targetId = recipesStore.focusedInstanceId
  if (!targetId) {
    // Find or create a custom block at bottom
    let customInst = recipesStore.instances.slice().reverse().find((i) => i.recipeId === 'custom')
    if (!customInst) {
      recipesStore.addInstance('custom')
      customInst = recipesStore.instances.slice().reverse().find((i) => i.recipeId === 'custom')
    }
    if (customInst) {
      targetId = customInst.id
      recipesStore.focusedInstanceId = customInst.id
    }
  }
  if (!targetId) return
  const targetInst = recipesStore.instances.find((i) => i.id === targetId)
  if (!targetInst) return
  recipesStore.addExtra(targetId, '', et, emptyElement(et, targetInst))
  configStore.markDirty()
  await nextTick()
  const blocks = document.querySelectorAll('[data-recipe-block]')
  blocks[blocks.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  // Focus first field in the new drawer after it expands
  await nextTick()
  const lastBlock = blocks[blocks.length - 1] as HTMLElement | undefined
  const firstField = lastBlock?.querySelector<HTMLElement>('input, textarea, select')
  firstField?.focus()
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

function onGlobalKeydown(e: KeyboardEvent) {
  const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
  const isInput = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable
  const anyOpen = settingsOpen.value || graphOpen.value || shareOpen.value || importOpen.value

  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    if (!isInput) {
      e.preventDefault()
      emit('open-library-modal')
    }
  }
  if (e.key === 'g' && !isInput && !anyOpen) {
    e.preventDefault()
    graphOpen.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))
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
.menu-item {
  @apply px-4 py-2 text-sm cursor-pointer outline-none block w-full text-left;
  color: var(--text-secondary);
}
.menu-item:hover {
  background: var(--glass-bg-hover);
  color: var(--text-primary);
}
</style>
