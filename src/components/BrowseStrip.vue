<template>
  <div class="browse-strip" v-bind="stripFileDropTarget">
    <!-- Collapsed bar -->
    <button
      class="strip-bar"
      :class="{ open: isOpen }"
      @click="toggleOpen"
    >
      <span class="text-gray-300 text-sm">Browse recipes {{ isOpen ? '▾' : '▸' }}</span>
      <span class="ml-auto text-xs text-gray-600">{{ totalCount }} recipes</span>
    </button>

    <!-- Expanded library -->
    <div v-if="isOpen" class="strip-body">
      <RecipeLibrary
        ref="libraryRef"
        display="strip"
        @add="onAdd"
        @close="isOpen = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import RecipeLibrary from './RecipeLibrary.vue'
import { listRecipes } from '../recipes/registry'
import { useRecipesStore } from '../stores/recipes'
import { makeDropTarget } from '../composables/use-dnd'

const emit = defineEmits<{
  (e: 'add', recipeId: string): void
}>()

const STRIP_OPEN_KEY = 'statosphere-studio-browse-strip-open'

function loadOpen(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STRIP_OPEN_KEY) === 'true'
}

const isOpen = ref(loadOpen())
const libraryRef = ref<InstanceType<typeof RecipeLibrary> | null>(null)

watch(isOpen, (v) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STRIP_OPEN_KEY, String(v))
  }
})

const recipesStore = useRecipesStore()

const totalCount = computed(() =>
  listRecipes().filter((r) => r.id !== 'custom').length,
)

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function open() {
  isOpen.value = true
}

function focusSearch() {
  libraryRef.value?.focusSearch()
}

function onAdd(recipeId: string) {
  emit('add', recipeId)
  isOpen.value = false
}

const stripFileDropTarget = makeDropTarget({
  accept: ['file'],
  onDrop: (p) => {
    if (p.kind !== 'file') return
    handleStripFileDrop(p.file)
  },
  onOver: () => { if (!isOpen.value) isOpen.value = true },
  onLeave: () => {},
})

async function handleStripFileDrop(file: File) {
  let text: string
  try { text = await file.text() } catch { return }
  let parsed: any
  try { parsed = JSON.parse(text) } catch { return }
  if (parsed && typeof parsed === 'object' && parsed.source?.kind) {
    try {
      recipesStore.addCustomRecipe(parsed)
    } catch { /* ignore */ }
  }
}

defineExpose({ open, focusSearch })
</script>

<style scoped>
.browse-strip {
  @apply shrink-0;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-border);
}

.strip-bar {
  @apply w-full flex items-center gap-3 px-4 py-2 transition-colors cursor-pointer;
  color: var(--text-secondary);
}

.strip-bar:hover {
  background: var(--glass-bg-hover);
}

.strip-body {
  border-top: 1px solid var(--glass-border);
}
</style>
