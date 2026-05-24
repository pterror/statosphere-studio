<template>
  <div
    class="recipe-library"
    :class="display"
    @keydown="onKeydown"
  >
    <!-- Search + filter row -->
    <div class="search-row">
      <span class="text-gray-500 text-sm shrink-0">⌕</span>
      <input
        ref="searchInput"
        v-model="query"
        class="flex-1 bg-transparent text-sm outline-none"
        style="color: var(--text-primary)"
        placeholder="Search recipes…"
        @keydown.esc.prevent="emit('close')"
        @keydown.up.prevent="moveSelection(-1)"
        @keydown.down.prevent="moveSelection(1)"
        @keydown.enter.prevent="addSelected"
      />
      <span class="text-xs text-gray-600">{{ filtered.length }} of {{ allItems.length }}</span>
    </div>

    <!-- Filter chips -->
    <div class="filter-chips">
      <button
        v-for="chip in chips"
        :key="chip.value"
        class="chip"
        :class="{ active: activeFilter === chip.value }"
        @click="activeFilter = chip.value"
      >{{ chip.label }}</button>
    </div>

    <!-- Card grid -->
    <div ref="gridEl" class="card-grid">
      <div v-if="filtered.length === 0" class="col-span-full text-center text-sm text-gray-600 py-8">
        No recipes match "{{ query }}"
      </div>
      <button
        v-for="(item, i) in filtered"
        :key="item.def.id"
        :ref="(el) => setItemRef(el, i)"
        class="recipe-card"
        :class="{ highlighted: i === selectedIndex }"
        draggable="true"
        @mouseenter="selectedIndex = i"
        @click="addRecipe(item.def.id)"
        @dragstart="onDragStart($event, item)"
        @dragend="onDragEnd"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="font-semibold text-sm text-gray-100 flex-1 text-left truncate">{{ item.def.name }}</span>
          <span class="kind-chip" :class="item.kind">{{ item.kind }}</span>
        </div>
        <div class="text-xs text-gray-400 text-left line-clamp-2">{{ item.def.description }}</div>
        <div v-if="item.def.tags?.length" class="text-[10px] text-gray-600 text-left mt-1 truncate">
          {{ item.def.tags.join(' · ') }}
        </div>
      </button>
    </div>

    <!-- Keyboard hint (inline/modal only) -->
    <div v-if="display !== 'strip'" class="keyboard-hint">
      <span><kbd>↑↓</kbd> navigate</span>
      <span><kbd>↵</kbd> add</span>
      <span><kbd>/</kbd> search</span>
      <span><kbd>Esc</kbd> close</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { listRecipes } from '../recipes/registry'
import { useRecipesStore } from '../stores/recipes'
import atoms from '../recipes/builtins/atoms/index'
import { makeDragSource } from '../composables/use-dnd'

const props = defineProps<{
  display: 'inline' | 'strip' | 'modal'
}>()

const emit = defineEmits<{
  (e: 'add', recipeId: string): void
  (e: 'close'): void
}>()

const recipesStore = useRecipesStore()

const atomIds = new Set(atoms.map((a) => a.id))

const query = ref('')
const activeFilter = ref<'all' | 'atoms' | 'bundles' | 'custom'>('all')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)
const gridEl = ref<HTMLElement | null>(null)
const itemRefs = ref<(Element | null)[]>([])

const chips = [
  { label: 'All', value: 'all' as const },
  { label: 'Atoms', value: 'atoms' as const },
  { label: 'Bundles', value: 'bundles' as const },
  { label: 'Custom', value: 'custom' as const },
]

type Kind = 'atom' | 'bundle' | 'custom'

function getKind(id: string): Kind {
  if (recipesStore.customLibrary.some((d) => d.id === id)) return 'custom'
  if (atomIds.has(id)) return 'atom'
  return 'bundle'
}

function fuzzyScore(target: string, pattern: string): number {
  if (!pattern) return 1
  const t = target.toLowerCase()
  const p = pattern.toLowerCase()
  let ti = 0
  let pi = 0
  let score = 0
  let consecutive = 0
  while (ti < t.length && pi < p.length) {
    if (t[ti] === p[pi]) {
      score += 1 + consecutive * 2
      if (ti === 0 && pi === 0) score += 5
      consecutive++
      pi++
    } else {
      consecutive = 0
    }
    ti++
  }
  return pi === p.length ? score : 0
}

interface ListItem {
  def: ReturnType<typeof listRecipes>[number]
  kind: Kind
  score: number
}

const allItems = computed<ListItem[]>(() => {
  return listRecipes()
    .filter((r) => r.id !== 'custom')
    .map((def) => ({ def, kind: getKind(def.id), score: 0 }))
})

const filtered = computed<ListItem[]>(() => {
  const q = query.value.trim()
  let items = allItems.value

  if (activeFilter.value !== 'all') {
    items = items.filter((i) => i.kind === activeFilter.value.replace(/s$/, '') as Kind)
  }

  if (!q) return items.map((i) => ({ ...i, score: 1 }))

  return items
    .map((item) => {
      const nameScore = fuzzyScore(item.def.name, q) * 2
      const descScore = fuzzyScore(item.def.description, q)
      const tagScore = (item.def.tags ?? []).reduce((acc, t) => acc + fuzzyScore(t, q) * 0.5, 0)
      return { ...item, score: nameScore + descScore + tagScore }
    })
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
})

watch(filtered, () => { selectedIndex.value = 0 })

function setItemRef(el: Element | null | unknown, i: number) {
  itemRefs.value[i] = el instanceof Element ? el : null
}

function moveSelection(dir: number) {
  const len = filtered.value.length
  if (!len) return
  selectedIndex.value = (selectedIndex.value + dir + len) % len
  nextTick(() => {
    itemRefs.value[selectedIndex.value]?.scrollIntoView?.({ block: 'nearest' })
  })
}

function addRecipe(id: string) {
  emit('add', id)
}

function addSelected() {
  const item = filtered.value[selectedIndex.value]
  if (item) addRecipe(item.def.id)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === '/') {
    const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
    if (tag !== 'input' && tag !== 'textarea') {
      e.preventDefault()
      searchInput.value?.focus()
    }
  }
  if (e.key === 'Escape') { emit('close'); e.preventDefault() }
  if (e.key === 'ArrowUp') { moveSelection(-1); e.preventDefault() }
  if (e.key === 'ArrowDown') { moveSelection(1); e.preventDefault() }
  if (e.key === 'Enter') { addSelected(); e.preventDefault() }
}

function getDragSource(item: ListItem) {
  const kind = item.kind === 'atom' ? 'atom-card' : 'recipe-card'
  return makeDragSource({ kind, recipeId: item.def.id } as any, { ghostText: item.def.name })
}

function onDragStart(e: DragEvent, item: ListItem) {
  const src = getDragSource(item)
  src.onDragStart(e)
}

function onDragEnd(e: DragEvent) {
  // currentDrag cleared by makeDragSource onDragEnd; nothing extra needed
  const src = makeDragSource({ kind: 'recipe-card', recipeId: '' })
  src.onDragEnd(e)
}

function focusSearch() {
  nextTick(() => searchInput.value?.focus())
}

defineExpose({ focusSearch })

onMounted(() => {
  if (props.display === 'inline' || props.display === 'modal') {
    focusSearch()
  }
})
</script>

<style scoped>
.recipe-library {
  @apply flex flex-col gap-2;
}

.recipe-library.inline {
  @apply p-6;
}

.recipe-library.strip {
  @apply px-4 py-3;
}

.recipe-library.modal {
  @apply p-0;
}

.search-row {
  @apply flex items-center gap-2 px-4 py-3;
  border-bottom: 1px solid var(--glass-border);
}

.recipe-library.inline .search-row {
  @apply rounded-lg;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
}

.filter-chips {
  @apply flex gap-2 px-4 py-2;
}

.recipe-library.inline .filter-chips {
  @apply px-0;
}

.chip {
  @apply px-3 py-1 rounded-full text-xs transition-colors;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
}

.chip:hover {
  background: var(--glass-bg-hover);
  color: var(--text-secondary);
}

.chip.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.card-grid {
  @apply grid gap-3 px-4 overflow-y-auto;
  grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr));
}

.recipe-library.inline .card-grid {
  @apply px-0;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  max-height: calc(50vh - 120px);
  min-height: 0;
}

.recipe-library.strip .card-grid {
  max-height: 50vh;
  grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 1fr));
}

.recipe-library.modal .card-grid {
  max-height: 55vh;
  grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr));
}

.recipe-card {
  @apply flex flex-col p-3 rounded-lg transition-colors cursor-grab text-left;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}

.recipe-card:hover {
  background: var(--glass-bg-hover);
  border-color: var(--accent);
}

.recipe-card.highlighted {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.recipe-card:active {
  @apply cursor-grabbing;
}

.kind-chip {
  @apply shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium;
}

.kind-chip.atom {
  @apply bg-emerald-900/60 text-emerald-300 border border-emerald-700/50;
}

.kind-chip.bundle {
  @apply bg-blue-900/60 text-blue-300 border border-blue-700/50;
}

.kind-chip.custom {
  @apply bg-indigo-900/60 text-indigo-300 border border-indigo-700/50;
}

.keyboard-hint {
  @apply flex gap-4 px-4 py-2 text-xs;
  border-top: 1px solid var(--glass-border);
  color: var(--text-muted);
}

kbd {
  @apply px-1 rounded;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
}
</style>
