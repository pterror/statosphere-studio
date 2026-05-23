<template>
  <div class="browse-strip">
    <!-- Collapsed bar -->
    <button
      class="strip-bar"
      :class="{ open: isOpen }"
      @click="toggleOpen"
    >
      <span class="text-gray-300 text-sm">Browse recipes {{ isOpen ? '▾' : '▸' }}</span>
      <div class="filter-chips-inline" @click.stop>
        <button
          v-for="chip in chips"
          :key="chip.value"
          class="chip-sm"
          :class="{ active: activeFilter === chip.value }"
          @click="activeFilter = chip.value"
        >{{ chip.label }}</button>
      </div>
      <span class="ml-auto text-xs text-gray-600">{{ filteredCount }} of {{ totalCount }}</span>
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
import atoms from '../recipes/builtins/atoms/index'

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
const activeFilter = ref<'all' | 'atoms' | 'bundles' | 'custom'>('all')

watch(isOpen, (v) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STRIP_OPEN_KEY, String(v))
  }
})

const chips = [
  { label: 'All', value: 'all' as const },
  { label: 'Atoms', value: 'atoms' as const },
  { label: 'Bundles', value: 'bundles' as const },
  { label: 'Custom', value: 'custom' as const },
]

const recipesStore = useRecipesStore()
const atomIds = new Set(atoms.map((a) => a.id))

function getKind(id: string) {
  if (recipesStore.customLibrary.some((d) => d.id === id)) return 'custom'
  if (atomIds.has(id)) return 'atom'
  return 'bundle'
}

const allRecipes = computed(() =>
  listRecipes().filter((r) => r.id !== 'custom'),
)

const totalCount = computed(() => allRecipes.value.length)

const filteredCount = computed(() => {
  if (activeFilter.value === 'all') return totalCount.value
  const kind = activeFilter.value.replace(/s$/, '')
  return allRecipes.value.filter((r) => getKind(r.id) === kind).length
})

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

defineExpose({ open, focusSearch })
</script>

<style scoped>
.browse-strip {
  @apply shrink-0 border-b border-gray-800 bg-gray-950;
}

.strip-bar {
  @apply w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-900/60 transition-colors cursor-pointer;
}

.filter-chips-inline {
  @apply flex gap-1;
}

.chip-sm {
  @apply px-2 py-0.5 rounded-full text-[11px] text-gray-500 bg-gray-800 hover:bg-gray-700 hover:text-gray-300 transition-colors;
}

.chip-sm.active {
  @apply bg-indigo-800/60 text-indigo-300;
}

.strip-body {
  @apply border-t border-gray-800;
}
</style>
